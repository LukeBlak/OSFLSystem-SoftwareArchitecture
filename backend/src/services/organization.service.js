/**
 * =============================================================================
 * SERVICIO DE ORGANIZACIONES - CAPA DE APLICACIÓN
 * =============================================================================
 * 
 * Propósito (ADR-001):
 * - Implementar la lógica de negocio de los casos de uso de gestión de organizaciones
 * - Coordinar entre controllers y repositories
 * - Validar reglas de negocio específicas de organizaciones
 * - Integrar con Supabase para persistencia de datos
 * 
 * Arquitectura:
 * - Capa: Aplicación (Services)
 * - Patrón: Service Layer + Repository Pattern
 * - Integración: Supabase PostgreSQL
 * 
 * Casos de Uso que implementa:
 * - CU-01: Registrar organización
 * - CU-02: Consultar organizaciones
 * - Actualizar información de organización
 * - Dar de baja organización (soft delete)
 * - Gestionar miembros y comités de la organización
 * 
 * @module services/organization.service
 * @layer Application
 */

import { ApiError } from '../utils/apiError.js';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../utils/logger.js';
import { OrganizationRepository } from '../repositories/OrganizationRepository.js';
import { MemberRepository } from '../repositories/MemberRepository.js';
import { CommitteeRepository } from '../repositories/CommitteeRepository.js';
import { ProjectRepository } from '../repositories/ProjectRepository.js';
import {
  ORGANIZATION_STATUS,
  ORGANIZATION_TYPE,
  validateCreateOrganization,
  validateUpdateOrganization,
  formatOrganizationForResponse,
} from '../models/Organization.js';
import { USER_ROLES } from '../models/User.js';

// =============================================================================
// CONSTANTES Y CONFIGURACIÓN
// =============================================================================

/**
 * Estados válidos de organización para operaciones
 * @constant {Array<string>}
 */
const VALID_STATUSES = Object.values(ORGANIZATION_STATUS);

/**
 * Tipos de organización válidos
 * @constant {Array<string>}
 */
const VALID_TYPES = Object.values(ORGANIZATION_TYPE);

/**
 * Roles que pueden gestionar organizaciones
 * @constant {Array<string>}
 */
const MANAGER_ROLES = [
  USER_ROLES.ADMIN,
  USER_ROLES.SUPER_ADMIN,
  USER_ROLES.LIDER_ORGANIZACION,
];

/**
 * Roles que pueden ver organizaciones
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
 * CREAR ORGANIZACIÓN (CU-01)
 * -----------------------------------------------------------------------------
 * 
 * Caso de Uso: Registrar una nueva organización en el sistema
 * 
 * @param {Object} organizationData - Datos de la organización a crear
 * @param {string} organizationData.nombre - Nombre de la organización
 * @param {string} [organizationData.tipo] - Tipo de organización
 * @param {string} [organizationData.descripcion] - Descripción de la organización
 * @param {string} [organizationData.direccion] - Dirección física
 * @param {string} [organizationData.telefono] - Teléfono de contacto
 * @param {string} [organizationData.email] - Email de contacto
 * @param {string} [organizationData.estado] - Estado inicial
 * @param {string} creadoPor - ID del usuario que crea la organización
 * 
 * @returns {Promise<Object>} Organización creada
 * 
 * @throws {ApiError} 400 - Datos inválidos
 * @throws {ApiError} 403 - Usuario no tiene permisos
 * @throws {ApiError} 409 - Nombre de organización ya existe
 * 
 * @example
 * const organization = await organizationService.createOrganization({
 *   nombre: 'Asociación de Voluntarios',
 *   tipo: 'ong',
 *   email: 'contacto@asovol.org',
 *   creadoPor: 'uuid-usuario'
 * });
 */
export const createOrganization = async (organizationData) => {
  try {
    // =========================================================================
    // 1. VALIDAR DATOS DE ENTRADA
    // =========================================================================
    const validData = validateCreateOrganization(organizationData);

    // =========================================================================
    // 2. VERIFICAR QUE EL NOMBRE SEA ÚNICO
    // =========================================================================
    const existingOrganization = await OrganizationRepository.findByName(validData.nombre);

    if (existingOrganization) {
      throw ApiError.conflict(
        `Ya existe una organización con el nombre '${validData.nombre}'`,
        {
          code: 'ORGANIZATION_NAME_EXISTS',
          details: {
            field: 'nombre',
            value: validData.nombre,
          },
        }
      );
    }

    // =========================================================================
    // 3. PREPARAR DATOS PARA CREACIÓN
    // =========================================================================
    const organizationToCreate = {
      nombre: validData.nombre,
      tipo: validData.tipo || ORGANIZATION_TYPE.ONG,
      descripcion: validData.descripcion || null,
      direccion: validData.direccion || null,
      telefono: validData.telefono || null,
      email: validData.email || null,
      saldoActual: 0,
      estado: validData.estado || ORGANIZATION_STATUS.ACTIVA,
      creadoPor: organizationData.creadoPor,
    };

    // =========================================================================
    // 4. CREAR ORGANIZACIÓN EN LA BASE DE DATOS
    // =========================================================================
    const { data: organization, error } = await OrganizationRepository.create(organizationToCreate);

    if (error || !organization) {
      logger.error('Error al crear organización', {
        error,
        nombre: validData.nombre,
        creadoPor: organizationData.creadoPor,
      });
      throw ApiError.internal('Error al crear la organización');
    }

    // =========================================================================
    // 5. REGISTRAR EN LOGS
    // =========================================================================
    logger.info('Organización creada exitosamente', {
      organizationId: organization.id,
      nombre: organization.nombre,
      tipo: organization.tipo,
      creadoPor: organizationData.creadoPor,
    });

    // =========================================================================
    // 6. RETORNAR ORGANIZACIÓN FORMATEADA
    // =========================================================================
    return formatOrganizationForResponse(organization);

  } catch (error) {
    // Si ya es ApiError, propagarlo
    if (error instanceof ApiError) {
      throw error;
    }

    // Loggear error inesperado
    logger.error('Error inesperado en createOrganization', {
      error: error.message,
      stack: error.stack,
      organizationData,
    });

    throw ApiError.internal('Error al crear la organización');
  }
};

/**
 * -----------------------------------------------------------------------------
 * OBTENER TODAS LAS ORGANIZACIONES (CU-02)
 * -----------------------------------------------------------------------------
 * 
 * Caso de Uso: Consultar organizaciones con filtros y paginación
 * 
 * @param {Object} filters - Filtros de búsqueda
 * @param {string} [filters.tipo] - Filtrar por tipo
 * @param {string} [filters.estado] - Filtrar por estado
 * @param {string} [filters.search] - Buscar por nombre o descripción
 * @param {Object} pagination - Configuración de paginación
 * @param {number} pagination.page - Número de página
 * @param {number} pagination.limit - Límite de resultados
 * 
 * @returns {Promise<Object>} Lista de organizaciones con paginación
 * 
 * @throws {ApiError} 400 - Parámetros inválidos
 * @throws {ApiError} 500 - Error al obtener organizaciones
 */
export const getAllOrganizations = async (filters = {}, pagination = {}) => {
  try {
    // =========================================================================
    // 1. VALIDAR FILTROS
    // =========================================================================
    if (filters.tipo && !VALID_TYPES.includes(filters.tipo)) {
      throw ApiError.badRequest(
        `Tipo inválido. Tipos permitidos: ${VALID_TYPES.join(', ')}`,
        {
          code: 'INVALID_ORGANIZATION_TYPE',
          details: {
            provided: filters.tipo,
            allowed: VALID_TYPES,
          },
        }
      );
    }

    if (filters.estado && !VALID_STATUSES.includes(filters.estado)) {
      throw ApiError.badRequest(
        `Estado inválido. Estados permitidos: ${VALID_STATUSES.join(', ')}`,
        {
          code: 'INVALID_ORGANIZATION_STATUS',
          details: {
            provided: filters.estado,
            allowed: VALID_STATUSES,
          },
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
    // 3. OBTENER ORGANIZACIONES DE LA BASE DE DATOS
    // =========================================================================
    const { data: organizations, error, count } = await OrganizationRepository.findAll({
      ...filters,
      limit,
      offset,
    });

    if (error) {
      logger.error('Error al obtener organizaciones', {
        error,
        filters,
        pagination,
      });
      throw ApiError.internal('Error al obtener las organizaciones');
    }

    // =========================================================================
    // 4. CALCULAR METADATOS DE PAGINACIÓN
    // =========================================================================
    const totalPages = Math.ceil((count || 0) / limit);

    // =========================================================================
    // 5. FORMATEAR RESULTADOS
    // =========================================================================
    const formattedOrganizations = organizations.map(org =>
      formatOrganizationForResponse(org)
    );

    // =========================================================================
    // 6. RETORNAR RESULTADOS CON PAGINACIÓN
    // =========================================================================
    return {
      organizations: formattedOrganizations,
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

    logger.error('Error inesperado en getAllOrganizations', {
      error: error.message,
      filters,
      pagination,
    });

    throw ApiError.internal('Error al obtener las organizaciones');
  }
};

/**
 * -----------------------------------------------------------------------------
 * OBTENER ORGANIZACIÓN POR ID
 * -----------------------------------------------------------------------------
 * 
 * Caso de Uso: Consultar detalles completos de una organización
 * 
 * @param {string} organizationId - ID de la organización
 * @param {Object} currentUser - Usuario que solicita la información
 * 
 * @returns {Promise<Object>} Organización con datos relacionados
 * 
 * @throws {ApiError} 400 - ID inválido
 * @throws {ApiError} 403 - Usuario no tiene permisos
 * @throws {ApiError} 404 - Organización no encontrada
 */
export const getOrganizationById = async (organizationId, currentUser) => {
  try {
    // =========================================================================
    // 1. VALIDAR ID
    // =========================================================================
    if (!organizationId) {
      throw ApiError.badRequest('ID de la organización es requerido');
    }

    // =========================================================================
    // 2. OBTENER ORGANIZACIÓN
    // =========================================================================
    const { data: organization, error } = await OrganizationRepository.findById(organizationId);

    if (error || !organization) {
      throw ApiError.notFound('Organización no encontrada');
    }

    // =========================================================================
    // 3. VERIFICAR PERMISOS DE ACCESO
    // =========================================================================
    const isAdmin = [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(currentUser.role);

    if (!isAdmin) {
      // Verificar que el usuario pertenezca a la misma organización
      if (currentUser.organizationId && currentUser.organizationId !== organization.id) {
        // Usuarios solo pueden ver su propia organización o organizaciones públicas
        if (organization.estado !== ORGANIZATION_STATUS.ACTIVA) {
          throw ApiError.forbidden('No tienes permisos para ver esta organización');
        }
      }
    }

    // =========================================================================
    // 4. OBTENER DATOS RELACIONADOS
    // =========================================================================
    const [comites, miembros, proyectos] = await Promise.all([
      OrganizationRepository.getOrganizationCommittees(organizationId),
      OrganizationRepository.getOrganizationMembers(organizationId),
      OrganizationRepository.getOrganizationProjects(organizationId),
    ]);

    // =========================================================================
    // 5. FORMATEAR Y RETORNAR
    // =========================================================================
    return formatOrganizationForResponse({
      ...organization,
      comites: comites || [],
      miembros: miembros || [],
      proyectos: proyectos || [],
    });

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error inesperado en getOrganizationById', {
      error: error.message,
      organizationId,
    });

    throw ApiError.internal('Error al obtener la organización');
  }
};

/**
 * -----------------------------------------------------------------------------
 * ACTUALIZAR ORGANIZACIÓN
 * -----------------------------------------------------------------------------
 * 
 * Caso de Uso: Actualizar información de una organización existente
 * 
 * @param {string} organizationId - ID de la organización a actualizar
 * @param {Object} updateData - Datos a actualizar
 * @param {Object} options - Opciones de actualización
 * @param {string} options.updatedBy - ID del usuario que actualiza
 * @param {string} options.userRole - Rol del usuario que actualiza
 * 
 * @returns {Promise<Object>} Organización actualizada
 * 
 * @throws {ApiError} 400 - Datos inválidos
 * @throws {ApiError} 403 - Usuario no tiene permisos
 * @throws {ApiError} 404 - Organización no encontrada
 * @throws {ApiError} 409 - Nuevo nombre ya existe
 */
export const updateOrganization = async (organizationId, updateData, options = {}) => {
  try {
    // =========================================================================
    // 1. VALIDAR DATOS DE ENTRADA
    // =========================================================================
    const validData = validateUpdateOrganization(updateData);

    // =========================================================================
    // 2. VERIFICAR QUE LA ORGANIZACIÓN EXISTE
    // =========================================================================
    const existingOrganization = await OrganizationRepository.findById(organizationId);

    if (!existingOrganization || existingOrganization.error) {
      throw ApiError.notFound('Organización no encontrada');
    }

    // =========================================================================
    // 3. VERIFICAR PERMISOS DEL USUARIO
    // =========================================================================
    if (!MANAGER_ROLES.includes(options.userRole)) {
      throw ApiError.forbidden('No tienes permisos para actualizar esta organización');
    }

    // =========================================================================
    // 4. VALIDAR UNICIDAD DEL NOMBRE SI SE CAMBIA
    // =========================================================================
    if (validData.nombre && validData.nombre !== existingOrganization.data.nombre) {
      const nameExists = await OrganizationRepository.findByName(validData.nombre);

      if (nameExists && nameExists.id !== organizationId) {
        throw ApiError.conflict(
          `Ya existe una organización con el nombre '${validData.nombre}'`,
          {
            code: 'ORGANIZATION_NAME_EXISTS',
            details: {
              field: 'nombre',
              value: validData.nombre,
            },
          }
        );
      }
    }

    // =========================================================================
    // 5. PREPARAR DATOS PARA ACTUALIZACIÓN
    // =========================================================================
    const organizationToUpdate = {
      ...validData,
      modificadoPor: options.updatedBy,
      fechaEdicion: new Date().toISOString(),
    };

    // =========================================================================
    // 6. ACTUALIZAR EN LA BASE DE DATOS
    // =========================================================================
    const { data: updatedOrganization, error } = await OrganizationRepository.update(
      organizationId,
      organizationToUpdate
    );

    if (error || !updatedOrganization) {
      logger.error('Error al actualizar organización', {
        error,
        organizationId,
        updateData,
      });
      throw ApiError.internal('Error al actualizar la organización');
    }

    // =========================================================================
    // 7. REGISTRAR EN LOGS
    // =========================================================================
    logger.info('Organización actualizada exitosamente', {
      organizationId,
      updatedBy: options.updatedBy,
      changes: Object.keys(validData),
    });

    // =========================================================================
    // 8. RETORNAR ORGANIZACIÓN FORMATEADA
    // =========================================================================
    return formatOrganizationForResponse(updatedOrganization);

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error inesperado en updateOrganization', {
      error: error.message,
      organizationId,
      updateData,
    });

    throw ApiError.internal('Error al actualizar la organización');
  }
};

/**
 * -----------------------------------------------------------------------------
 * DESACTIVAR ORGANIZACIÓN (SOFT DELETE)
 * -----------------------------------------------------------------------------
 * 
 * Caso de Uso: Desactivar una organización sin eliminarla físicamente
 * 
 * @param {string} organizationId - ID de la organización a desactivar
 * @param {Object} options - Opciones de desactivación
 * @param {string} options.deactivatedBy - ID del usuario que desactiva
 * 
 * @returns {Promise<Object>} Resultado de la desactivación
 * 
 * @throws {ApiError} 403 - Usuario no tiene permisos
 * @throws {ApiError} 404 - Organización no encontrada
 * @throws {ApiError} 409 - Organización tiene proyectos activos pendientes
 */
export const deactivateOrganization = async (organizationId, options = {}) => {
  try {
    // =========================================================================
    // 1. VERIFICAR QUE LA ORGANIZACIÓN EXISTE
    // =========================================================================
    const existingOrganization = await OrganizationRepository.findById(organizationId);

    if (!existingOrganization || existingOrganization.error) {
      throw ApiError.notFound('Organización no encontrada');
    }

    // =========================================================================
    // 2. VERIFICAR QUE NO TENGA PROYECTOS ACTIVOS PENDIENTES
    // =========================================================================
    const activeProjects = await OrganizationRepository.getOrganizationProjects(organizationId, {
      estado: 'activo',
    });

    if (activeProjects && activeProjects.length > 0) {
      throw ApiError.conflict(
        'No se puede desactivar la organización porque tiene proyectos activos pendientes. Finaliza o transfiere los proyectos primero.',
        {
          code: 'ACTIVE_PROJECTS_EXIST',
          details: {
            activeProjectsCount: activeProjects.length,
          },
        }
      );
    }

    // =========================================================================
    // 3. DESACTIVAR ORGANIZACIÓN (CAMBIAR ESTADO)
    // =========================================================================
    const { error } = await OrganizationRepository.update(organizationId, {
      estado: ORGANIZATION_STATUS.INACTIVA,
      modificadoPor: options.deactivatedBy,
      fechaEdicion: new Date().toISOString(),
    });

    if (error) {
      logger.error('Error al desactivar organización', {
        error,
        organizationId,
      });
      throw ApiError.internal('Error al desactivar la organización');
    }

    // =========================================================================
    // 4. REGISTRAR EN LOGS
    // =========================================================================
    logger.info('Organización desactivada exitosamente', {
      organizationId,
      deactivatedBy: options.deactivatedBy,
      organizationName: existingOrganization.data.nombre,
    });

    // =========================================================================
    // 5. RETORNAR RESULTADO
    // =========================================================================
    return {
      success: true,
      message: 'Organización desactivada exitosamente',
      organizationId,
    };

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error inesperado en deactivateOrganization', {
      error: error.message,
      organizationId,
    });

    throw ApiError.internal('Error al desactivar la organización');
  }
};

/**
 * -----------------------------------------------------------------------------
 * OBTENER ESTADÍSTICAS DE ORGANIZACIÓN
 * -----------------------------------------------------------------------------
 * 
 * Caso de Uso: Obtener métricas y estadísticas de una organización
 * 
 * @param {string} organizationId - ID de la organización
 * @param {Object} currentUser - Usuario que solicita las estadísticas
 * 
 * @returns {Promise<Object>} Estadísticas de la organización
 * 
 * @throws {ApiError} 404 - Organización no encontrada
 * @throws {ApiError} 403 - Usuario no tiene permisos
 */
export const getOrganizationStats = async (organizationId, currentUser) => {
  try {
    // =========================================================================
    // 1. VERIFICAR QUE LA ORGANIZACIÓN EXISTE
    // =========================================================================
    const organization = await OrganizationRepository.findById(organizationId);

    if (!organization || organization.error) {
      throw ApiError.notFound('Organización no encontrada');
    }

    // =========================================================================
    // 2. VERIFICAR PERMISOS
    // =========================================================================
    const isAdmin = [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(currentUser.role);

    if (!isAdmin && currentUser.organizationId !== organizationId) {
      throw ApiError.forbidden('No tienes permisos para ver las estadísticas de esta organización');
    }

    // =========================================================================
    // 3. OBTENER ESTADÍSTICAS
    // =========================================================================
    const [comites, miembros, proyectos, finanzas] = await Promise.all([
      OrganizationRepository.getOrganizationCommittees(organizationId),
      OrganizationRepository.getOrganizationMembers(organizationId),
      OrganizationRepository.getOrganizationProjects(organizationId),
      OrganizationRepository.getOrganizationFinances(organizationId),
    ]);

    // =========================================================================
    // 4. CALCULAR MÉTRICAS
    // =========================================================================
    const totalComites = comites?.length || 0;
    const totalMiembros = miembros?.length || 0;
    const totalProyectos = proyectos?.length || 0;
    const proyectosActivos = proyectos?.filter(p => p.estado === 'activo').length || 0;

    // Calcular horas totales de todos los miembros
    const horasTotalesRegistradas = miembros?.reduce(
      (sum, m) => sum + (parseFloat(m.horasTotales) || 0),
      0
    ) || 0;

    // Obtener datos financieros
    const saldoActual = parseFloat(organization.data.saldoActual) || 0;
    const ingresosTotales = finanzas?.ingresos?.reduce(
      (sum, i) => sum + (parseFloat(i.monto) || 0),
      0
    ) || 0;
    const egresosTotales = finanzas?.egresos?.reduce(
      (sum, e) => sum + (parseFloat(e.monto) || 0),
      0
    ) || 0;

    // =========================================================================
    // 5. RETORNAR ESTADÍSTICAS
    // =========================================================================
    return {
      totalComites,
      totalMiembros,
      totalProyectos,
      proyectosActivos,
      horasTotalesRegistradas,
      saldoActual,
      ingresosTotales,
      egresosTotales,
      organizationId,
      generatedAt: new Date().toISOString(),
    };

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error inesperado en getOrganizationStats', {
      error: error.message,
      organizationId,
    });

    throw ApiError.internal('Error al obtener las estadísticas');
  }
};

/**
 * -----------------------------------------------------------------------------
 * OBTENER MIEMBROS DE UNA ORGANIZACIÓN
 * -----------------------------------------------------------------------------
 * 
 * @param {string} organizationId - ID de la organización
 * @param {Object} filters - Filtros de búsqueda
 * @param {Object} pagination - Paginación
 * @param {Object} currentUser - Usuario que solicita la información
 * 
 * @returns {Promise<Object>} Lista de miembros de la organización
 */
export const getOrganizationMembers = async (organizationId, filters = {}, pagination = {}, currentUser) => {
  try {
    // Verificar permisos
    const organization = await OrganizationRepository.findById(organizationId);
    if (!organization || organization.error) {
      throw ApiError.notFound('Organización no encontrada');
    }

    const isAdmin = [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(currentUser.role);
    if (!isAdmin && currentUser.organizationId !== organizationId) {
      throw ApiError.forbidden('No tienes permisos para ver los miembros de esta organización');
    }

    const page = Math.max(1, parseInt(pagination.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(pagination.limit) || 10));

    const { data: members, count } = await OrganizationRepository.getOrganizationMembers(organizationId, {
      ...filters,
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
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error en getOrganizationMembers', { error: error.message, organizationId });
    throw ApiError.internal('Error al obtener miembros de la organización');
  }
};

/**
 * -----------------------------------------------------------------------------
 * OBTENER COMITÉS DE UNA ORGANIZACIÓN
 * -----------------------------------------------------------------------------
 * 
 * @param {string} organizationId - ID de la organización
 * @param {Object} filters - Filtros de búsqueda
 * @param {Object} pagination - Paginación
 * @param {Object} currentUser - Usuario que solicita la información
 * 
 * @returns {Promise<Object>} Lista de comités de la organización
 */
export const getOrganizationCommittees = async (organizationId, filters = {}, pagination = {}, currentUser) => {
  try {
    // Verificar permisos
    const organization = await OrganizationRepository.findById(organizationId);
    if (!organization || organization.error) {
      throw ApiError.notFound('Organización no encontrada');
    }

    const isAdmin = [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(currentUser.role);
    if (!isAdmin && currentUser.organizationId !== organizationId) {
      throw ApiError.forbidden('No tienes permisos para ver los comités de esta organización');
    }

    const page = Math.max(1, parseInt(pagination.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(pagination.limit) || 10));

    const { data: committees, count } = await OrganizationRepository.getOrganizationCommittees(organizationId, {
      ...filters,
      limit,
      offset: (page - 1) * limit,
    });

    return {
      committees: committees || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error en getOrganizationCommittees', { error: error.message, organizationId });
    throw ApiError.internal('Error al obtener comités de la organización');
  }
};

/**
 * -----------------------------------------------------------------------------
 * OBTENER PROYECTOS DE UNA ORGANIZACIÓN
 * -----------------------------------------------------------------------------
 * 
 * @param {string} organizationId - ID de la organización
 * @param {Object} filters - Filtros de búsqueda
 * @param {Object} pagination - Paginación
 * @param {Object} currentUser - Usuario que solicita la información
 * 
 * @returns {Promise<Object>} Lista de proyectos de la organización
 */
export const getOrganizationProjects = async (organizationId, filters = {}, pagination = {}, currentUser) => {
  try {
    // Verificar permisos
    const organization = await OrganizationRepository.findById(organizationId);
    if (!organization || organization.error) {
      throw ApiError.notFound('Organización no encontrada');
    }

    const isAdmin = [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(currentUser.role);
    if (!isAdmin && currentUser.organizationId !== organizationId) {
      throw ApiError.forbidden('No tienes permisos para ver los proyectos de esta organización');
    }

    const page = Math.max(1, parseInt(pagination.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(pagination.limit) || 10));

    const { data: projects, count } = await OrganizationRepository.getOrganizationProjects(organizationId, {
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
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error en getOrganizationProjects', { error: error.message, organizationId });
    throw ApiError.internal('Error al obtener proyectos de la organización');
  }
};

/**
 * -----------------------------------------------------------------------------
 * OBTENER FINANZAS DE UNA ORGANIZACIÓN
 * -----------------------------------------------------------------------------
 * 
 * @param {string} organizationId - ID de la organización
 * @param {Object} filters - Filtros de búsqueda
 * @param {Object} currentUser - Usuario que solicita la información
 * 
 * @returns {Promise<Object>} Resumen financiero de la organización
 */
export const getOrganizationFinances = async (organizationId, filters = {}, currentUser) => {
  try {
    // Verificar permisos (solo admins y líderes de organización)
    const organization = await OrganizationRepository.findById(organizationId);
    if (!organization || organization.error) {
      throw ApiError.notFound('Organización no encontrada');
    }

    const allowedRoles = [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.LIDER_ORGANIZACION];
    if (!allowedRoles.includes(currentUser.role) && currentUser.organizationId !== organizationId) {
      throw ApiError.forbidden('No tienes permisos para ver las finanzas de esta organización');
    }

    const finances = await OrganizationRepository.getOrganizationFinances(organizationId, filters);

    return {
      organizationId,
      saldoActual: parseFloat(organization.data.saldoActual) || 0,
      ingresos: finances?.ingresos || [],
      egresos: finances?.egresos || [],
      totalIngresos: finances?.totalIngresos || 0,
      totalEgresos: finances?.totalEgresos || 0,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error en getOrganizationFinances', { error: error.message, organizationId });
    throw ApiError.internal('Error al obtener finanzas de la organización');
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
  createOrganization,
  getAllOrganizations,
  getOrganizationById,
  updateOrganization,
  deactivateOrganization,
  getOrganizationStats,
  getOrganizationMembers,
  getOrganizationCommittees,
  getOrganizationProjects,
  getOrganizationFinances,
};