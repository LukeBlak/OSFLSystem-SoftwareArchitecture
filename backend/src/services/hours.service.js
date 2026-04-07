/**
 * =============================================================================
 * SERVICIO DE HORAS/ASISTENCIA - CAPA DE APLICACIÓN
 * =============================================================================
 * 
 * Propósito (ADR-001):
 * - Implementar la lógica de negocio de los casos de uso de horas/asistencia
 * - Coordinar entre controllers y repositories
 * - Validar reglas de negocio específicas de registro de asistencia
 * - Integrar con Supabase para persistencia de datos
 * 
 * Arquitectura:
 * - Capa: Aplicación (Services)
 * - Patrón: Service Layer + Repository Pattern
 * - Integración: Supabase PostgreSQL
 * 
 * Casos de Uso que implementa:
 * - CU-16: Registrar asistencia
 * - CU-18: Consultar historial de horas
 * - Gestionar validación de horas
 * 
 * @module services/hours.service
 * @layer Application
 */

import { ApiError } from '../utils/apiError.js';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../utils/logger.js';
import HoursRepository from '../repositories/HoursRepository.js';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { USER_ROLES } from '../models/User.js';
import { HOURS_STATUS } from '../models/Hours.js';

const resolveOrganizationIdForUser = async (currentUser) => {
  const directOrganizationId = (
    currentUser?.organizationId
    || currentUser?.organizacionId
    || currentUser?.organization_id
    || currentUser?.organizacion_id
    || null
  );

  if (directOrganizationId) {
    return directOrganizationId;
  }

  const userId = currentUser?.id;
  const email = currentUser?.email;

  if (userId) {
    const { data: liderById, error: liderByIdError } = await supabaseAdmin
      .from('lider_organizacion')
      .select('organizacionid')
      .eq('id', userId)
      .limit(1)
      .maybeSingle();

    if (!liderByIdError && liderById?.organizacionid) {
      return liderById.organizacionid;
    }

    const { data: committeeAsLeader, error: committeeAsLeaderError } = await supabaseAdmin
      .from('comite')
      .select('organizacionid')
      .eq('lidercomiteid', userId)
      .limit(1)
      .maybeSingle();

    if (!committeeAsLeaderError && committeeAsLeader?.organizacionid) {
      return committeeAsLeader.organizacionid;
    }

    const { data: memberCommittee, error: memberCommitteeError } = await supabaseAdmin
      .from('miembro_comite')
      .select('comiteid')
      .eq('miembroid', userId)
      .limit(1)
      .maybeSingle();

    if (!memberCommitteeError && memberCommittee?.comiteid) {
      const { data: committeeByMembership, error: committeeByMembershipError } = await supabaseAdmin
        .from('comite')
        .select('organizacionid')
        .eq('id', memberCommittee.comiteid)
        .limit(1)
        .maybeSingle();

      if (!committeeByMembershipError && committeeByMembership?.organizacionid) {
        return committeeByMembership.organizacionid;
      }
    }
  }

  if (email) {
    const { data: usuarioByEmail, error: usuarioByEmailError } = await supabaseAdmin
      .from('usuario')
      .select('id')
      .eq('email', email)
      .limit(1)
      .maybeSingle();

    if (!usuarioByEmailError && usuarioByEmail?.id) {
      const { data: liderByUsuarioId, error: liderByUsuarioError } = await supabaseAdmin
        .from('lider_organizacion')
        .select('organizacionid')
        .eq('id', usuarioByEmail.id)
        .limit(1)
        .maybeSingle();

      if (!liderByUsuarioError && liderByUsuarioId?.organizacionid) {
        return liderByUsuarioId.organizacionid;
      }
    }
  }

  return null;
};

// =============================================================================
// REGISTRAR ASISTENCIA (CU-16)
// =============================================================================

/**
 * Registrar asistencia/horas de un miembro en un proyecto
 * 
 * Caso de Uso: Registrar las horas trabajadas por un miembro en un proyecto
 * 
 * @param {Object} hoursData - Datos de asistencia a registrar
 * @param {string} hoursData.miembroId - ID del miembro
 * @param {string} hoursData.proyectoId - ID del proyecto
 * @param {string} hoursData.fecha - Fecha de la asistencia (YYYY-MM-DD)
 * @param {number} hoursData.cantidadHoras - Cantidad de horas trabajadas
 * @param {string} [hoursData.descripcion] - Descripción de actividades
 * @param {string} [hoursData.estado] - Estado inicial (default: pendiente)
 * @param {Object} currentUser - Usuario que registra la asistencia
 * 
 * @returns {Promise<Object>} Registro de horas creado
 * @throws {ApiError} 400 - Si los datos son inválidos
 * @throws {ApiError} 403 - Si el usuario no tiene permisos
 * @throws {ApiError} 404 - Si el miembro, proyecto o comité no existe
 * @throws {ApiError} 500 - Si hay error al guardar en la BD
 */
export const registerHours = async (supabase, hoursData, currentUser) => {
  try {
    const {
      miembroId,
      proyectoId,
      fecha,
      cantidadHoras,
      descripcion = ''
    } = hoursData

    if (!currentUser || !currentUser.id) {
      throw ApiError.unauthorized('Usuario no autenticado')
    }

    const db = supabaseAdmin || supabase;
    const currentUserOrganizationId = await resolveOrganizationIdForUser(currentUser);

    const horas = Number(cantidadHoras)
    if (isNaN(horas) || horas <= 0) {
      throw ApiError.badRequest('cantidadHoras debe ser un número mayor a 0')
    }

    const { data: miembro, error: miembroError } = await db
      .from('miembro')
      .select('id, nombre, email, estadoactivo')
      .eq('id', miembroId)
      .single()

    if (miembroError || !miembro) {
      throw ApiError.notFound('Miembro no encontrado')
    }

    const { data: proyecto, error: proyectoError } = await db
      .from('proyecto')
      .select('id, nombre, estado, fechainicio, fechafin, comiteid, organizacionid')
      .eq('id', proyectoId)
      .single()

    if (proyectoError || !proyecto) {
      throw ApiError.notFound('Proyecto no encontrado')
    }

    if (currentUserOrganizationId) {
      if (proyecto.organizacionid && proyecto.organizacionid !== currentUserOrganizationId) {
        throw ApiError.forbidden('El proyecto no pertenece a tu organización')
      }

      if (proyecto.comiteid) {
        const { data: committee, error: committeeError } = await db
          .from('comite')
          .select('id, organizacionid')
          .eq('id', proyecto.comiteid)
          .maybeSingle()

        if (committeeError || !committee) {
          throw ApiError.notFound('Comité no encontrado para el proyecto')
        }

        if (committee.organizacionid && committee.organizacionid !== currentUserOrganizationId) {
          throw ApiError.forbidden('El proyecto no pertenece a tu organización')
        }
      }
    }

    const { data: postulacion, error: postulacionError } = await db
      .from('postulacion')
      .select('id, estado')
      .eq('miembroid', miembroId)
      .eq('proyectoid', proyectoId)
      .eq('estado', 'Aceptada')
      .maybeSingle()

    if (postulacionError || !postulacion) {
      throw ApiError.badRequest(
        'El miembro no tiene una postulación aceptada en este proyecto'
      )
    }

    const fechaAsistencia = new Date(fecha)
    const fechaInicio = proyecto.fechainicio ? new Date(proyecto.fechainicio) : null
    const fechaFin = proyecto.fechafin ? new Date(proyecto.fechafin) : null

    if (fechaInicio && fechaAsistencia < fechaInicio) {
      throw ApiError.badRequest('La fecha está antes del inicio del proyecto')
    }

    if (fechaFin && fechaAsistencia > fechaFin) {
      throw ApiError.badRequest('La fecha está fuera de la vigencia del proyecto')
    }

    const { data: registroCreado, error: insertError } = await db
      .from('registro_horas')
      .insert([
        {
          miembroid: miembroId,
          proyectoid: proyectoId,
          fecha,
          cantidadhoras: horas,
          descripcion,
          validado: false,
          aprobado: false,
          creado_por: currentUser.id
        }
      ])
      .select()
      .single()

    if (insertError || !registroCreado) {
      logger.error('Error al registrar asistencia', {
        error: insertError,
        hoursData
      })
      throw ApiError.internal('Error al registrar la asistencia')
    }

    return {
      id: registroCreado.id,
      miembroId: registroCreado.miembroid,
      miembroNombre: miembro.nombre,
      proyectoId: registroCreado.proyectoid,
      proyectoNombre: proyecto.nombre,
      fecha: registroCreado.fecha,
      cantidadHoras: registroCreado.cantidadhoras,
      descripcion: registroCreado.descripcion,
      validado: registroCreado.validado,
      aprobado: registroCreado.aprobado
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }

    logger.error('Error inesperado en registerHours', {
      error: error.message,
      stack: error.stack
    })

    throw ApiError.internal('Error al registrar la asistencia')
  }
};

// =============================================================================
// CONSULTAR HISTORIAL DE HORAS (CU-18)
// =============================================================================

/**
 * Obtener historial de horas de un usuario
 * 
 * @param {Object} supabase - Cliente de Supabase
 * @param {string} userId - ID del usuario o miembro
 * 
 * @returns {Promise<Object>} Historial de horas
 */
export const getHoursHistory = async (supabase, userId) => {
  try {
    const db = supabaseAdmin || supabase;
    let miembroId = userId;

    const { data: miembroDirecto, error: miembroDirectoError } = await db
      .from('miembro')
      .select('id, nombre, email, horastotales')
      .eq('id', userId)
      .maybeSingle();

    let miembro = miembroDirecto;

    if (!miembroDirecto) {
      const { data: usuario, error: usuarioError } = await db
        .from('usuario')
        .select('id, email')
        .eq('id', userId)
        .maybeSingle();

      if (usuarioError || !usuario) {
        throw ApiError.notFound('Usuario no encontrado');
      }

      const { data: miembroPorEmail, error: miembroPorEmailError } = await db
        .from('miembro')
        .select('id, nombre, email, horastotales')
        .eq('email', usuario.email)
        .maybeSingle();

      if (miembroPorEmailError || !miembroPorEmail) {
        throw ApiError.notFound('Miembro no encontrado para este usuario');
      }

      miembroId = miembroPorEmail.id;
      miembro = miembroPorEmail;
    }

    const { data: registros, error } = await db
      .from('registro_horas')
      .select(`
        id,
        miembroid,
        proyectoid,
        fecha,
        cantidadhoras,
        descripcion,
        validado,
        aprobado,
        proyecto:proyectoid (
          id,
          nombre
        )
      `)
      .eq('miembroid', miembroId)
      .order('fecha', { ascending: false });

    if (error) {
      logger.error('Error al obtener historial de horas', {
        error,
        userId,
        miembroId,
      });
      throw ApiError.internal('Error al consultar historial de horas');
    }

    const totalHoras = (registros || []).reduce(
      (sum, item) => sum + Number(item.cantidadhoras || 0),
      0
    );

    return {
      userId,
      miembroId,
      miembro: {
        id: miembro.id,
        nombre: miembro.nombre,
        email: miembro.email,
        horasTotales: miembro.horastotales,
      },
      totalHoras,
      registros: registros || [],
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error inesperado en getHoursHistory', {
      error: error.message,
      userId,
    });

    throw ApiError.internal('Error al consultar historial de horas');
  }
};

/**
 * Obtener historial de horas de un miembro específico
 * 
 * @param {string} miembroId - ID del miembro
 * @param {Object} filters - Filtros adicionales
 * @param {Object} currentUser - Usuario que consulta
 * 
 * @returns {Promise<Object>} Historial de horas
 */
export const getMemberHoursHistory = async (miembroId, filters = {}, currentUser) => {
  try {
    const db = supabaseAdmin || supabase;

    // =========================================================================
    // 1. VERIFICAR PERMISOS
    // =========================================================================
    // Miembros solo pueden ver su propio historial
    if (currentUser.role === USER_ROLES.MIEMBRO) {
      // Obtener miembroId del usuario autenticado
      const { data: miembroAuth } = await db
        .from('miembro')
        .select('id')
        .or(`id.eq.${currentUser.id},email.eq.${currentUser.email}`)
        .maybeSingle();

      if (!miembroAuth) {
        throw ApiError.notFound('Perfil de miembro no encontrado');
      }

      // Verificar que no esté intentando ver otro miembro
      if (miembroAuth.id !== miembroId) {
        throw ApiError.forbidden('Solo puedes consultar tu propio historial de horas');
      }
    }

    // Líderes de comité solo pueden ver miembros de su comité
    if (currentUser.role === USER_ROLES.LIDER_COMITE) {
      let isLeader = false;

      for (const key of ['id', 'userid', 'user_id']) {
        if (isLeader) break;

        const { data: leaderById, error: leaderByIdError } = await supabaseAdmin
          .from('lider_comite')
          .select('id')
          .eq(key, currentUser.id)
          .limit(1)
          .maybeSingle();

        if (!leaderByIdError && leaderById) {
          isLeader = true;
        }
      }

      if (!isLeader) {
        for (const key of ['lidercomiteid', 'lider_comite_id', 'lidercomiteId']) {
          if (isLeader) break;

          const { data: managedCommittee, error: managedCommitteeError } = await supabaseAdmin
            .from('comite')
            .select('id')
            .eq(key, currentUser.id)
            .limit(1)
            .maybeSingle();

          if (!managedCommitteeError && managedCommittee) {
            isLeader = true;
          }
        }
      }

      if (!isLeader) {
        throw ApiError.forbidden('No estás registrado como líder de comité');
      }

      // Verificar que el miembro pertenece a un proyecto de su comité
      const { data: miembroProyecto } = await db
        .from('miembro')
        .select(`
          id,
          postulaciones:postulacion(
            proyecto:proyectoid(comiteid)
          )
        `)
        .eq('id', miembroId)
        .maybeSingle();

      // Validación simplificada - en producción hacer más robusta
      // Por ahora confiamos en RLS
    }

    // =========================================================================
    // 2. OBTENER FILTROS
    // =========================================================================
    const {
      proyectoId,
      estado,
      fechaDesde,
      fechaHasta,
      page = 1,
      limit = 20,
    } = filters;

    const offset = (page - 1) * limit;

    // =========================================================================
    // 3. CONSULTAR REGISTROS
    // =========================================================================
    let query = db
      .from('registro_horas')
      .select(`
        *,
        miembro:miembroid (
          id,
          nombre,
          email,
          dui
        ),
        proyecto:proyectoid (
          id,
          nombre,
          estado,
          comite:comiteid (nombre)
        )
      `, { count: 'exact' })
      .eq('miembroid', miembroId);

    // Aplicar filtros adicionales
    if (proyectoId) {
      query = query.eq('proyectoid', proyectoId);
    }

    if (fechaDesde) {
      query = query.gte('fecha', fechaDesde);
    }

    if (fechaHasta) {
      query = query.lte('fecha', fechaHasta);
    }

    const { data: registros, error, count } = await query
      .range(offset, offset + limit - 1)
      .order('fecha', { ascending: false });

    if (error) {
      logger.error('Error al obtener historial de horas', { error, miembroId });
      throw ApiError.internal('Error al consultar el historial de horas');
    }

    const normalizedRecords = (registros || []).map((record) => {
      const isValidated = Boolean(record.validado);
      const isApproved = Boolean(record.aprobado);
      const estadoCalculado = isValidated
        ? (isApproved ? 'validada' : 'rechazada')
        : 'pendiente';

      return {
        ...record,
        estado: record.estado || estadoCalculado,
      };
    });

    const scopedRecords = estado
      ? normalizedRecords.filter((record) => String(record.estado).toLowerCase() === String(estado).toLowerCase())
      : normalizedRecords;

    // =========================================================================
    // 4. CALCULAR TOTALES
    // =========================================================================
    const { total: horasTotales, error: totalError } = await HoursRepository.getTotalHoursByMember(miembroId);

    if (totalError) {
      logger.warn('Error al calcular horas totales', { totalError });
    }

    // Calcular horas por estado
    const horasValidadas = scopedRecords
      ?.filter(r => r.estado === 'validada')
      .reduce((sum, r) => sum + (parseFloat(r.cantidadHoras ?? r.cantidadhoras) || 0), 0) || 0;

    const horasPendientes = scopedRecords
      ?.filter(r => r.estado === 'pendiente')
      .reduce((sum, r) => sum + (parseFloat(r.cantidadHoras ?? r.cantidadhoras) || 0), 0) || 0;

    // =========================================================================
    // 5. RETORNAR RESULTADO
    // =========================================================================
    return {
      miembroId,
      registros: scopedRecords,
      resumen: {
        horasTotales: horasTotales,
        horasValidadas: horasValidadas,
        horasPendientes: horasPendientes,
        registrosTotales: count || 0,
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasNext: page < Math.ceil((count || 0) / limit),
        hasPrev: page > 1,
      },
    };

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error inesperado en getMemberHoursHistory', {
      error: error.message,
      miembroId,
    });

    throw ApiError.internal('Error al consultar el historial de horas');
  }
};

/**
 * Obtener resumen de horas por proyecto
 * 
 * @param {string} proyectoId - ID del proyecto
 * @param {Object} currentUser - Usuario que consulta
 * 
 * @returns {Promise<Object>} Resumen de horas del proyecto
 */
export const getProjectHoursSummary = async (proyectoId, currentUser) => {
  try {
    // Verificar permisos (similar a listHours)
    // ... implementación de permisos ...

    // Obtener todas las horas validadas del proyecto
    const { data: horas, error } = await supabase
      .from('registro_horas')
      .select(`
        cantidadHoras,
        miembro:miembroId (nombre, email)
      `)
      .eq('proyectoId', proyectoId)
      .eq('estado', 'validada');

    if (error) {
      throw ApiError.internal('Error al obtener horas del proyecto');
    }

    // Calcular totales
    const totalHoras = horas?.reduce((sum, h) => sum + (parseFloat(h.cantidadHoras) || 0), 0) || 0;
    const totalMiembros = new Set(horas?.map(h => h.miembro.id)).size;

    // Agrupar por miembro
    const horasPorMiembro = horas?.reduce((acc, h) => {
      const memberId = h.miembro.id;
      if (!acc[memberId]) {
        acc[memberId] = {
          miembroId: memberId,
          nombre: h.miembro.nombre,
          email: h.miembro.email,
          horas: 0,
        };
      }
      acc[memberId].horas += parseFloat(h.cantidadHoras) || 0;
      return acc;
    }, {}) || {};

    return {
      proyectoId,
      totalHoras,
      totalMiembros,
      horasPorMiembro: Object.values(horasPorMiembro),
      registros: horas || [],
    };

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error en getProjectHoursSummary', { error: error.message });
    throw ApiError.internal('Error al obtener resumen del proyecto');
  }
};

/**
 * Obtener reporte de horas por período
 * 
 * @param {Object} filters - Filtros del reporte
 * @param {Object} currentUser - Usuario que consulta
 * 
 * @returns {Promise<Object>} Reporte de horas
 */
export const getHoursReport = async (filters, currentUser) => {
  try {
    const {
      fechaDesde,
      fechaHasta,
      organizacionId,
      comiteId,
      groupBy = 'miembro', // 'miembro', 'proyecto', 'comite'
    } = filters;

    // Verificar permisos
    // ... implementación de permisos ...

    let query = supabase
      .from('registro_horas')
      .select(`
        *,
        miembro:miembroId (nombre, email, organizacionId),
        proyecto:proyectoId (nombre, comiteId),
        comite:comiteId (nombre, organizacionId)
      `)
      .eq('estado', 'validada');

    if (fechaDesde) {
      query = query.gte('fecha', fechaDesde);
    }

    if (fechaHasta) {
      query = query.lte('fecha', fechaHasta);
    }

    if (organizacionId) {
      query = query.eq('miembro.organizacionId', organizacionId);
    }

    if (comiteId) {
      query = query.eq('comiteId', comiteId);
    }

    const { data: registros, error } = await query;

    if (error) {
      throw ApiError.internal('Error al generar reporte');
    }

    // Agrupar según groupBy
    let agrupado = {};

    if (groupBy === 'miembro') {
      agrupado = registros?.reduce((acc, r) => {
        const key = r.miembro.id;
        if (!acc[key]) {
          acc[key] = {
            miembroId: key,
            nombre: r.miembro.nombre,
            email: r.miembro.email,
            horas: 0,
            proyectos: new Set(),
          };
        }
        acc[key].horas += parseFloat(r.cantidadHoras) || 0;
        acc[key].proyectos.add(r.proyecto.id);
        return acc;
      }, {}) || {};
    } else if (groupBy === 'proyecto') {
      agrupado = registros?.reduce((acc, r) => {
        const key = r.proyecto.id;
        if (!acc[key]) {
          acc[key] = {
            proyectoId: key,
            nombre: r.proyecto.nombre,
            horas: 0,
            miembros: new Set(),
          };
        }
        acc[key].horas += parseFloat(r.cantidadHoras) || 0;
        acc[key].miembros.add(r.miembro.id);
        return acc;
      }, {}) || {};
    }

    // Convertir Sets a counts
    const resultado = Object.values(agrupado).map(item => ({
      ...item,
      proyectos: item.proyectos?.size || 0,
      miembros: item.miembros?.size || 0,
    }));

    return {
      filters,
      totalHoras: resultado.reduce((sum, i) => sum + i.horas, 0),
      totalRegistros: resultado.length,
      agrupado: resultado,
    };

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error en getHoursReport', { error: error.message });
    throw ApiError.internal('Error al generar reporte de horas');
  }
};