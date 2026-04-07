import { supabase, supabaseAdmin } from '../config/supabase.js';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { getRequestSupabaseClient } from '../utils/requestContext.js';
import { ApiError } from '../utils/apiError.js';
import { logger } from '../utils/logger.js';
import authService from './auth.service.js';
import { UserRepository } from '../repositories/UserRepository.js';

const TABLE = 'usuario';
// Usamos cliente admin para operaciones de perfil en backend y evitar fallos por RLS.
const getDb = () => supabaseAdmin;
const ROLE_DOMAIN_TABLES = {
  super_admin: 'super_admin',
  admin: null,
  lider_organizacion: 'lider_organizacion',
  lider_comite: 'lider_comite',
  miembro: 'miembro',
};

const TECHNICAL_ROLES = new Set(['authenticated', 'anon', 'service_role']);

const pickBusinessRole = (candidates = []) => {
  const normalized = candidates
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  return normalized.find((candidate) => !TECHNICAL_ROLES.has(candidate)) || null;
};

const resolveRoleFromDomainTables = async (userId) => {
  const checks = [
    { table: 'super_admin', role: 'super_admin' },
    { table: 'lider_organizacion', role: 'lider_organizacion' },
    { table: 'lider_comite', role: 'lider_comite' },
    { table: 'miembro', role: 'miembro' },
  ];

  for (const check of checks) {
    const { data, error } = await supabaseAdmin
      .from(check.table)
      .select('id')
      .eq('id', userId)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return check.role;
    }
  }

  return null;
};

const resolveUserRole = async (userId, row) => {
  const rowRole = pickBusinessRole([row?.role, row?.rol]);
  if (rowRole) return rowRole;

  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (!error && data?.user) {
      const metadataRole = pickBusinessRole([
        data.user.user_metadata?.role,
        data.user.app_metadata?.role,
        data.user.raw_user_meta_data?.role,
        data.user.raw_app_meta_data?.role,
      ]);

      if (metadataRole) {
        return metadataRole;
      }
    }
  } catch (error) {
    logger.warn('No se pudo resolver rol desde Supabase Auth admin API', {
      userId,
      error: error.message,
    });
  }

  const domainRole = await resolveRoleFromDomainTables(userId);
  return domainRole || 'miembro';
};

const syncDomainRole = async (userId, role) => {
  const checks = [
    'super_admin',
    'lider_organizacion',
    'lider_comite',
    'miembro',
  ];

  for (const table of checks) {
    await supabaseAdmin.from(table).delete().eq('id', userId);
  }

  const table = ROLE_DOMAIN_TABLES[String(role || '').toLowerCase()];
  if (!table) return;

  const { error } = await supabaseAdmin.from(table).insert({ id: userId });
  if (error) {
    logger.warn('No se pudo sincronizar tabla de dominio de rol (continuando con role en usuario/auth)', {
      userId,
      role,
      error,
    });
  }
};

const normalizeUser = (row, resolvedRole = null) => {
  if (!row) return null;

  const normalizedProfile = row.profile || {
    nombre: row.nombre ?? null,
    apellido: row.apellido ?? null,
    telefono: row.telefono ?? null,
    direccion: row.direccion ?? null,
    biografia: row.biografia ?? null,
    fechaNacimiento: row.fechaNacimiento ?? row.fechanacimiento ?? null,
    avatar: row.avatar ?? null,
    avatarPublicId: row.avatarPublicId ?? row.avatar_public_id ?? null,
  };

  return {
    ...row,
    id: row.id,
    email: row.email,
    role: resolvedRole || row.role || 'miembro',
    profile: normalizedProfile,
    organizationId: row.organizationId ?? row.organization_id ?? null,
    isActive: row.isActive ?? row.estadoActivo ?? true,
    createdAt: row.createdAt ?? row.created_at ?? null,
    updatedAt: row.updatedAt ?? row.updated_at ?? null,
  };
};

const pickExistingKey = (rowKeys, candidates = []) => {
  return candidates.find((key) => rowKeys.has(key)) || null;
};

const syncMemberProfileFields = async ({ userId, email, telefono, nombre }) => {
  const payload = {};

  if (telefono !== undefined) {
    payload.telefono = telefono;
  }

  if (nombre !== undefined) {
    payload.nombre = nombre;
  }

  if (Object.keys(payload).length === 0) return;

  // Intento 1: miembro.id = usuario.id
  const { data: byIdData, error: byIdError } = await getDb()
    .from('miembro')
    .update(payload)
    .eq('id', userId)
    .select('id');

  if (!byIdError && Array.isArray(byIdData) && byIdData.length > 0) {
    return;
  }

  // Intento 2: miembro.email = usuario.email
  if (email) {
    const { data: byEmailData, error: byEmailError } = await getDb()
      .from('miembro')
      .update(payload)
      .eq('email', email)
      .select('id');

    if (!byEmailError && Array.isArray(byEmailData) && byEmailData.length > 0) {
      return;
    }
  }

  logger.warn('No se encontró registro en miembro para sincronizar datos de perfil', {
    userId,
    email,
    payload,
  });
};

const getAuthFallbackProfile = async (userId) => {
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);

  if (authError || !authData?.user) {
    logger.error('Error obteniendo usuario desde Auth (fallback de perfil)', {
      userId,
      error: authError,
    });
    throw ApiError.internal('Error al obtener el perfil del usuario');
  }

  const authUser = authData.user;
  const metadata = authUser.user_metadata || {};
  const resolvedRole = pickBusinessRole([
    metadata.role,
    authUser.app_metadata?.role,
    authUser.raw_user_meta_data?.role,
    authUser.raw_app_meta_data?.role,
  ]) || 'miembro';

  return {
    id: authUser.id,
    email: authUser.email,
    role: resolvedRole,
    profile: metadata.profile || {},
    organizationId: metadata.organizationId || metadata.organization_id || null,
    isActive: true,
    createdAt: authUser.created_at || null,
    updatedAt: authUser.updated_at || null,
  };
};

const getProfileByUserId = async (userId) => {
  const { data, error } = await getDb()
    .from(TABLE)
    .select('*')
    .eq('id', userId)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    logger.warn('No se pudo obtener perfil desde tabla usuario, usando fallback de Auth', {
      userId,
      error,
      hasData: !!data,
    });
    return getAuthFallbackProfile(userId);
  }

  const resolvedRole = await resolveUserRole(userId, data);

  return normalizeUser(data, resolvedRole);
};

const updateProfile = async (userId, updateData) => {
  const current = await getProfileByUserId(userId);
  const { data: currentRow } = await getDb()
    .from(TABLE)
    .select('*')
    .eq('id', userId)
    .limit(1)
    .maybeSingle();

  const rowKeys = new Set(Object.keys(currentRow || {}));
  const mergedProfile = {
    ...(current.profile || {}),
    ...updateData,
  };

  const updatePayload = {};

  const fieldCandidates = {
    nombre: ['nombre'],
    apellido: ['apellido'],
    telefono: ['telefono'],
    direccion: ['direccion'],
    biografia: ['biografia'],
    fechaNacimiento: ['fechaNacimiento', 'fechanacimiento', 'fecha_nacimiento'],
  };

  for (const [field, candidates] of Object.entries(fieldCandidates)) {
    if (updateData[field] === undefined) continue;

    const targetColumn = pickExistingKey(rowKeys, candidates);
    if (targetColumn) {
      updatePayload[targetColumn] = updateData[field];
    }
  }

  const profileColumn = pickExistingKey(rowKeys, ['profile']);
  if (profileColumn) {
    const currentProfile = currentRow?.profile && typeof currentRow.profile === 'object'
      ? currentRow.profile
      : current.profile || {};
    updatePayload[profileColumn] = {
      ...currentProfile,
      ...updateData,
    };
  }

  const modifiedByColumn = pickExistingKey(rowKeys, ['modificadoPor', 'modificado_por']);
  if (modifiedByColumn) {
    updatePayload[modifiedByColumn] = userId;
  }

  if (Object.keys(updatePayload).length === 0) {
    return {
      ...current,
      profile: mergedProfile,
      updatedAt: new Date().toISOString(),
    };
  }

  const { data, error } = await getDb()
    .from(TABLE)
    .update(updatePayload)
    .eq('id', userId)
    .select('*')
    .single();

  if (error) {
    logger.warn('Error actualizando perfil en tabla usuario, usando fallback en Auth metadata', {
      userId,
      error,
    });

    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        role: current.role,
        organization_id: current.organizationId,
        profile: mergedProfile,
      },
    });

    if (authUpdateError) {
      logger.error('Error actualizando perfil en fallback de Auth', {
        userId,
        error: authUpdateError,
      });
      throw ApiError.internal('Error al actualizar el perfil del usuario');
    }

    await syncMemberProfileFields({
      userId,
      email: current.email,
      telefono: updateData.telefono,
      nombre: updateData.nombre,
    });

    return {
      ...current,
      profile: mergedProfile,
      updatedAt: new Date().toISOString(),
    };
  }

  await syncMemberProfileFields({
    userId,
    email: current.email,
    telefono: updateData.telefono,
    nombre: updateData.nombre,
  });

  return normalizeUser(data);
};

const updateAvatar = async (userId, avatarData) => {
  const current = await getProfileByUserId(userId);
  const mergedProfile = {
    ...(current.profile || {}),
    avatar: avatarData.avatarUrl || null,
    avatarPublicId: avatarData.avatarPublicId || null,
  };

  const { data, error } = await getDb()
    .from(TABLE)
    .update({
      profile: mergedProfile,
      modificadoPor: userId,
    })
    .eq('id', userId)
    .select('*')
    .single();

  if (error) {
    logger.error('Error actualizando avatar', { userId, error });
    throw ApiError.internal('Error al actualizar avatar');
  }

  return normalizeUser(data);
};

const changePassword = async (userId, email, currentPassword, newPassword) => {
  const userEmail = String(email || '').trim().toLowerCase();
  if (!userEmail) {
    throw ApiError.badRequest('No se pudo validar el usuario para cambiar contraseña');
  }

  const authClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'X-Client-Info': 'osflsystem-backend-password-change',
      },
    },
  });

  const { error: signInError } = await authClient.auth.signInWithPassword({
    email: userEmail,
    password: currentPassword,
  });

  if (signInError) {
    throw ApiError.unauthorized('La contraseña actual es incorrecta');
  }

  const { error } = await authClient.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    logger.error('Error actualizando contraseña', { userId, error });

    const normalizedMessage = String(error.message || '').toLowerCase();
    if (
      normalizedMessage.includes('password')
      || normalizedMessage.includes('contraseña')
      || normalizedMessage.includes('weak')
      || normalizedMessage.includes('invalid')
    ) {
      throw ApiError.badRequest('La nueva contraseña no cumple con los requisitos de seguridad');
    }

    if (
      normalizedMessage.includes('session')
      || normalizedMessage.includes('jwt')
      || normalizedMessage.includes('auth')
      || normalizedMessage.includes('token')
    ) {
      throw ApiError.unauthorized('Tu sesión no es válida para cambiar la contraseña');
    }

    throw ApiError.internal('Error al actualizar la contraseña');
  }

  // Sincroniza la columna password de usuario con hash (si existe por compatibilidad).
  try {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await getDb()
      .from(TABLE)
      .update({
        password: passwordHash,
      })
      .eq('id', userId);
  } catch (syncError) {
    logger.warn('No se pudo sincronizar columna password en usuario (continuando)', {
      userId,
      error: syncError?.message,
    });
  }

  return true;
};

const getUserStats = async (userId) => {
  try {
    const baseStats = {
      horasTotales: 0,
      horasValidadas: 0,
      horasPendientes: 0,
      proyectosParticipados: 0,
      proyectosActivos: 0,
      sugerenciasEnviadas: 0,
      anunciosLeidos: 0,
    };

    const { data: horasData } = await getDb()
      .from('hora')
      .select('cantidadhoras, estado, proyectoid')
      .eq('miembroid', userId);

    if (!Array.isArray(horasData)) {
      return baseStats;
    }

    const horasTotales = horasData.reduce((sum, row) => sum + Number(row.cantidadhoras || 0), 0);
    const horasValidadas = horasData
      .filter((row) => (row.estado || '').toLowerCase() === 'validada')
      .reduce((sum, row) => sum + Number(row.cantidadhoras || 0), 0);
    const horasPendientes = horasData
      .filter((row) => (row.estado || '').toLowerCase() === 'pendiente')
      .reduce((sum, row) => sum + Number(row.cantidadhoras || 0), 0);

    const projectIds = new Set(horasData.map((row) => row.proyectoid).filter(Boolean));

    return {
      ...baseStats,
      horasTotales,
      horasValidadas,
      horasPendientes,
      proyectosParticipados: projectIds.size,
    };
  } catch (error) {
    logger.warn('No se pudieron calcular stats de usuario, devolviendo valores por defecto', {
      userId,
      error: error.message,
    });

    return {
      horasTotales: 0,
      horasValidadas: 0,
      horasPendientes: 0,
      proyectosParticipados: 0,
      proyectosActivos: 0,
      sugerenciasEnviadas: 0,
      anunciosLeidos: 0,
    };
  }
};

const deactivateAccount = async (userId) => {
  const { error } = await getDb()
    .from(TABLE)
    .update({
      isActive: false,
      modificadoPor: userId,
    })
    .eq('id', userId);

  if (error) {
    logger.error('Error desactivando cuenta', { userId, error });
    throw ApiError.internal('Error al desactivar la cuenta');
  }

  return true;
};

const createUser = async (userData, actorUserId) => {
  const { email, password, role, profile = {}, organizationId = null } = userData;

  const createdUser = await authService.register({
    email,
    password,
    role,
    profile,
    organizationId,
  });

  if (actorUserId) {
    await UserRepository.updateById(createdUser.id, {
      modificadoPor: actorUserId,
    });
  }

  return createdUser;
};

const updateUser = async (userId, userData, actorUserId) => {
  const current = await getProfileByUserId(userId);
  const nextRole = String(userData.role || current.role || 'miembro').toLowerCase();
  const nextProfile = {
    ...(current.profile || {}),
    ...(userData.profile || {}),
  };
  const nextEmail = userData.email ? String(userData.email).toLowerCase() : current.email;
  const nextOrganizationId = userData.organizationId ?? current.organizationId ?? null;
  const nextActive = typeof userData.isActive === 'boolean' ? userData.isActive : current.isActive;

  const authUpdates = {
    email: nextEmail,
    user_metadata: {
      role: nextRole,
      organization_id: nextOrganizationId,
      profile: nextProfile,
    },
  };

  if (userData.password) {
    authUpdates.password = userData.password;
  }

  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, authUpdates);
  if (authError) {
    logger.error('Error actualizando usuario en Auth', { userId, error: authError });
    throw ApiError.internal('Error al actualizar el usuario');
  }

  await syncDomainRole(userId, nextRole);

  const { data, error } = await UserRepository.updateById(userId, {
    email: nextEmail,
    role: nextRole,
    profile: nextProfile,
    organizationId: nextOrganizationId,
    isActive: nextActive,
    modificadoPor: actorUserId || userId,
  });

  if (error) {
    logger.error('Error actualizando usuario público', { userId, error });
    throw ApiError.internal('Error al actualizar el usuario');
  }

  return normalizeUser(data, nextRole);
};

const deleteUser = async (userId) => {
  const current = await getProfileByUserId(userId);

  await Promise.all([
    supabaseAdmin.from('super_admin').delete().eq('id', userId),
    supabaseAdmin.from('lider_organizacion').delete().eq('id', userId),
    supabaseAdmin.from('lider_comite').delete().eq('id', userId),
    supabaseAdmin.from('miembro').delete().eq('id', userId),
  ]);

  const { error: publicError } = await UserRepository.deleteById(userId);
  if (publicError) {
    logger.error('Error eliminando usuario público', { userId, error: publicError });
    throw ApiError.internal('Error al eliminar el usuario');
  }

  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (authError) {
    logger.error('Error eliminando usuario auth', { userId, error: authError });
    throw ApiError.internal('Error al eliminar el usuario');
  }

  return current;
};

const listUsers = async ({ page = 1, limit = 15, search = '' } = {}) => {
  const safePage = Number.isFinite(Number(page)) ? Math.max(1, Number(page)) : 1;
  const safeLimit = Number.isFinite(Number(limit)) ? Math.min(100, Math.max(1, Number(limit))) : 15;
  const { data, error } = await getDb()
    .from(TABLE)
    .select('*');

  if (error) {
    logger.error('Error obteniendo usuarios para administración', { error });
    throw ApiError.internal('Error al obtener usuarios');
  }

  const rows = Array.isArray(data) ? data : [];
  const trimmedSearch = String(search || '').trim().toLowerCase();

  const searchedRows = trimmedSearch
    ? rows.filter((row) => {
        const email = String(row?.email || '').toLowerCase();
        const role = String(row?.role || row?.rol || '').toLowerCase();
        const nombre = String(row?.profile?.nombre || row?.nombre || '').toLowerCase();
        return email.includes(trimmedSearch) || role.includes(trimmedSearch) || nombre.includes(trimmedSearch);
      })
    : rows;

  const total = searchedRows.length;
  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit;
  const pagedRows = searchedRows.slice(from, to);

  const users = await Promise.all(
    pagedRows.map(async (row) => {
      const resolvedRole = await resolveUserRole(row.id, row);
      return normalizeUser(row, resolvedRole);
    })
  );

  return {
    users,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    },
  };
};

export const profileService = {
  getProfileByUserId,
  updateProfile,
  updateAvatar,
  changePassword,
  getUserStats,
  deactivateAccount,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
};

export default profileService;