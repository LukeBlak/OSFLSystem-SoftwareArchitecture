/**
 * =============================================================================
 * CONTROLADOR DE ORGANIZACIONES - CAPA DE PRESENTACIÓN
 * =============================================================================
 * 
 * Propósito (ADR-001):
 * - Manejar todas las peticiones HTTP relacionadas con la gestión de organizaciones
 * - Coordinar con la capa de aplicación (services) para implementar casos de uso
 * - Validar datos de entrada y formatear respuestas estandarizadas
 * - Implementar control de acceso basado en roles para operaciones de organizaciones
 * 
 * Arquitectura:
 * - Capa: Presentación (Controladores)
 * - Patrón: MVC Controller
 * - Integración: Supabase (PostgreSQL + Auth)
 * 
 * Casos de Uso que implementa:
 * - CU-01: Registrar organización
 * - CU-02: Consultar organizaciones
 * - Actualizar información de organización
 * - Dar de baja organización (soft delete)
 * - Consultar detalles de organización específica
 * 
 * @module controllers/organization.controller
 * @layer Presentation
 */

import { StatusCodes } from 'http-status-codes';
import { organizationService } from '../services/organization.service.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';

// =============================================================================
// FUNCIONES DEL CONTROLADOR
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * REGISTRAR ORGANIZACIÓN (CU-01)
 * -----------------------------------------------------------------------------
 * 
 * Permite registrar una nueva organización en el sistema.
 * Solo usuarios con rol de administrador o super_admin pueden registrar organizaciones.
 * 
 * @route POST /api/organizations
 * @access Privado (requiere autenticación + rol: admin, super_admin)
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} req.body - Datos de la organización a registrar
 * @param {string} req.body.nombre - Nombre de la organización (requerido, único)
 * @param {string} [req.body.tipo] - Tipo de organización (ONG, Asociación, Fundación, etc.)
 * @param {string} [req.body.descripcion] - Descripción detallada de la organización
 * @param {string} [req.body.direccion] - Dirección física de la organización
 * @param {string} [req.body.telefono] - Teléfono de contacto
 * @param {string} [req.body.email] - Email de contacto de la organización
 * @param {Object} req.user - Usuario autenticado (inyectado por middleware)
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express para manejo de errores
 * 
 * @returns {Object} Respuesta con datos de la organización creada
 * 
 * @throws {ApiError} 400 - Si los datos son inválidos o faltan campos requeridos
 * @throws {ApiError} 403 - Si el usuario no tiene permisos para registrar organizaciones
 * @throws {ApiError} 409 - Si ya existe una organización con el mismo nombre
 * 
 * @example
 * // Request
 * POST /api/organizations
 * Authorization: Bearer <token>
 * {
 *   "nombre": "Asociación de Voluntarios de El Salvador",
 *   "tipo": "ONG",
 *   "descripcion": "Organización dedicada al voluntariado social",
 *   "direccion": "Calle Principal #123, San Salvador",
 *   "telefono": "+503 2222-0000",
 *   "email": "contacto@asvoluntarios.org"
 * }
 * 
 * @example
 * // Response (201 Created)
 * {
 *   "success": true,
 *   "data": {
 *     "organization": {
 *       "id": "uuid-organizacion",
 *       "nombre": "Asociación de Voluntarios de El Salvador",
 *       "tipo": "ONG",
 *       "descripcion": "Organización dedicada al voluntariado social",
 *       "direccion": "Calle Principal #123, San Salvador",
 *       "telefono": "+503 2222-0000",
 *       "email": "contacto@asvoluntarios.org",
 *       "saldoActual": 0,
 *       "fechaCreacion": "2026-02-03T10:00:00.000Z"
 *     }
 *   },
 *   "message": "Organización registrada exitosamente"
 * }
 */
export const createOrganization = async (req, res, next) => {
  try {
    // =========================================================================
    // 1. EXTRAER DATOS DEL BODY
    // =========================================================================
    const {
      nombre,
      tipo,
      descripcion,
      direccion,
      telefono,
      email,
    } = req.body;

    // =========================================================================
    // 2. VALIDAR CAMPOS REQUERIDOS
    // =========================================================================
    if (!nombre || nombre.trim() === '') {
      throw ApiError.badRequest('Nombre de la organización es requerido');
    }

    // =========================================================================
    // 3. VALIDAR PERMISOS DEL USUARIO
    // =========================================================================
    // Solo administradores y super_admin pueden registrar organizaciones
    const allowedRoles = ['admin', 'super_admin'];
    
    if (!allowedRoles.includes(req.user.role)) {
      throw ApiError.forbidden(
        'No tienes permisos para registrar organizaciones. Roles requeridos: admin, super_admin'
      );
    }

    // =========================================================================
    // 4. LLAMAR AL SERVICIO DE CREACIÓN
    // =========================================================================
    // El servicio se encarga de:
    // - Validar unicidad del nombre de la organización
    // - Validar formato de datos (email, teléfono)
    // - Crear el registro en la base de datos
    // - Asignar el usuario creador como líder de la organización
    const organization = await organizationService.createOrganization({
      nombre,
      tipo: tipo || 'ONG',
      descripcion,
      direccion,
      telefono,
      email,
      creadoPor: req.user.id,
    });

    // =========================================================================
    // 5. RETORNAR RESPUESTA EXITOSA
    // =========================================================================
    return res.status(StatusCodes.CREATED).json(
      new ApiResponse(
        StatusCodes.CREATED,
        {
          organization: {
            id: organization.id,
            nombre: organization.nombre,
            tipo: organization.tipo,
            descripcion: organization.descripcion,
            direccion: organization.direccion,
            telefono: organization.telefono,
            email: organization.email,
            saldoActual: organization.saldoActual,
            fechaCreacion: organization.fechaCreacion,
          },
        },
        'Organización registrada exitosamente'
      )
    );
  } catch (error) {
    // Pasar errores al middleware de manejo de errores
    next(error);
  }
};

/**
 * -----------------------------------------------------------------------------
 * OBTENER TODAS LAS ORGANIZACIONES (CU-02)
 * -----------------------------------------------------------------------------
 * 
 * Obtiene la lista de todas las organizaciones del sistema.
 * Puede filtrarse por tipo, estado u otros parámetros.
 * 
 * @route GET /api/organizations
 * @access Privado (requiere autenticación)
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} req.query - Parámetros de consulta
 * @param {string} [req.query.tipo] - Filtrar por tipo de organización
 * @param {string} [req.query.estado] - Filtrar por estado (activo, inactivo)
 * @param {string} [req.query.search] - Buscar por nombre o descripción
 * @param {number} [req.query.page] - Número de página para paginación
 * @param {number} [req.query.limit] - Límite de resultados por página
 * @param {Object} req.user - Usuario autenticado
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express
 * 
 * @returns {Object} Respuesta con lista de organizaciones y metadata de paginación
 * 
 * @example
 * // Request
 * GET /api/organizations?tipo=ONG&estado=activo&page=1&limit=10
 * Authorization: Bearer <token>
 * 
 * @example
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": {
 *     "organizations": [...],
 *     "pagination": {
 *       "page": 1,
 *       "limit": 10,
 *       "total": 25,
 *       "totalPages": 3
 *     }
 *   },
 *   "message": "Organizaciones obtenidas exitosamente"
 * }
 */
export const getAllOrganizations = async (req, res, next) => {
  try {
    // =========================================================================
    // 1. EXTRAER PARÁMETROS DE CONSULTA
    // =========================================================================
    const {
      tipo,
      estado,
      search,
      page = '1',
      limit = '10',
    } = req.query;

    // =========================================================================
    // 2. VALIDAR PARÁMETROS DE PAGINACIÓN
    // =========================================================================
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (isNaN(pageNum) || pageNum < 1) {
      throw ApiError.badRequest('El número de página debe ser mayor a 0');
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      throw ApiError.badRequest('El límite debe estar entre 1 y 100');
    }

    // =========================================================================
    // 3. PREPARAR FILTROS DE BÚSQUEDA
    // =========================================================================
    const filters = {
      tipo: tipo || null,
      estado: estado || null,
      search: search || null,
    };

    const pagination = {
      page: pageNum,
      limit: limitNum,
    };

    // =========================================================================
    // 4. LLAMAR AL SERVICIO DE OBTENCIÓN
    // =========================================================================
    const result = await organizationService.getAllOrganizations(filters, pagination);

    // =========================================================================
    // 5. RETORNAR RESPUESTA EXITOSA
    // =========================================================================
    return res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        {
          organizations: result.organizations.map((org) => ({
            id: org.id,
            nombre: org.nombre,
            tipo: org.tipo,
            descripcion: org.descripcion,
            direccion: org.direccion,
            telefono: org.telefono,
            email: org.email,
            saldoActual: org.saldoActual,
            fechaCreacion: org.fechaCreacion,
          })),
          pagination: result.pagination,
        },
        'Organizaciones obtenidas exitosamente'
      )
    );
  } catch (error) {
    // Pasar errores al middleware de manejo de errores
    next(error);
  }
};

/**
 * -----------------------------------------------------------------------------
 * OBTENER ORGANIZACIÓN POR ID
 * -----------------------------------------------------------------------------
 * 
 * Obtiene los detalles completos de una organización específica.
 * Incluye información de comités, miembros y proyectos asociados.
 * 
 * @route GET /api/organizations/:id
 * @access Privado (requiere autenticación)
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {string} req.params.id - ID de la organización a consultar
 * @param {Object} req.user - Usuario autenticado
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express
 * 
 * @returns {Object} Respuesta con datos completos de la organización
 * 
 * @throws {ApiError} 404 - Si la organización no existe
 * @throws {ApiError} 403 - Si el usuario no tiene permisos para ver esta organización
 * 
 * @example
 * // Request
 * GET /api/organizations/uuid-organizacion
 * Authorization: Bearer <token>
 * 
 * @example
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": {
 *     "organization": {
 *       "id": "uuid-organizacion",
 *       "nombre": "Asociación de Voluntarios",
 *       "tipo": "ONG",
 *       "descripcion": "Organización dedicada al voluntariado",
 *       "direccion": "Calle Principal #123",
 *       "telefono": "+503 2222-0000",
 *       "email": "contacto@asvoluntarios.org",
 *       "saldoActual": 15000,
 *       "comites": [...],
 *       "miembros": [...],
 *       "proyectos": [...],
 *       "fechaCreacion": "2026-01-01T10:00:00.000Z",
 *       "fechaEdicion": "2026-02-03T10:00:00.000Z"
 *     }
 *   },
 *   "message": "Organización obtenida exitosamente"
 * }
 */
export const getOrganizationById = async (req, res, next) => {
  try {
    // =========================================================================
    // 1. EXTRAER ID DE LOS PARÁMETROS
    // =========================================================================
    const { id } = req.params;

    // =========================================================================
    // 2. VALIDAR FORMATO DEL ID
    // =========================================================================
    if (!id) {
      throw ApiError.badRequest('ID de la organización es requerido');
    }

    // =========================================================================
    // 3. LLAMAR AL SERVICIO DE OBTENCIÓN POR ID
    // =========================================================================
    // El servicio se encarga de:
    // - Validar que la organización existe
    // - Verificar permisos del usuario
    // - Obtener datos relacionados (comités, miembros, proyectos)
    const organization = await organizationService.getOrganizationById(id, req.user);

    // =========================================================================
    // 4. RETORNAR RESPUESTA EXITOSA
    // =========================================================================
    return res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        {
          organization: {
            id: organization.id,
            nombre: organization.nombre,
            tipo: organization.tipo,
            descripcion: organization.descripcion,
            direccion: organization.direccion,
            telefono: organization.telefono,
            email: organization.email,
            saldoActual: organization.saldoActual,
            comites: organization.comites,
            miembros: organization.miembros,
            proyectos: organization.proyectos,
            fechaCreacion: organization.fechaCreacion,
            fechaEdicion: organization.fechaEdicion,
          },
        },
        'Organización obtenida exitosamente'
      )
    );
  } catch (error) {
    // Pasar errores al middleware de manejo de errores
    next(error);
  }
};

/**
 * -----------------------------------------------------------------------------
 * ACTUALIZAR ORGANIZACIÓN
 * -----------------------------------------------------------------------------
 * 
 * Actualiza la información de una organización existente.
 * Solo el líder de la organización o administradores pueden actualizar.
 * 
 * @route PUT /api/organizations/:id
 * @access Privado (requiere autenticación + rol: admin, lider_organizacion)
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {string} req.params.id - ID de la organización a actualizar
 * @param {Object} req.body - Datos a actualizar
 * @param {string} [req.body.nombre] - Nuevo nombre de la organización
 * @param {string} [req.body.tipo] - Nuevo tipo de organización
 * @param {string} [req.body.descripcion] - Nueva descripción
 * @param {string} [req.body.direccion] - Nueva dirección
 * @param {string} [req.body.telefono] - Nuevo teléfono
 * @param {string} [req.body.email] - Nuevo email
 * @param {Object} req.user - Usuario autenticado
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express
 * 
 * @returns {Object} Respuesta con datos de la organización actualizada
 * 
 * @throws {ApiError} 400 - Si los datos son inválidos
 * @throws {ApiError} 403 - Si el usuario no tiene permisos
 * @throws {ApiError} 404 - Si la organización no existe
 * @throws {ApiError} 409 - Si el nuevo nombre ya existe
 * 
 * @example
 * // Request
 * PUT /api/organizations/uuid-organizacion
 * Authorization: Bearer <token>
 * {
 *   "nombre": "Asociación de Voluntarios de El Salvador - Actualizado",
 *   "telefono": "+503 2222-1111"
 * }
 * 
 * @example
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": {
 *     "organization": {
 *       "id": "uuid-organizacion",
 *       "nombre": "Asociación de Voluntarios de El Salvador - Actualizado",
 *       "telefono": "+503 2222-1111",
 *       "fechaEdicion": "2026-02-03T11:00:00.000Z"
 *     }
 *   },
 *   "message": "Organización actualizada exitosamente"
 * }
 */
export const updateOrganization = async (req, res, next) => {
  try {
    // =========================================================================
    // 1. EXTRAER ID Y DATOS DEL BODY
    // =========================================================================
    const { id } = req.params;
    const {
      nombre,
      tipo,
      descripcion,
      direccion,
      telefono,
      email,
    } = req.body;

    // =========================================================================
    // 2. VALIDAR QUE HAY DATOS PARA ACTUALIZAR
    // =========================================================================
    const updateData = {
      nombre,
      tipo,
      descripcion,
      direccion,
      telefono,
      email,
    };

    const hasUpdates = Object.values(updateData).some((val) => val !== undefined);
    
    if (!hasUpdates) {
      throw ApiError.badRequest('Debes proporcionar al menos un campo para actualizar');
    }

    // =========================================================================
    // 3. VALIDAR PERMISOS DEL USUARIO
    // =========================================================================
    const allowedRoles = ['admin', 'super_admin', 'lider_organizacion'];
    
    if (!allowedRoles.includes(req.user.role)) {
      throw ApiError.forbidden(
        'No tienes permisos para actualizar organizaciones'
      );
    }

    // =========================================================================
    // 4. LLAMAR AL SERVICIO DE ACTUALIZACIÓN
    // =========================================================================
    // El servicio se encarga de:
    // - Validar que la organización existe
    // - Verificar permisos del usuario sobre esta organización
    // - Validar unicidad del nombre si se cambia
    // - Actualizar el registro en la base de datos
    const organization = await organizationService.updateOrganization(id, updateData, {
      updatedBy: req.user.id,
      userRole: req.user.role,
    });

    // =========================================================================
    // 5. RETORNAR RESPUESTA EXITOSA
    // =========================================================================
    return res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        {
          organization: {
            id: organization.id,
            nombre: organization.nombre,
            tipo: organization.tipo,
            descripcion: organization.descripcion,
            direccion: organization.direccion,
            telefono: organization.telefono,
            email: organization.email,
            saldoActual: organization.saldoActual,
            fechaEdicion: organization.fechaEdicion,
          },
        },
        'Organización actualizada exitosamente'
      )
    );
  } catch (error) {
    // Pasar errores al middleware de manejo de errores
    next(error);
  }
};

/**
 * -----------------------------------------------------------------------------
 * DESACTIVAR ORGANIZACIÓN (SOFT DELETE)
 * -----------------------------------------------------------------------------
 * 
 * Desactiva una organización sin eliminarla físicamente de la base de datos.
 * Mantiene el historial de proyectos, miembros y transacciones asociadas.
 * 
 * @route DELETE /api/organizations/:id
 * @access Privado (requiere autenticación + rol: admin, super_admin)
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {string} req.params.id - ID de la organización a desactivar
 * @param {Object} req.user - Usuario autenticado
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express
 * 
 * @returns {Object} Respuesta de confirmación
 * 
 * @throws {ApiError} 403 - Si el usuario no tiene permisos
 * @throws {ApiError} 404 - Si la organización no existe
 * @throws {ApiError} 409 - Si la organización tiene proyectos activos pendientes
 * 
 * @example
 * // Request
 * DELETE /api/organizations/uuid-organizacion
 * Authorization: Bearer <token>
 * 
 * @example
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": {},
 *   "message": "Organización desactivada exitosamente"
 * }
 */
export const deactivateOrganization = async (req, res, next) => {
  try {
    // =========================================================================
    // 1. EXTRAER ID DE LOS PARÁMETROS
    // =========================================================================
    const { id } = req.params;

    // =========================================================================
    // 2. VALIDAR PERMISOS DEL USUARIO
    // =========================================================================
    const allowedRoles = ['admin', 'super_admin'];
    
    if (!allowedRoles.includes(req.user.role)) {
      throw ApiError.forbidden(
        'No tienes permisos para desactivar organizaciones'
      );
    }

    // =========================================================================
    // 3. LLAMAR AL SERVICIO DE DESACTIVACIÓN
    // =========================================================================
    // El servicio se encarga de:
    // - Validar que la organización existe
    // - Verificar que no tenga proyectos activos pendientes (opcional)
    // - Cambiar el estado a inactivo
    // - Registrar quién realizó la desactivación
    await organizationService.deactivateOrganization(id, {
      deactivatedBy: req.user.id,
    });

    // =========================================================================
    // 4. RETORNAR RESPUESTA EXITOSA
    // =========================================================================
    return res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        {},
        'Organización desactivada exitosamente'
      )
    );
  } catch (error) {
    // Pasar errores al middleware de manejo de errores
    next(error);
  }
};

/**
 * -----------------------------------------------------------------------------
 * OBTENER ESTADÍSTICAS DE ORGANIZACIÓN
 * -----------------------------------------------------------------------------
 * 
 * Obtiene estadísticas y métricas de una organización específica.
 * 
 * @route GET /api/organizations/:id/stats
 * @access Privado (requiere autenticación)
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {string} req.params.id - ID de la organización
 * @param {Object} req.user - Usuario autenticado
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express
 * 
 * @returns {Object} Respuesta con estadísticas de la organización
 * 
 * @example
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": {
 *     "stats": {
 *       "totalComites": 5,
 *       "totalMiembros": 150,
 *       "totalProyectos": 25,
 *       "proyectosActivos": 10,
 *       "horasTotalesRegistradas": 5000,
 *       "saldoActual": 15000,
 *       "ingresosTotales": 50000,
 *       "egresosTotales": 35000
 *     }
 *   },
 *   "message": "Estadísticas obtenidas exitosamente"
 * }
 */
export const getOrganizationStats = async (req, res, next) => {
  try {
    // =========================================================================
    // 1. EXTRAER ID DE LOS PARÁMETROS
    // =========================================================================
    const { id } = req.params;

    // =========================================================================
    // 2. LLAMAR AL SERVICIO DE ESTADÍSTICAS
    // =========================================================================
    const stats = await organizationService.getOrganizationStats(id, req.user);

    // =========================================================================
    // 3. RETORNAR RESPUESTA EXITOSA
    // =========================================================================
    return res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        {
          stats: {
            totalComites: stats.totalComites,
            totalMiembros: stats.totalMiembros,
            totalProyectos: stats.totalProyectos,
            proyectosActivos: stats.proyectosActivos,
            horasTotalesRegistradas: stats.horasTotalesRegistradas,
            saldoActual: stats.saldoActual,
            ingresosTotales: stats.ingresosTotales,
            egresosTotales: stats.egresosTotales,
          },
        },
        'Estadísticas obtenidas exitosamente'
      )
    );
  } catch (error) {
    // Pasar errores al middleware de manejo de errores
    next(error);
  }
};

/**
 * -----------------------------------------------------------------------------
 * OBTENER MIEMBROS DE UNA ORGANIZACIÓN
 * -----------------------------------------------------------------------------
 * 
 * Obtiene la lista de miembros pertenecientes a una organización.
 * 
 * @route GET /api/organizations/:id/members
 * @access Privado (requiere autenticación)
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {string} req.params.id - ID de la organización
 * @param {Object} req.query - Parámetros de consulta
 * @param {string} [req.query.estadoActivo] - Filtrar por estado (true/false)
 * @param {number} [req.query.page] - Número de página
 * @param {number} [req.query.limit] - Límite de resultados
 * @param {Object} req.user - Usuario autenticado
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express
 * 
 * @returns {Object} Respuesta con lista de miembros
 * 
 * @example
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": {
 *     "members": [...],
 *     "pagination": {
 *       "page": 1,
 *       "limit": 10,
 *       "total": 50,
 *       "totalPages": 5
 *     }
 *   },
 *   "message": "Miembros obtenidos exitosamente"
 * }
 */
export const getOrganizationMembers = async (req, res, next) => {
  try {
    // =========================================================================
    // 1. EXTRAER ID Y PARÁMETROS
    // =========================================================================
    const { id } = req.params;
    const {
      estadoActivo,
      page = '1',
      limit = '10',
    } = req.query;

    // =========================================================================
    // 2. VALIDAR PARÁMETROS DE PAGINACIÓN
    // =========================================================================
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (isNaN(pageNum) || pageNum < 1) {
      throw ApiError.badRequest('El número de página debe ser mayor a 0');
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      throw ApiError.badRequest('El límite debe estar entre 1 y 100');
    }

    // =========================================================================
    // 3. LLAMAR AL SERVICIO DE OBTENCIÓN DE MIEMBROS
    // =========================================================================
    const result = await organizationService.getOrganizationMembers(id, {
      estadoActivo: estadoActivo !== undefined ? estadoActivo === 'true' : null,
      pagination: {
        page: pageNum,
        limit: limitNum,
      },
    }, req.user);

    // =========================================================================
    // 4. RETORNAR RESPUESTA EXITOSA
    // =========================================================================
    return res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        {
          members: result.members.map((member) => ({
            id: member.id,
            dui: member.dui,
            nombre: member.nombre,
            email: member.email,
            telefono: member.telefono,
            estadoActivo: member.estadoActivo,
            horasTotales: member.horasTotales,
          })),
          pagination: result.pagination,
        },
        'Miembros obtenidos exitosamente'
      )
    );
  } catch (error) {
    // Pasar errores al middleware de manejo de errores
    next(error);
  }
};

/**
 * -----------------------------------------------------------------------------
 * OBTENER COMITÉS DE UNA ORGANIZACIÓN
 * -----------------------------------------------------------------------------
 * 
 * Obtiene la lista de comités pertenecientes a una organización.
 * 
 * @route GET /api/organizations/:id/committees
 * @access Privado (requiere autenticación)
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {string} req.params.id - ID de la organización
 * @param {Object} req.query - Parámetros de consulta
 * @param {string} [req.query.estado] - Filtrar por estado
 * @param {number} [req.query.page] - Número de página
 * @param {number} [req.query.limit] - Límite de resultados
 * @param {Object} req.user - Usuario autenticado
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express
 * 
 * @returns {Object} Respuesta con lista de comités
 * 
 * @example
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": {
 *     "committees": [...],
 *     "pagination": {
 *       "page": 1,
 *       "limit": 10,
 *       "total": 5,
 *       "totalPages": 1
 *     }
 *   },
 *   "message": "Comités obtenidos exitosamente"
 * }
 */
export const getOrganizationCommittees = async (req, res, next) => {
  try {
    // =========================================================================
    // 1. EXTRAER ID Y PARÁMETROS
    // =========================================================================
    const { id } = req.params;
    const {
      estado,
      page = '1',
      limit = '10',
    } = req.query;

    // =========================================================================
    // 2. VALIDAR PARÁMETROS DE PAGINACIÓN
    // =========================================================================
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (isNaN(pageNum) || pageNum < 1) {
      throw ApiError.badRequest('El número de página debe ser mayor a 0');
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      throw ApiError.badRequest('El límite debe estar entre 1 y 100');
    }

    // =========================================================================
    // 3. LLAMAR AL SERVICIO DE OBTENCIÓN DE COMITÉS
    // =========================================================================
    const result = await organizationService.getOrganizationCommittees(id, {
      estado: estado || null,
      pagination: {
        page: pageNum,
        limit: limitNum,
      },
    }, req.user);

    // =========================================================================
    // 4. RETORNAR RESPUESTA EXITOSA
    // =========================================================================
    return res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        {
          committees: result.committees.map((committee) => ({
            id: committee.id,
            nombre: committee.nombre,
            areaResponsabilidad: committee.areaResponsabilidad,
            estado: committee.estado,
            presupuestoAsignado: committee.presupuestoAsignado,
            fechaCreacion: committee.fechaCreacion,
          })),
          pagination: result.pagination,
        },
        'Comités obtenidos exitosamente'
      )
    );
  } catch (error) {
    // Pasar errores al middleware de manejo de errores
    next(error);
  }
};

// =============================================================================
// EXPORTACIÓN POR DEFECTO
// =============================================================================

/**
 * Objeto con todas las funciones del controlador
 * para facilitar la importación en las rutas
 * 
 * @example
 * // En organization.routes.js
 * import organizationController from '../controllers/organization.controller.js';
 * 
 * router.post('/', organizationController.createOrganization);
 * router.get('/', organizationController.getAllOrganizations);
 * router.get('/:id', organizationController.getOrganizationById);
 * router.put('/:id', organizationController.updateOrganization);
 * router.delete('/:id', organizationController.deactivateOrganization);
 * router.get('/:id/stats', organizationController.getOrganizationStats);
 * router.get('/:id/members', organizationController.getOrganizationMembers);
 * router.get('/:id/committees', organizationController.getOrganizationCommittees);
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
};