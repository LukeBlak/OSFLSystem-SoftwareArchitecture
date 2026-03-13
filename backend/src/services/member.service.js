/**
 * =============================================================================
 * SERVICIO DE MIEMBROS - CAPA DE APLICACIÓN
 * =============================================================================
 * 
 * Propósito (ADR-001):
 * - Implementar la lógica de negocio de los casos de uso de gestión de miembros
 * - Coordinar entre controllers y repositories
 * - Validar reglas de negocio específicas de miembros
 * - Integrar con Supabase para persistencia de datos
 * - Gestionar horas sociales de voluntarios
 * 
 * Arquitectura:
 * - Capa: Aplicación (Services)
 * - Patrón: Service Layer + Repository Pattern
 * - Integración: Supabase PostgreSQL
 * 
 * Casos de Uso que implementa:
 * - CU-06: Registrar miembros
 * - CU-07: Dar de baja miembros
 * - Consultar miembros de una organización
 * - Actualizar información de miembros
 * - Gestionar horas sociales de miembros
 * 
 * @module services/member.service
 * @layer Application
 */

import { ApiError } from '../utils/apiError.js';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../utils/logger.js';
import { MemberRepository } from '../repositories/MemberRepository.js';
import { OrganizationRepository } from '../repositories/OrganizationRepository.js';
import { UserRepository } from '../repositories/UserRepository.js';
import {
  MEMBER_STATUS,
  MEMBER_BUSINESS_RULES,
  validateCreateMember,
  validateUpdateMember,
  validateRegisterHours,
  formatMemberForResponse,
  validateDUI,
  isMinimumAge,
} from '../models/Member.js';
import { USER_ROLES } from '../models/User.js';

// =============================================================================
// CONSTANTES Y CONFIGURACIÓN
// =============================================================================

/**
 * Reglas de negocio para miembros
 * @constant {Object}
 */
const BUSINESS_RULES = MEMBER_BUSINESS_RULES;

/**
 * Roles que pueden gestionar miembros
 * @constant {Array<string>}
 */
const MANAGER_ROLES = [
  USER_ROLES.ADMIN,
  USER_ROLES.SUPER_ADMIN,
  USER_ROLES.LIDER_ORGANIZACION,
];

/**
 * Roles que pueden ver miembros
 * @constant {Array<string>}
 */
const VIEWER_ROLES = [
  USER_ROLES.ADMIN,
  USER_ROLES.SUPER_ADMIN,
  USER_ROLES.LIDER_ORGANIZACION,
  USER_ROLES.LIDER_COMITE,
  USER_ROLES.MIEMBRO,
];

// =============================================================================
// FUNCIONES DEL SERVICIO
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * REGISTRAR MIEMBRO (CU-06)
 * -----------------------------------------------------------------------------
 * 
 * Caso de Uso: Registrar un nuevo miembro/voluntario en el sistema
 * 
 * @param {Object} memberData - Datos del miembro a registrar
 * @param {string} memberData.dui - DUI del miembro (formato 00000000-0)
 * @param {string} memberData.nombre - Nombre completo del miembro
 * @param {string} memberData.email - Email del miembro (único)
 * @param {string} [memberData.telefono] - Teléfono de contacto
 * @param {string} [memberData.fechanacimiento] - Fecha de nacimiento
 * @param {string} [memberData.direccion] - Dirección de residencia
 * @param {string} memberData.organizacionId - ID de la organización
 * @param {string} registradoPor - ID del usuario que registra el miembro
 * 
 * @returns {Promise<Object>} Miembro creado
 * 
 * @throws {ApiError} 400 - Datos inválidos o edad mínima no cumplida
 * @throws {ApiError} 403 - Usuario no tiene permisos
 * @throws {ApiError} 404 - Organización no encontrada
 * @throws {ApiError} 409 - DUI o email ya registrado
 * 
 * @example
 * const member = await memberService.registerMember({
 *   dui: '01234567-8',
 *   nombre: 'Juan Pérez',
 *   email: 'juan@ejemplo.com',
 *   organizacionId: 'uuid-organizacion',
 *   registradoPor: 'uuid-usuario'
 * });
 */
export const registerMember = async (memberData) => {
  try {
    // =========================================================================
    // 1. VALIDAR DATOS DE ENTRADA
    // =========================================================================
    const validData = validateCreateMember(memberData);

    // =========================================================================
    // 2. VALIDAR FORMATO DEL DUI
    // =========================================================================
    const duiValidation = validateDUI(validData.dui);
    if (!duiValidation.isValid) {
      throw ApiError.badRequest(
        'DUI inválido. Formato requerido: 00000000-0',
        {
          code: 'INVALID_DUI',
          details: duiValidation,
        }
      );
    }

    // Usar DUI formateado
    const formattedDUI = duiValidation.formatted;

    // =========================================================================
    // 3. VERIFICAR EDAD MÍNIMA
    // =========================================================================
    if (validData.fechanacimiento) {
      if (!isMinimumAge(validData.fechanacimiento, BUSINESS_RULES.MIN_AGE)) {
        throw ApiError.badRequest(
          `El miembro debe tener al menos ${BUSINESS_RULES.MIN_AGE} años para registrarse`,
          {
            code: 'MINIMUM_AGE_NOT_MET',
            details: {
              requiredAge: BUSINESS_RULES.MIN_AGE,
              birthDate: validData.fechanacimiento,
            },
          }
        );
      }
    }

    // =========================================================================
    // 4. VERIFICAR QUE LA ORGANIZACIÓN EXISTE
    // =========================================================================
    const organization = await OrganizationRepository.findById(validData.organizacionId);

    if (!organization) {
      throw ApiError.notFound('Organización no encontrada');
    }

    // =========================================================================
    // 5. VERIFICAR UNICIDAD DE DUI Y EMAIL
    // =========================================================================
    const existingMember = await MemberRepository.findByDuiOrEmail(
      formattedDUI,
      validData.email
    );

    if (existingMember) {
      const conflictField = existingMember.dui === formattedDUI ? 'DUI' : 'email';
      throw ApiError.conflict(
        `El ${conflictField} ya está registrado en el sistema`,
        {
          code: 'MEMBER_ALREADY_EXISTS',
          details: {
            field: conflictField,
            value: conflictField === 'DUI' ? formattedDUI : validData.email,
          },
        }
      );
    }

    // =========================================================================
    // 6. PREPARAR DATOS PARA CREACIÓN
    // =========================================================================
    const memberToCreate = {
      dui: formattedDUI,
      nombre: validData.nombre,
      email: validData.email,
      telefono: validData.telefono || null,
      fechanacimiento: validData.fechanacimiento || null,
      direccion: validData.direccion || null,
      horasTotales: 0,
      estadoActivo: true,
      organizacionId: validData.organizacionId,
      creadoPor: memberData.registradoPor,
    };

    // =========================================================================
    // 7. CREAR MIEMBRO EN LA BASE DE DATOS
    // =========================================================================
    const { data: member, error } = await MemberRepository.create(memberToCreate);

    if (error || !member) {
      logger.error('Error al crear miembro', {
        error,
        organizacionId: validData.organizacionId,
        dui: formattedDUI,
        email: validData.email,
      });
      throw ApiError.internal('Error al registrar el miembro');
    }

    // =========================================================================
    // 8. REGISTRAR EN LOGS
    // =========================================================================
    logger.info('Miembro registrado exitosamente', {
      memberId: member.id,
      nombre: member.nombre,
      email: member.email,
      organizacionId: member.organizacionId,
      registradoPor: memberData.registradoPor,
    });

    // =========================================================================
    // 9. RETORNAR MIEMBRO FORMATEADO
    // =========================================================================
    return formatMemberForResponse(member);

  } catch (error) {
    // Si ya es ApiError, propagarlo
    if (error instanceof ApiError) {
      throw error;
    }

    // Loggear error inesperado
    logger.error('Error inesperado en registerMember', {
      error: error.message,
      stack: error.stack,
      memberData,
    });

    throw ApiError.internal('Error al registrar el miembro');
  }
};

/**
 * -----------------------------------------------------------------------------
 * OBTENER TODOS LOS MIEMBROS
 * -----------------------------------------------------------------------------
 * 
 * Caso de Uso: Consultar miembros con filtros y paginación
 * 
 * @param {Object} filters - Filtros de búsqueda
 * @param {string} [filters.organizacionId] - Filtrar por organización
 * @param {boolean} [filters.estadoActivo] - Filtrar por estado
 * @param {string} [filters.search] - Buscar por nombre o email
 * @param {Object} pagination - Configuración de paginación
 * @param {number} pagination.page - Número de página
 * @param {number} pagination.limit - Límite de resultados
 * @param {Object} currentUser - Usuario que solicita la información
 * 
 * @returns {Promise<Object>} Lista de miembros con paginación
 * 
 * @throws {ApiError} 403 - Usuario no tiene permisos
 * @throws {ApiError} 500 - Error al obtener miembros
 */
export const getAllMembers = async (filters = {}, pagination = {}, currentUser) => {
  try {
    // =========================================================================
    // 1. VERIFICAR PERMISOS DE ACCESO
    // =========================================================================
    const isAdmin = [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(currentUser.role);

    // Si no es admin, debe especificar organización y solo puede ver esa
    if (!isAdmin && !filters.organizacionId) {
      // Usar la organización del usuario
      if (currentUser.organizationId) {
        filters.organizacionId = currentUser.organizationId;
      } else {
        throw ApiError.forbidden(
          'Debes especificar una organización para consultar miembros',
          {
            code: 'ORGANIZATION_REQUIRED',
          }
        );
      }
    }

    // Si no es admin, verificar que solo consulta su organización
    if (!isAdmin && filters.organizacionId && filters.organizacionId !== currentUser.organizationId) {
      throw ApiError.forbidden(
        'Solo puedes consultar miembros de tu organización',
        {
          code: 'ORGANIZATION_ACCESS_DENIED',
        }
      );
    }

    // =========================================================================
    // 2. CONFIGURAR PAGINACIÓN POR DEFECTO
    // =========================================================================
    const page = Math.max(1, parseInt(pagination.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(pagination.limit) || 10));
    const offset = (page - 1) * limit;

    // =========================================================================
    // 3. OBTENER MIEMBROS DE LA BASE DE DATOS
    // =========================================================================
    const { data: members, error, count } = await MemberRepository.findAll({
      ...filters,
      limit,
      offset,
    });

    if (error) {
      logger.error('Error al obtener miembros', {
        error,
        filters,
        pagination,
      });
      throw ApiError.internal('Error al obtener los miembros');
    }

    // =========================================================================
    // 4. CALCULAR METADATOS DE PAGINACIÓN
    // =========================================================================
    const totalPages = Math.ceil((count || 0) / limit);

    // =========================================================================
    // 5. FORMATEAR RESULTADOS
    // =========================================================================
    const formattedMembers = members.map(member =>
      formatMemberForResponse(member)
    );

    // =========================================================================
    // 6. RETORNAR RESULTADOS CON PAGINACIÓN
    // =========================================================================
    return {
      members: formattedMembers,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error inesperado en getAllMembers', {
      error: error.message,
      filters,
      pagination,
    });

    throw ApiError.internal('Error al obtener los miembros');
  }
};

/**
 * -----------------------------------------------------------------------------
 * OBTENER MIEMBRO POR ID
 * -----------------------------------------------------------------------------
 * 
 * Caso de Uso: Consultar detalles completos de un miembro
 * 
 * @param {string} memberId - ID del miembro
 * @param {Object} currentUser - Usuario que solicita la información
 * 
 * @returns {Promise<Object>} Miembro con datos relacionados
 * 
 * @throws {ApiError} 400 - ID inválido
 * @throws {ApiError} 403 - Usuario no tiene permisos
 * @throws {ApiError} 404 - Miembro no encontrado
 */
export const getMemberById = async (memberId, currentUser) => {
  try {
    // =========================================================================
    // 1. VALIDAR ID
    // =========================================================================
    if (!memberId) {
      throw ApiError.badRequest('ID del miembro es requerido');
    }

    // =========================================================================
    // 2. OBTENER MIEMBRO
    // =========================================================================
    const { data: member, error } = await MemberRepository.findById(memberId);

    if (error || !member) {
      throw ApiError.notFound('Miembro no encontrado');
    }

    // =========================================================================
    // 3. VERIFICAR PERMISOS DE ACCESO
    // =========================================================================
    const isAdmin = [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(currentUser.role);

    if (!isAdmin) {
      // Verificar que el usuario pertenezca a la misma organización
      if (currentUser.organizationId && currentUser.organizationId !== member.organizacionId) {
        throw ApiError.forbidden('No tienes permisos para ver este miembro');
      }

      // Un miembro solo puede ver su propio perfil completo
      if (currentUser.role === USER_ROLES.MIEMBRO && currentUser.id !== memberId) {
        throw ApiError.forbidden('Solo puedes ver tu propio perfil');
      }
    }

    // =========================================================================
    // 4. OBTENER DATOS RELACIONADOS
    // =========================================================================
    const [organizacion, registroHoras, postulaciones] = await Promise.all([
      OrganizationRepository.findById(member.organizacionId),
      MemberRepository.getMemberHours(memberId),
      MemberRepository.getMemberApplications(memberId),
    ]);

    // =========================================================================
    // 5. FORMATEAR Y RETORNAR
    // =========================================================================
    return formatMemberForResponse({
      ...member,
      organizacion,
      registroHoras: registroHoras || [],
      postulaciones: postulaciones || [],
    });

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error inesperado en getMemberById', {
      error: error.message,
      memberId,
    });

    throw ApiError.internal('Error al obtener el miembro');
  }
};

/**
 * -----------------------------------------------------------------------------
 * ACTUALIZAR MIEMBRO
 * -----------------------------------------------------------------------------
 * 
 * Caso de Uso: Actualizar información de un miembro existente
 * 
 * @param {string} memberId - ID del miembro a actualizar
 * @param {Object} updateData - Datos a actualizar
 * @param {Object} options - Opciones de actualización
 * @param {string} options.updatedBy - ID del usuario que actualiza
 * @param {string} options.userRole - Rol del usuario que actualiza
 * 
 * @returns {Promise<Object>} Miembro actualizado
 * 
 * @throws {ApiError} 400 - Datos inválidos
 * @throws {ApiError} 403 - Usuario no tiene permisos
 * @throws {ApiError} 404 - Miembro no encontrado
 * @throws {ApiError} 409 - Nuevo DUI o email ya existe
 */
export const updateMember = async (memberId, updateData, options = {}) => {
  try {
    // =========================================================================
    // 1. VALIDAR DATOS DE ENTRADA
    // =========================================================================
    const validData = validateUpdateMember(updateData);

    // =========================================================================
    // 2. VERIFICAR QUE EL MIEMBRO EXISTE
    // =========================================================================
    const existingMember = await MemberRepository.findById(memberId);

    if (!existingMember || existingMember.error) {
      throw ApiError.notFound('Miembro no encontrado');
    }

    // =========================================================================
    // 3. VERIFICAR PERMISOS DEL USUARIO
    // =========================================================================
    if (!MANAGER_ROLES.includes(options.userRole)) {
      throw ApiError.forbidden('No tienes permisos para actualizar este miembro');
    }

    // =========================================================================
    // 4. VALIDAR UNICIDAD DE DUI SI SE CAMBIA
    // =========================================================================
    if (validData.dui && validData.dui !== existingMember.data.dui) {
      const duiValidation = validateDUI(validData.dui);
      if (!duiValidation.isValid) {
        throw ApiError.badRequest('DUI inválido. Formato requerido: 00000000-0');
      }

      const duiExists = await MemberRepository.findByDui(duiValidation.formatted);
      if (duiExists && duiExists.id !== memberId) {
        throw ApiError.conflict('El DUI ya está registrado por otro miembro');
      }

      validData.dui = duiValidation.formatted;
    }

    // =========================================================================
    // 5. VALIDAR UNICIDAD DE EMAIL SI SE CAMBIA
    // =========================================================================
    if (validData.email && validData.email !== existingMember.data.email) {
      const emailExists = await MemberRepository.findByEmail(validData.email);
      if (emailExists && emailExists.id !== memberId) {
        throw ApiError.conflict('El email ya está registrado por otro miembro');
      }
    }

    // =========================================================================
    // 6. VALIDAR EDAD MÍNIMA SI SE CAMBIA LA FECHA DE NACIMIENTO
    // =========================================================================
    if (validData.fechanacimiento) {
      if (!isMinimumAge(validData.fechanacimiento, BUSINESS_RULES.MIN_AGE)) {
        throw ApiError.badRequest(
          `El miembro debe tener al menos ${BUSINESS_RULES.MIN_AGE} años`
        );
      }
    }

    // =========================================================================
    // 7. PREPARAR DATOS PARA ACTUALIZACIÓN
    // =========================================================================
    const memberToUpdate = {
      ...validData,
      modificadoPor: options.updatedBy,
      fechaEdicion: new Date().toISOString(),
    };

    // =========================================================================
    // 8. ACTUALIZAR EN LA BASE DE DATOS
    // =========================================================================
    const { data: updatedMember, error } = await MemberRepository.update(
      memberId,
      memberToUpdate
    );

    if (error || !updatedMember) {
      logger.error('Error al actualizar miembro', {
        error,
        memberId,
        updateData,
      });
      throw ApiError.internal('Error al actualizar el miembro');
    }

    // =========================================================================
    // 9. REGISTRAR EN LOGS
    // =========================================================================
    logger.info('Miembro actualizado exitosamente', {
      memberId,
      updatedBy: options.updatedBy,
      changes: Object.keys(validData),
    });

    // =========================================================================
    // 10. RETORNAR MIEMBRO FORMATEADO
    // =========================================================================
    return formatMemberForResponse(updatedMember);

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error inesperado en updateMember', {
      error: error.message,
      memberId,
      updateData,
    });

    throw ApiError.internal('Error al actualizar el miembro');
  }
};

/**
 * -----------------------------------------------------------------------------
 * DAR DE BAJA MIEMBRO (CU-07)
 * -----------------------------------------------------------------------------
 * 
 * Caso de Uso: Desactivar un miembro sin eliminarlo físicamente
 * 
 * @param {string} memberId - ID del miembro a desactivar
 * @param {Object} options - Opciones de desactivación
 * @param {string} options.deactivatedBy - ID del usuario que desactiva
 * 
 * @returns {Promise<Object>} Resultado de la desactivación
 * 
 * @throws {ApiError} 403 - Usuario no tiene permisos
 * @throws {ApiError} 404 - Miembro no encontrado
 * @throws {ApiError} 409 - Miembro tiene proyectos activos pendientes
 */
export const deactivateMember = async (memberId, options = {}) => {
  try {
    // =========================================================================
    // 1. VERIFICAR QUE EL MIEMBRO EXISTE
    // =========================================================================
    const existingMember = await MemberRepository.findById(memberId);

    if (!existingMember || existingMember.error) {
      throw ApiError.notFound('Miembro no encontrado');
    }

    // =========================================================================
    // 2. VERIFICAR QUE NO TENGA PROYECTOS ACTIVOS PENDIENTES
    // =========================================================================
    const activeProjects = await MemberRepository.getMemberActiveProjects(memberId);

    if (activeProjects && activeProjects.length > 0) {
      throw ApiError.conflict(
        'No se puede desactivar el miembro porque tiene proyectos activos pendientes. Finaliza o transfiere los proyectos primero.',
        {
          code: 'ACTIVE_PROJECTS_EXIST',
          details: {
            activeProjectsCount: activeProjects.length,
          },
        }
      );
    }

    // =========================================================================
    // 3. DESACTIVAR MIEMBRO (CAMBIAR ESTADO)
    // =========================================================================
    const { error } = await MemberRepository.update(memberId, {
      estadoActivo: false,
      modificadoPor: options.deactivatedBy,
      fechaEdicion: new Date().toISOString(),
    });

    if (error) {
      logger.error('Error al desactivar miembro', {
        error,
        memberId,
      });
      throw ApiError.internal('Error al desactivar el miembro');
    }

    // =========================================================================
    // 4. REGISTRAR EN LOGS
    // =========================================================================
    logger.info('Miembro desactivado exitosamente', {
      memberId,
      deactivatedBy: options.deactivatedBy,
      memberEmail: existingMember.data.email,
    });

    // =========================================================================
    // 5. RETORNAR RESULTADO
    // =========================================================================
    return {
      success: true,
      message: 'Miembro dado de baja exitosamente',
      memberId,
    };

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error inesperado en deactivateMember', {
      error: error.message,
      memberId,
    });

    throw ApiError.internal('Error al desactivar el miembro');
  }
};

/**
 * -----------------------------------------------------------------------------
 * REACTIVAR MIEMBRO
 * -----------------------------------------------------------------------------
 * 
 * Caso de Uso: Reactivar un miembro previamente desactivado
 * 
 * @param {string} memberId - ID del miembro a reactivar
 * @param {Object} options - Opciones de reactivación
 * @param {string} options.reactivatedBy - ID del usuario que reactiva
 * 
 * @returns {Promise<Object>} Miembro reactivado
 * 
 * @throws {ApiError} 403 - Usuario no tiene permisos
 * @throws {ApiError} 404 - Miembro no encontrado
 * @throws {ApiError} 409 - Miembro ya está activo
 */
export const reactivateMember = async (memberId, options = {}) => {
  try {
    // =========================================================================
    // 1. VERIFICAR QUE EL MIEMBRO EXISTE
    // =========================================================================
    const existingMember = await MemberRepository.findById(memberId);

    if (!existingMember || existingMember.error) {
      throw ApiError.notFound('Miembro no encontrado');
    }

    // =========================================================================
    // 2. VERIFICAR QUE EL MIEMBRO ESTÉ INACTIVO
    // =========================================================================
    if (existingMember.data.estadoActivo) {
      throw ApiError.conflict('El miembro ya está activo');
    }

    // =========================================================================
    // 3. REACTIVAR MIEMBRO
    // =========================================================================
    const { data: updatedMember, error } = await MemberRepository.update(memberId, {
      estadoActivo: true,
      modificadoPor: options.reactivatedBy,
      fechaEdicion: new Date().toISOString(),
    });

    if (error || !updatedMember) {
      logger.error('Error al reactivar miembro', {
        error,
        memberId,
      });
      throw ApiError.internal('Error al reactivar el miembro');
    }

    // =========================================================================
    // 4. REGISTRAR EN LOGS
    // =========================================================================
    logger.info('Miembro reactivado exitosamente', {
      memberId,
      reactivatedBy: options.reactivatedBy,
    });

    // =========================================================================
    // 5. RETORNAR MIEMBRO FORMATEADO
    // =========================================================================
    return formatMemberForResponse(updatedMember);

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error inesperado en reactivateMember', {
      error: error.message,
      memberId,
    });

    throw ApiError.internal('Error al reactivar el miembro');
  }
};

/**
 * -----------------------------------------------------------------------------
 * OBTENER HORAS TOTALES DE UN MIEMBRO
 * -----------------------------------------------------------------------------
 * 
 * Caso de Uso: Obtener resumen de horas sociales registradas
 * 
 * @param {string} memberId - ID del miembro
 * @param {Object} currentUser - Usuario que solicita la información
 * 
 * @returns {Promise<Object>} Resumen de horas del miembro
 * 
 * @throws {ApiError} 403 - Usuario no tiene permisos
 * @throws {ApiError} 404 - Miembro no encontrado
 */
export const getMemberHours = async (memberId, currentUser) => {
  try {
    // =========================================================================
    // 1. VERIFICAR QUE EL MIEMBRO EXISTE
    // =========================================================================
    const member = await MemberRepository.findById(memberId);

    if (!member || member.error) {
      throw ApiError.notFound('Miembro no encontrado');
    }

    // =========================================================================
    // 2. VERIFICAR PERMISOS
    // =========================================================================
    const isAdmin = [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(currentUser.role);
    const isOwnProfile = currentUser.id === memberId;

    if (!isAdmin && !isOwnProfile) {
      // Verificar que pertenezca a la misma organización
      if (currentUser.organizationId !== member.data.organizacionId) {
        throw ApiError.forbidden('No tienes permisos para ver las horas de este miembro');
      }
    }

    // =========================================================================
    // 3. OBTENER HORAS REGISTRADAS
    // =========================================================================
    const horasRegistradas = await MemberRepository.getMemberHours(memberId);

    // =========================================================================
    // 4. CALCULAR TOTALES
    // =========================================================================
    const totales = horasRegistradas?.reduce(
      (sum, h) => sum + (parseFloat(h.cantidadHoras) || 0),
      0
    ) || 0;

    const validadas = horasRegistradas
      ?.filter(h => h.validado)
      .reduce((sum, h) => sum + (parseFloat(h.cantidadHoras) || 0), 0) || 0;

    const pendientes = totales - validadas;

    // Agrupar por proyecto
    const porProyecto = horasRegistradas?.reduce((acc, h) => {
      const key = h.proyectoId || 'sin_proyecto';
      if (!acc[key]) {
        acc[key] = {
          proyectoId: h.proyectoId,
          proyectoNombre: h.proyectoNombre || 'Sin proyecto',
          horas: 0,
        };
      }
      acc[key].horas += parseFloat(h.cantidadHoras) || 0;
      return acc;
    }, {}) || {};

    // =========================================================================
    // 5. RETORNAR RESUMEN
    // =========================================================================
    return {
      totales,
      validadas,
      pendientes,
      porProyecto: Object.values(porProyecto),
      memberId,
      generatedAt: new Date().toISOString(),
    };

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error inesperado en getMemberHours', {
      error: error.message,
      memberId,
    });

    throw ApiError.internal('Error al obtener las horas del miembro');
  }
};

/**
 * -----------------------------------------------------------------------------
 * REGISTRAR HORAS DE UN MIEMBRO
 * -----------------------------------------------------------------------------
 * 
 * Caso de Uso: Registrar horas sociales para un miembro en un proyecto
 * 
 * @param {Object} hoursData - Datos del registro de horas
 * @param {string} hoursData.memberId - ID del miembro
 * @param {string} hoursData.proyectoId - ID del proyecto
 * @param {string} hoursData.fecha - Fecha del registro
 * @param {number} hoursData.cantidadHoras - Cantidad de horas
 * @param {string} [hoursData.descripcion] - Descripción de las actividades
 * @param {string} registradoPor - ID del usuario que registra las horas
 * 
 * @returns {Promise<Object>} Registro de horas creado
 * 
 * @throws {ApiError} 400 - Datos inválidos
 * @throws {ApiError} 404 - Miembro o proyecto no encontrado
 * @throws {ApiError} 409 - Ya existen horas registradas para esa fecha
 */
export const registerHours = async (hoursData, registradoPor) => {
  try {
    // =========================================================================
    // 1. VALIDAR DATOS DE ENTRADA
    // =========================================================================
    const validData = validateRegisterHours(hoursData);

    // =========================================================================
    // 2. VERIFICAR QUE EL MIEMBRO EXISTE
    // =========================================================================
    const member = await MemberRepository.findById(validData.memberId);

    if (!member || member.error) {
      throw ApiError.notFound('Miembro no encontrado');
    }

    // =========================================================================
    // 3. VERIFICAR QUE EL MIEMBRO ESTÉ ACTIVO
    // =========================================================================
    if (!member.data.estadoActivo) {
      throw ApiError.forbidden('El miembro está inactivo y no puede registrar horas');
    }

    // =========================================================================
    // 4. VERIFICAR QUE EL PROYECTO EXISTE
    // =========================================================================
    // TODO: Implementar ProjectRepository.findById
    // Por ahora, asumimos que el proyecto existe

    // =========================================================================
    // 5. PREPARAR DATOS PARA CREACIÓN
    // =========================================================================
    const hoursToCreate = {
      proyectoid: validData.proyectoId,
      miembroid: validData.memberId,
      fecha: validData.fecha,
      cantidadHoras: validData.cantidadHoras,
      descripcion: validData.descripcion || null,
      validado: false,
      aprobado: false,
      creadoPor: registradoPor,
    };

    // =========================================================================
    // 6. CREAR REGISTRO DE HORAS
    // =========================================================================
    const { data: registro, error } = await MemberRepository.createHoursRecord(hoursToCreate);

    if (error || !registro) {
      logger.error('Error al registrar horas', {
        error,
        memberId: validData.memberId,
        projectId: validData.proyectoId,
      });
      throw ApiError.internal('Error al registrar las horas');
    }

    // =========================================================================
    // 7. ACTUALIZAR HORAS TOTALES DEL MIEMBRO
    // =========================================================================
    await MemberRepository.updateTotalHours(validData.memberId);

    // =========================================================================
    // 8. REGISTRAR EN LOGS
    // =========================================================================
    logger.info('Horas registradas exitosamente', {
      registroId: registro.id,
      memberId: validData.memberId,
      projectId: validData.proyectoId,
      horas: validData.cantidadHoras,
      registradoPor,
    });

    // =========================================================================
    // 9. RETORNAR REGISTRO FORMATEADO
    // =========================================================================
    return {
      id: registro.id,
      fecha: registro.fecha,
      cantidadHoras: registro.cantidadHoras,
      descripcion: registro.descripcion,
      validado: registro.validado,
      aprobado: registro.aprobado,
      createdAt: registro.fecha_creacion,
    };

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error inesperado en registerHours', {
      error: error.message,
      hoursData,
    });

    throw ApiError.internal('Error al registrar las horas');
  }
};

/**
 * -----------------------------------------------------------------------------
 * OBTENER PROYECTOS DE UN MIEMBRO
 * -----------------------------------------------------------------------------
 * 
 * @param {string} memberId - ID del miembro
 * @param {Object} filters - Filtros de búsqueda
 * @param {Object} pagination - Paginación
 * 
 * @returns {Promise<Object>} Lista de proyectos del miembro
 */
export const getMemberProjects = async (memberId, filters = {}, pagination = {}) => {
  try {
    const page = Math.max(1, parseInt(pagination.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(pagination.limit) || 10));

    const { data: projects, count } = await MemberRepository.getMemberProjects(memberId, {
      ...filters,
      limit,
      offset: (page - 1) * limit,
    });

    return {
      projects: projects || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  } catch (error) {
    logger.error('Error en getMemberProjects', { error: error.message, memberId });
    throw ApiError.internal('Error al obtener proyectos del miembro');
  }
};

/**
 * -----------------------------------------------------------------------------
 * OBTENER POSTULACIONES DE UN MIEMBRO
 * -----------------------------------------------------------------------------
 * 
 * @param {string} memberId - ID del miembro
 * @param {Object} filters - Filtros de búsqueda
 * 
 * @returns {Promise<Object>} Lista de postulaciones del miembro
 */
export const getMemberApplications = async (memberId, filters = {}) => {
  try {
    const { data: applications } = await MemberRepository.getMemberApplications(memberId, filters);

    return {
      applications: applications || [],
      total: applications?.length || 0,
    };
  } catch (error) {
    logger.error('Error en getMemberApplications', { error: error.message, memberId });
    throw ApiError.internal('Error al obtener postulaciones del miembro');
  }
};

/**
 * -----------------------------------------------------------------------------
 * VALIDAR HORAS DE UN MIEMBRO
 * -----------------------------------------------------------------------------
 * 
 * @param {string} hoursRecordId - ID del registro de horas
 * @param {boolean} aprobado - Si las horas son aprobadas o rechazadas
 * @param {string} validatedBy - ID del usuario que valida
 * @param {string} [observaciones] - Observaciones de la validación
 * 
 * @returns {Promise<Object>} Registro de horas actualizado
 */
export const validateHours = async (hoursRecordId, aprobado, validatedBy, observaciones = null) => {
  try {
    const { data: updatedRecord, error } = await MemberRepository.updateHoursRecord(hoursRecordId, {
      validado: true,
      aprobado,
      observaciones,
      modificadoPor: validatedBy,
      fechaEdicion: new Date().toISOString(),
    });

    if (error || !updatedRecord) {
      throw ApiError.internal('Error al validar las horas');
    }

    // Actualizar horas totales del miembro
    await MemberRepository.updateTotalHours(updatedRecord.miembroid);

    logger.info('Horas validadas', {
      hoursRecordId,
      aprobado,
      validatedBy,
    });

    return updatedRecord;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error en validateHours', { error: error.message, hoursRecordId });
    throw ApiError.internal('Error al validar las horas');
  }
};

// =============================================================================
// EXPORTACIÓN POR DEFECTO
// =============================================================================

/**
 * Objeto con todas las funciones del servicio
 * para facilitar la importación en controllers
 */
export default {
  registerMember,
  getAllMembers,
  getMemberById,
  updateMember,
  deactivateMember,
  reactivateMember,
  getMemberHours,
  registerHours,
  getMemberProjects,
  getMemberApplications,
  validateHours,
};