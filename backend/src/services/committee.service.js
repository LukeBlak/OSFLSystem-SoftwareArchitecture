/**
 * =============================================================================
 * SERVICIO DE COMITÉS - CAPA DE APLICACIÓN
 * =============================================================================
 * 
 * Propósito (ADR-001):
 * - Implementar la lógica de negocio de los casos de uso de gestión de comités
 * - Coordinar entre controllers y repositories
 * - Validar reglas de negocio específicas de comités
 * - Integrar con Supabase para persistencia de datos
 * 
 * Arquitectura:
 * - Capa: Aplicación (Services)
 * - Patrón: Service Layer + Repository Pattern
 * - Integración: Supabase PostgreSQL
 * 
 * Casos de Uso que implementa:
 * - CU-08: Crear comités
 * - Consultar comités de una organización
 * - Actualizar información de comités
 * - Dar de baja comités (soft delete)
 * - Asignar líder a comité
 * 
 * @module services/committee.service
 * @layer Application
 */

import { ApiError } from '../utils/apiError.js';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../utils/logger.js';
import { CommitteeRepository } from '../repositories/CommitteeRepository.js';
import { OrganizationRepository } from '../repositories/OrganizationRepository.js';
import { MemberRepository } from '../repositories/MemberRepository.js';
import {
  COMMITTEE_STATUS,
  COMMITTEE_AREAS,
  validateCreateCommittee,
  validateUpdateCommittee,
  formatCommitteeForResponse,
} from '../models/Committee.js';
import { USER_ROLES } from '../models/User.js';

// =============================================================================
// CONSTANTES Y CONFIGURACIÓN
// =============================================================================

/**
 * Estados válidos de comité para operaciones
 * @constant {Array<string>}
 */
const VALID_STATUSES = Object.values(COMMITTEE_STATUS);

/**
 * Áreas de responsabilidad válidas
 * @constant {Array<string>}
 */
const VALID_AREAS = Object.values(COMMITTEE_AREAS);

/**
 * Roles que pueden gestionar comités
 * @constant {Array<string>}
 */
const MANAGER_ROLES = [
  USER_ROLES.ADMIN,
  USER_ROLES.SUPER_ADMIN,
  USER_ROLES.LIDER_ORGANIZACION,
];

// =============================================================================
// FUNCIONES DEL SERVICIO
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * CREAR COMITÉ (CU-08)
 * -----------------------------------------------------------------------------
 * 
 * Caso de Uso: Crear un nuevo comité dentro de una organización
 * 
 * @param {Object} committeeData - Datos del comité a crear
 * @param {string} committeeData.nombre - Nombre del comité
 * @param {string} [committeeData.areaResponsabilidad] - Área de responsabilidad
 * @param {string} [committeeData.descripcion] - Descripción del comité
 * @param {string} [committeeData.estado] - Estado inicial
 * @param {number} [committeeData.presupuestoAsignado] - Presupuesto asignado
 * @param {string} committeeData.organizacionId - ID de la organización
 * @param {string} [committeeData.liderComiteId] - ID del líder asignado
 * @param {string} creadoPor - ID del usuario que crea el comité
 * 
 * @returns {Promise<Object>} Comité creado
 * 
 * @throws {ApiError} 400 - Datos inválidos
 * @throws {ApiError} 403 - Usuario no tiene permisos
 * @throws {ApiError} 404 - Organización no encontrada
 * @throws {ApiError} 409 - Comité con mismo nombre ya existe
 * 
 * @example
 * const committee = await committeeService.createCommittee({
 *   nombre: 'Comité de Marketing',
 *   areaResponsabilidad: 'comunicacion',
 *   organizacionId: 'uuid-organizacion',
 *   creadoPor: 'uuid-usuario'
 * });
 */
export const createCommittee = async (committeeData) => {
  try {
    // =========================================================================
    // 1. VALIDAR DATOS DE ENTRADA
    // =========================================================================
    const validData = validateCreateCommittee(committeeData);

    // =========================================================================
    // 2. VERIFICAR QUE LA ORGANIZACIÓN EXISTE
    // =========================================================================
    const organization = await OrganizationRepository.findById(validData.organizacionId);

    if (!organization) {
      throw ApiError.notFound('Organización no encontrada');
    }

    // =========================================================================
    // 3. VERIFICAR QUE EL NOMBRE SEA ÚNICO DENTRO DE LA ORGANIZACIÓN
    // =========================================================================
    const existingCommittee = await CommitteeRepository.findByNameAndOrganization(
      validData.nombre,
      validData.organizacionId
    );

    if (existingCommittee) {
      throw ApiError.conflict(
        `Ya existe un comité con el nombre '${validData.nombre}' en esta organización`
      );
    }

    // =========================================================================
    // 4. VALIDAR LÍDER DE COMITÉ SI SE PROPORCIONA
    // =========================================================================
    if (validData.liderComiteId) {
      const lider = await MemberRepository.findById(validData.liderComiteId);

      if (!lider) {
        throw ApiError.notFound('Líder de comité no encontrado');
      }

      // Verificar que el líder pertenece a la misma organización
      if (lider.organizacionId !== validData.organizacionId) {
        throw ApiError.badRequest(
          'El líder del comité debe pertenecer a la misma organización'
        );
      }
    }

    // =========================================================================
    // 5. PREPARAR DATOS PARA CREACIÓN
    // =========================================================================
    const committeeToCreate = {
      nombre: validData.nombre,
      areaResponsabilidad: validData.areaResponsabilidad || null,
      descripcion: validData.descripcion || null,
      estado: validData.estado || COMMITTEE_STATUS.ACTIVO,
      presupuestoAsignado: validData.presupuestoAsignado || 0,
      organizacionId: validData.organizacionId,
      liderComiteId: validData.liderComiteId || null,
      creadoPor: committeeData.creadoPor,
    };

    // =========================================================================
    // 6. CREAR COMITÉ EN LA BASE DE DATOS
    // =========================================================================
    const { data: committee, error } = await CommitteeRepository.create(committeeToCreate);

    if (error || !committee) {
      logger.error('Error al crear comité', {
        error,
        organizacionId: validData.organizacionId,
        nombre: validData.nombre,
      });
      throw ApiError.internal('Error al crear el comité');
    }

    // =========================================================================
    // 7. REGISTRAR EN LOGS
    // =========================================================================
    logger.info('Comité creado exitosamente', {
      committeeId: committee.id,
      nombre: committee.nombre,
      organizacionId: committee.organizacionId,
      creadoPor: committeeData.creadoPor,
    });

    // =========================================================================
    // 8. RETORNAR COMITÉ FORMATEADO
    // =========================================================================
    return formatCommitteeForResponse(committee);

  } catch (error) {
    // Si ya es ApiError, propagarlo
    if (error instanceof ApiError) {
      throw error;
    }

    // Loggear error inesperado
    logger.error('Error inesperado en createCommittee', {
      error: error.message,
      stack: error.stack,
      committeeData,
    });

    throw ApiError.internal('Error al crear el comité');
  }
};

/**
 * -----------------------------------------------------------------------------
 * OBTENER TODOS LOS COMITÉS
 * -----------------------------------------------------------------------------
 * 
 * Caso de Uso: Consultar comités con filtros y paginación
 * 
 * @param {Object} filters - Filtros de búsqueda
 * @param {string} [filters.organizacionId] - Filtrar por organización
 * @param {string} [filters.estado] - Filtrar por estado
 * @param {Object} pagination - Configuración de paginación
 * @param {number} pagination.page - Número de página
 * @param {number} pagination.limit - Límite de resultados
 * 
 * @returns {Promise<Object>} Lista de comités con paginación
 * 
 * @throws {ApiError} 500 - Error al obtener comités
 */
export const getAllCommittees = async (filters = {}, pagination = {}) => {
  try {
    // =========================================================================
    // 1. VALIDAR FILTROS
    // =========================================================================
    if (filters.estado && !VALID_STATUSES.includes(filters.estado)) {
      throw ApiError.badRequest(
        `Estado inválido. Estados permitidos: ${VALID_STATUSES.join(', ')}`
      );
    }

    if (filters.areaResponsabilidad && !VALID_AREAS.includes(filters.areaResponsabilidad)) {
      throw ApiError.badRequest(
        `Área inválida. Áreas permitidas: ${VALID_AREAS.join(', ')}`
      );
    }

    // =========================================================================
    // 2. CONFIGURAR PAGINACIÓN POR DEFECTO
    // =========================================================================
    const page = Math.max(1, parseInt(pagination.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(pagination.limit) || 10));
    const offset = (page - 1) * limit;

    // =========================================================================
    // 3. OBTENER COMITÉS DE LA BASE DE DATOS
    // =========================================================================
    const { data: committees, error, count } = await CommitteeRepository.findAll({
      ...filters,
      limit,
      offset,
    });

    if (error) {
      logger.error('Error al obtener comités', {
        error,
        filters,
        pagination,
      });
      throw ApiError.internal('Error al obtener los comités');
    }

    // =========================================================================
    // 4. CALCULAR METADATOS DE PAGINACIÓN
    // =========================================================================
    const totalPages = Math.ceil((count || 0) / limit);

    // =========================================================================
    // 5. FORMATEAR RESULTADOS
    // =========================================================================
    const formattedCommittees = committees.map(committee =>
      formatCommitteeForResponse(committee)
    );

    // =========================================================================
    // 6. RETORNAR RESULTADOS CON PAGINACIÓN
    // =========================================================================
    return {
      committees: formattedCommittees,
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

    logger.error('Error inesperado en getAllCommittees', {
      error: error.message,
      filters,
      pagination,
    });

    throw ApiError.internal('Error al obtener los comités');
  }
};

/**
 * -----------------------------------------------------------------------------
 * OBTENER COMITÉ POR ID
 * -----------------------------------------------------------------------------
 * 
 * Caso de Uso: Consultar detalles completos de un comité
 * 
 * @param {string} committeeId - ID del comité
 * @param {Object} currentUser - Usuario que solicita la información
 * 
 * @returns {Promise<Object>} Comité con datos relacionados
 * 
 * @throws {ApiError} 400 - ID inválido
 * @throws {ApiError} 403 - Usuario no tiene permisos
 * @throws {ApiError} 404 - Comité no encontrado
 */
export const getCommitteeById = async (committeeId, currentUser) => {
  try {
    // =========================================================================
    // 1. VALIDAR ID
    // =========================================================================
    if (!committeeId) {
      throw ApiError.badRequest('ID del comité es requerido');
    }

    // =========================================================================
    // 2. OBTENER COMITÉ
    // =========================================================================
    const { data: committee, error } = await CommitteeRepository.findById(committeeId);

    if (error || !committee) {
      throw ApiError.notFound('Comité no encontrado');
    }

    // =========================================================================
    // 3. VERIFICAR PERMISOS DE ACCESO
    // =========================================================================
    // Los admins y super admins pueden ver cualquier comité
    const isAdmin = [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(currentUser.role);

    if (!isAdmin) {
      // Verificar que el usuario pertenezca a la misma organización
      if (currentUser.organizationId && currentUser.organizationId !== committee.organizacionId) {
        throw ApiError.forbidden('No tienes permisos para ver este comité');
      }
    }

    // =========================================================================
    // 4. OBTENER DATOS RELACIONADOS
    // =========================================================================
    const [organizacion, lider, proyectos] = await Promise.all([
      OrganizationRepository.findById(committee.organizacionId),
      committee.liderComiteId ? MemberRepository.findById(committee.liderComiteId) : null,
      CommitteeRepository.getCommitteeProjects(committeeId),
    ]);

    // =========================================================================
    // 5. FORMATEAR Y RETORNAR
    // =========================================================================
    return formatCommitteeForResponse({
      ...committee,
      organizacion,
      lider,
      proyectos: proyectos || [],
    });

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error inesperado en getCommitteeById', {
      error: error.message,
      committeeId,
    });

    throw ApiError.internal('Error al obtener el comité');
  }
};

/**
 * -----------------------------------------------------------------------------
 * ACTUALIZAR COMITÉ
 * -----------------------------------------------------------------------------
 * 
 * Caso de Uso: Actualizar información de un comité existente
 * 
 * @param {string} committeeId - ID del comité a actualizar
 * @param {Object} updateData - Datos a actualizar
 * @param {Object} options - Opciones de actualización
 * @param {string} options.updatedBy - ID del usuario que actualiza
 * @param {string} options.userRole - Rol del usuario que actualiza
 * 
 * @returns {Promise<Object>} Comité actualizado
 * 
 * @throws {ApiError} 400 - Datos inválidos
 * @throws {ApiError} 403 - Usuario no tiene permisos
 * @throws {ApiError} 404 - Comité no encontrado
 * @throws {ApiError} 409 - Nuevo nombre ya existe
 */
export const updateCommittee = async (committeeId, updateData, options = {}) => {
  try {
    // =========================================================================
    // 1. VALIDAR DATOS DE ENTRADA
    // =========================================================================
    const validData = validateUpdateCommittee(updateData);

    // =========================================================================
    // 2. VERIFICAR QUE EL COMITÉ EXISTE
    // =========================================================================
    const existingCommittee = await CommitteeRepository.findById(committeeId);

    if (!existingCommittee || existingCommittee.error) {
      throw ApiError.notFound('Comité no encontrado');
    }

    // =========================================================================
    // 3. VERIFICAR PERMISOS DEL USUARIO
    // =========================================================================
    const allowedRoles = [
      USER_ROLES.ADMIN,
      USER_ROLES.SUPER_ADMIN,
      USER_ROLES.LIDER_ORGANIZACION,
    ];

    if (!allowedRoles.includes(options.userRole)) {
      throw ApiError.forbidden('No tienes permisos para actualizar este comité');
    }

    // =========================================================================
    // 4. VALIDAR UNICIDAD DEL NOMBRE SI SE CAMBIA
    // =========================================================================
    if (validData.nombre && validData.nombre !== existingCommittee.data.nombre) {
      const nameExists = await CommitteeRepository.findByNameAndOrganization(
        validData.nombre,
        existingCommittee.data.organizacionId
      );

      if (nameExists) {
        throw ApiError.conflict(
          `Ya existe un comité con el nombre '${validData.nombre}' en esta organización`
        );
      }
    }

    // =========================================================================
    // 5. VALIDAR LÍDER DE COMITÉ SI SE CAMBIA
    // =========================================================================
    if (validData.liderComiteId && validData.liderComiteId !== existingCommittee.data.liderComiteId) {
      const lider = await MemberRepository.findById(validData.liderComiteId);

      if (!lider) {
        throw ApiError.notFound('Líder de comité no encontrado');
      }

      if (lider.organizacionId !== existingCommittee.data.organizacionId) {
        throw ApiError.badRequest(
          'El líder del comité debe pertenecer a la misma organización'
        );
      }
    }

    // =========================================================================
    // 6. PREPARAR DATOS PARA ACTUALIZACIÓN
    // =========================================================================
    const committeeToUpdate = {
      ...validData,
      modificadoPor: options.updatedBy,
      fechaEdicion: new Date().toISOString(),
    };

    // =========================================================================
    // 7. ACTUALIZAR EN LA BASE DE DATOS
    // =========================================================================
    const { data: updatedCommittee, error } = await CommitteeRepository.update(
      committeeId,
      committeeToUpdate
    );

    if (error || !updatedCommittee) {
      logger.error('Error al actualizar comité', {
        error,
        committeeId,
        updateData,
      });
      throw ApiError.internal('Error al actualizar el comité');
    }

    // =========================================================================
    // 8. REGISTRAR EN LOGS
    // =========================================================================
    logger.info('Comité actualizado exitosamente', {
      committeeId,
      updatedBy: options.updatedBy,
      changes: Object.keys(validData),
    });

    // =========================================================================
    // 9. RETORNAR COMITÉ FORMATEADO
    // =========================================================================
    return formatCommitteeForResponse(updatedCommittee);

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error inesperado en updateCommittee', {
      error: error.message,
      committeeId,
      updateData,
    });

    throw ApiError.internal('Error al actualizar el comité');
  }
};

/**
 * -----------------------------------------------------------------------------
 * DESACTIVAR COMITÉ (SOFT DELETE)
 * -----------------------------------------------------------------------------
 * 
 * Caso de Uso: Desactivar un comité sin eliminarlo físicamente
 * 
 * @param {string} committeeId - ID del comité a desactivar
 * @param {Object} options - Opciones de desactivación
 * @param {string} options.deactivatedBy - ID del usuario que desactiva
 * 
 * @returns {Promise<Object>} Resultado de la desactivación
 * 
 * @throws {ApiError} 403 - Usuario no tiene permisos
 * @throws {ApiError} 404 - Comité no encontrado
 * @throws {ApiError} 409 - Comité tiene proyectos activos
 */
export const deactivateCommittee = async (committeeId, options = {}) => {
  try {
    // =========================================================================
    // 1. VERIFICAR QUE EL COMITÉ EXISTE
    // =========================================================================
    const existingCommittee = await CommitteeRepository.findById(committeeId);

    if (!existingCommittee || existingCommittee.error) {
      throw ApiError.notFound('Comité no encontrado');
    }

    // =========================================================================
    // 2. VERIFICAR QUE NO TENGA PROYECTOS ACTIVOS
    // =========================================================================
    const activeProjects = await CommitteeRepository.getCommitteeProjects(committeeId, {
      estado: 'activo',
    });

    if (activeProjects && activeProjects.length > 0) {
      throw ApiError.conflict(
        'No se puede desactivar el comité porque tiene proyectos activos. Finaliza o transfiere los proyectos primero.'
      );
    }

    // =========================================================================
    // 3. DESACTIVAR COMITÉ (CAMBIAR ESTADO)
    // =========================================================================
    const { error } = await CommitteeRepository.update(committeeId, {
      estado: COMMITTEE_STATUS.INACTIVO,
      modificadoPor: options.deactivatedBy,
      fechaEdicion: new Date().toISOString(),
    });

    if (error) {
      logger.error('Error al desactivar comité', {
        error,
        committeeId,
      });
      throw ApiError.internal('Error al desactivar el comité');
    }

    // =========================================================================
    // 4. REGISTRAR EN LOGS
    // =========================================================================
    logger.info('Comité desactivado exitosamente', {
      committeeId,
      deactivatedBy: options.deactivatedBy,
    });

    // =========================================================================
    // 5. RETORNAR RESULTADO
    // =========================================================================
    return {
      success: true,
      message: 'Comité desactivado exitosamente',
      committeeId,
    };

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error inesperado en deactivateCommittee', {
      error: error.message,
      committeeId,
    });

    throw ApiError.internal('Error al desactivar el comité');
  }
};

/**
 * -----------------------------------------------------------------------------
 * ASIGNAR LÍDER A COMITÉ
 * -----------------------------------------------------------------------------
 * 
 * Caso de Uso: Asignar o cambiar el líder de un comité
 * 
 * @param {string} committeeId - ID del comité
 * @param {string} liderComiteId - ID del nuevo líder
 * @param {Object} options - Opciones de asignación
 * @param {string} options.assignedBy - ID del usuario que asigna
 * 
 * @returns {Promise<Object>} Comité actualizado
 * 
 * @throws {ApiError} 400 - ID del líder no proporcionado
 * @throws {ApiError} 404 - Comité o líder no encontrado
 * @throws {ApiError} 409 - Líder no pertenece a la organización
 */
export const assignLeader = async (committeeId, liderComiteId, options = {}) => {
  try {
    // =========================================================================
    // 1. VALIDAR DATOS
    // =========================================================================
    if (!liderComiteId) {
      throw ApiError.badRequest('ID del líder es requerido');
    }

    // =========================================================================
    // 2. VERIFICAR QUE EL COMITÉ EXISTE
    // =========================================================================
    const committee = await CommitteeRepository.findById(committeeId);

    if (!committee || committee.error) {
      throw ApiError.notFound('Comité no encontrado');
    }

    // =========================================================================
    // 3. VERIFICAR QUE EL LÍDER EXISTE
    // =========================================================================
    const lider = await MemberRepository.findById(liderComiteId);

    if (!lider) {
      throw ApiError.notFound('Líder de comité no encontrado');
    }

    // =========================================================================
    // 4. VERIFICAR QUE EL LÍDER PERTENECE A LA MISMA ORGANIZACIÓN
    // =========================================================================
    if (lider.organizacionId !== committee.data.organizacionId) {
      throw ApiError.conflict(
        'El líder debe pertenecer a la misma organización que el comité'
      );
    }

    // =========================================================================
    // 5. ACTUALIZAR LÍDER DEL COMITÉ
    // =========================================================================
    const { data: updatedCommittee, error } = await CommitteeRepository.update(committeeId, {
      liderComiteId,
      modificadoPor: options.assignedBy,
      fechaEdicion: new Date().toISOString(),
    });

    if (error || !updatedCommittee) {
      logger.error('Error al asignar líder', {
        error,
        committeeId,
        liderComiteId,
      });
      throw ApiError.internal('Error al asignar el líder');
    }

    // =========================================================================
    // 6. REGISTRAR EN LOGS
    // =========================================================================
    logger.info('Líder de comité asignado exitosamente', {
      committeeId,
      liderComiteId,
      assignedBy: options.assignedBy,
    });

    // =========================================================================
    // 7. RETORNAR COMITÉ FORMATEADO
    // =========================================================================
    return formatCommitteeForResponse(updatedCommittee);

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error inesperado en assignLeader', {
      error: error.message,
      committeeId,
      liderComiteId,
    });

    throw ApiError.internal('Error al asignar el líder');
  }
};

/**
 * -----------------------------------------------------------------------------
 * OBTENER ESTADÍSTICAS DE COMITÉ
 * -----------------------------------------------------------------------------
 * 
 * Caso de Uso: Obtener métricas y estadísticas de un comité
 * 
 * @param {string} committeeId - ID del comité
 * @param {Object} currentUser - Usuario que solicita las estadísticas
 * 
 * @returns {Promise<Object>} Estadísticas del comité
 * 
 * @throws {ApiError} 404 - Comité no encontrado
 * @throws {ApiError} 403 - Usuario no tiene permisos
 */
export const getCommitteeStats = async (committeeId, currentUser) => {
  try {
    // =========================================================================
    // 1. VERIFICAR QUE EL COMITÉ EXISTE
    // =========================================================================
    const committee = await CommitteeRepository.findById(committeeId);

    if (!committee || committee.error) {
      throw ApiError.notFound('Comité no encontrado');
    }

    // =========================================================================
    // 2. VERIFICAR PERMISOS
    // =========================================================================
    const isAdmin = [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(currentUser.role);

    if (!isAdmin && currentUser.organizationId !== committee.data.organizacionId) {
      throw ApiError.forbidden('No tienes permisos para ver las estadísticas de este comité');
    }

    // =========================================================================
    // 3. OBTENER ESTADÍSTICAS
    // =========================================================================
    const [proyectos, miembros, horas] = await Promise.all([
      CommitteeRepository.getCommitteeProjects(committeeId),
      CommitteeRepository.getCommitteeMembers(committeeId),
      CommitteeRepository.getCommitteeHours(committeeId),
    ]);

    // =========================================================================
    // 4. CALCULAR MÉTRICAS
    // =========================================================================
    const totalProyectos = proyectos?.length || 0;
    const proyectosActivos = proyectos?.filter(p => p.estado === 'activo').length || 0;
    const totalMiembros = miembros?.length || 0;
    const horasTotales = horas?.reduce((sum, h) => sum + (parseFloat(h.cantidadHoras) || 0), 0) || 0;

    // Obtener presupuesto del comité
    const presupuestoAsignado = parseFloat(committee.data.presupuestoAsignado) || 0;
    const presupuestoUtilizado = 0; // TODO: Calcular desde transacciones financieras
    const presupuestoDisponible = presupuestoAsignado - presupuestoUtilizado;

    // =========================================================================
    // 5. RETORNAR ESTADÍSTICAS
    // =========================================================================
    return {
      totalProyectos,
      proyectosActivos,
      totalMiembros,
      horasTotales,
      presupuestoAsignado,
      presupuestoUtilizado,
      presupuestoDisponible,
      committeeId,
      generatedAt: new Date().toISOString(),
    };

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error inesperado en getCommitteeStats', {
      error: error.message,
      committeeId,
    });

    throw ApiError.internal('Error al obtener las estadísticas');
  }
};

/**
 * -----------------------------------------------------------------------------
 * OBTENER MIEMBROS DE UN COMITÉ
 * -----------------------------------------------------------------------------
 * 
 * @param {string} committeeId - ID del comité
 * @param {Object} pagination - Paginación
 * 
 * @returns {Promise<Object>} Lista de miembros
 */
export const getCommitteeMembers = async (committeeId, pagination = {}) => {
  try {
    const page = Math.max(1, parseInt(pagination.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(pagination.limit) || 10));

    const { data: members, count } = await CommitteeRepository.getCommitteeMembers(committeeId, {
      limit,
      offset: (page - 1) * limit,
    });

    return {
      members: members || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  } catch (error) {
    logger.error('Error en getCommitteeMembers', { error: error.message, committeeId });
    throw ApiError.internal('Error al obtener miembros del comité');
  }
};

/**
 * -----------------------------------------------------------------------------
 * OBTENER PROYECTOS DE UN COMITÉ
 * -----------------------------------------------------------------------------
 * 
 * @param {string} committeeId - ID del comité
 * @param {Object} filters - Filtros de búsqueda
 * @param {Object} pagination - Paginación
 * 
 * @returns {Promise<Object>} Lista de proyectos
 */
export const getCommitteeProjects = async (committeeId, filters = {}, pagination = {}) => {
  try {
    const page = Math.max(1, parseInt(pagination.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(pagination.limit) || 10));

    const { data: projects, count } = await CommitteeRepository.getCommitteeProjects(committeeId, {
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
    logger.error('Error en getCommitteeProjects', { error: error.message, committeeId });
    throw ApiError.internal('Error al obtener proyectos del comité');
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
  createCommittee,
  getAllCommittees,
  getCommitteeById,
  updateCommittee,
  deactivateCommittee,
  assignLeader,
  getCommitteeStats,
  getCommitteeMembers,
  getCommitteeProjects,
};