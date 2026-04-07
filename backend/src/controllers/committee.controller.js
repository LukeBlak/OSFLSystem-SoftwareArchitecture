/**
 * =============================================================================
 * CONTROLADOR DE COMITÉS - CAPA DE PRESENTACIÓN
 * =============================================================================
 * 
 * Propósito (ADR-001):
 * - Manejar todas las peticiones HTTP relacionadas con la gestión de comités
 * - Coordinar con la capa de aplicación (services) para implementar casos de uso
 * - Validar datos de entrada y formatear respuestas estandarizadas
 * - Implementar control de acceso basado en roles para operaciones de comités
 * 
 * Arquitectura:
 * - Capa: Presentación (Controladores)
 * - Patrón: MVC Controller
 * - Integración: Supabase (PostgreSQL + Auth)
 * 
 * Casos de Uso que implementa:
 * - CU-08: Crear comités
 * - Consultar comités de una organización
 * - Actualizar información de comités
 * - Dar de baja comités (soft delete)
 * - Asignar líder a comité
 * 
 * @module controllers/committee.controller
 * @layer Presentation
 */

import { StatusCodes } from 'http-status-codes';
import committeeService from '../services/committee.service.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { supabaseAdmin } from '../config/supabase.js';
import { USER_ROLES } from '../models/User.js';

const assertCommitteeAccessForLeader = async (user, committeeId) => {
  if (String(user?.role || '').toLowerCase() !== USER_ROLES.LIDER_COMITE) {
    return;
  }

  const { data: committee, error } = await supabaseAdmin
    .from('comite')
    .select('id, lidercomiteid')
    .eq('id', committeeId)
    .limit(1)
    .maybeSingle();

  if (error || !committee) {
    throw ApiError.notFound('Comité no encontrado');
  }

  if (committee.lidercomiteid !== user.id) {
    throw ApiError.forbidden('Solo puedes gestionar tu propio comité');
  }
};

const resolveOrganizationIdForUser = async (user) => {
  const direct = user?.organizationId
    || user?.organizacionId
    || user?.organization_id
    || user?.organizacion_id
    || null;

  if (direct) return direct;

  if (user?.id) {
    const { data, error } = await supabaseAdmin
      .from('lider_organizacion')
      .select('organizacionid')
      .eq('id', user.id)
      .limit(1)
      .maybeSingle();

    if (!error && data?.organizacionid) {
      return data.organizacionid;
    }

    // Fallback: líderes de comité pueden derivar su asociación desde comite.lidercomiteid
    const { data: liderComiteRecord, error: liderComiteError } = await supabaseAdmin
      .from('comite')
      .select('organizacionid')
      .eq('lidercomiteid', user.id)
      .limit(1)
      .maybeSingle();

    if (!liderComiteError && liderComiteRecord?.organizacionid) {
      return liderComiteRecord.organizacionid;
    }

    // Fallback: miembros pueden derivar su asociación por vínculo miembro_comite -> comite
    const { data: memberCommittee, error: memberCommitteeError } = await supabaseAdmin
      .from('miembro_comite')
      .select('comiteid')
      .eq('miembroid', user.id)
      .limit(1)
      .maybeSingle();

    if (!memberCommitteeError && memberCommittee?.comiteid) {
      const { data: committee, error: committeeError } = await supabaseAdmin
        .from('comite')
        .select('organizacionid')
        .eq('id', memberCommittee.comiteid)
        .limit(1)
        .maybeSingle();

      if (!committeeError && committee?.organizacionid) {
        return committee.organizacionid;
      }
    }
  }

  return null;
};

// =============================================================================
// FUNCIONES DEL CONTROLADOR
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * CREAR COMITÉ (CU-08)
 * -----------------------------------------------------------------------------
 * 
 * Permite crear un nuevo comité dentro de una organización.
 * Solo usuarios con rol de líder de organización o administrador pueden crear comités.
 * 
 * @route POST /api/committees
 * @access Privado (requiere autenticación + rol: lider_organizacion, admin)
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} req.body - Datos del comité a crear
 * @param {string} req.body.nombre - Nombre del comité (requerido, único por organización)
 * @param {string} [req.body.areaResponsabilidad] - Área de responsabilidad del comité
 * @param {string} [req.body.descripcion] - Descripción detallada del comité
 * @param {string} [req.body.estado] - Estado inicial del comité (activo, inactivo)
 * @param {number} [req.body.presupuestoAsignado] - Presupuesto asignado al comité
 * @param {string} req.body.organizacionId - ID de la organización propietaria
 * @param {string} [req.body.liderComiteId] - ID del líder asignado al comité
 * @param {Object} req.user - Usuario autenticado (inyectado por middleware)
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express para manejo de errores
 * 
 * @returns {Object} Respuesta con datos del comité creado
 * 
 * @throws {ApiError} 400 - Si los datos son inválidos o faltan campos requeridos
 * @throws {ApiError} 403 - Si el usuario no tiene permisos para crear comités
 * @throws {ApiError} 404 - Si la organización no existe
 * @throws {ApiError} 409 - Si ya existe un comité con el mismo nombre en la organización
 * 
 * @example
 * // Request
 * POST /api/committees
 * Authorization: Bearer <token>
 * {
 *   "nombre": "Comité de Marketing",
 *   "areaResponsabilidad": "Comunicación y redes sociales",
 *   "descripcion": "Encargado de la promoción de eventos",
 *   "estado": "activo",
 *   "presupuestoAsignado": 5000,
 *   "organizacionId": "uuid-organizacion",
 *   "liderComiteId": "uuid-lider"
 * }
 * 
 * @example
 * // Response (201 Created)
 * {
 *   "success": true,
 *   "data": {
 *     "committee": {
 *       "id": "uuid-comite",
 *       "nombre": "Comité de Marketing",
 *       "areaResponsabilidad": "Comunicación y redes sociales",
 *       "estado": "activo",
 *       "organizacionId": "uuid-organizacion",
 *       "createdAt": "2026-02-03T10:00:00.000Z"
 *     }
 *   },
 *   "message": "Comité creado exitosamente"
 * }
 */
export const createCommittee = async (req, res, next) => {
  try {
    // =========================================================================
    // 1. EXTRAER DATOS DEL BODY
    // =========================================================================
    const {
      nombre,
      areaResponsabilidad,
      descripcion,
      estado,
      presupuestoAsignado,
      organizacionId,
      liderComiteId,
    } = req.body;

    // =========================================================================
    // 2. VALIDAR CAMPOS REQUERIDOS
    // =========================================================================
    const effectiveOrganizationId = organizacionId || await resolveOrganizationIdForUser(req.user);
    const creatorUserId = req.user?.id || req.authContext?.userId || null;

    if (!nombre || !effectiveOrganizationId) {
      throw ApiError.badRequest('Nombre y organización son requeridos', {
        missingFields: {
          nombre: !nombre,
          organizacionId: !effectiveOrganizationId,
        },
      });
    }

    // =========================================================================
    // 3. VALIDAR PERMISOS DEL USUARIO
    // =========================================================================
    // El middleware de autenticación ya verificó que el usuario está logueado
    // Aquí verificamos que tenga el rol adecuado para crear comités
    const allowedRoles = ['admin', 'lider_organizacion', 'organizacion'];
    
    if (!allowedRoles.includes(req.user.role)) {
      throw ApiError.forbidden(
        'No tienes permisos para crear comités. Roles requeridos: admin, lider_organizacion'
      );
    }

    // =========================================================================
    // 4. LLAMAR AL SERVICIO DE CREACIÓN
    // =========================================================================
    // El servicio se encarga de:
    // - Validar que la organización existe
    // - Verificar unicidad del nombre del comité por organización
    // - Validar que el líder existe (si se proporciona)
    // - Crear el registro en la base de datos
    const committee = await committeeService.createCommittee({
      nombre,
      areaResponsabilidad,
      descripcion,
      estado: estado || 'activo',
      presupuestoAsignado: presupuestoAsignado || 0,
      organizacionId: effectiveOrganizationId,
      liderComiteId,
      creadoPor: creatorUserId,
    });

    // =========================================================================
    // 5. RETORNAR RESPUESTA EXITOSA
    // =========================================================================
    return res.status(StatusCodes.CREATED).json(
      new ApiResponse(
        StatusCodes.CREATED,
        {
          committee: {
            id: committee.id,
            nombre: committee.nombre,
            areaResponsabilidad: committee.areaResponsabilidad,
            descripcion: committee.descripcion,
            estado: committee.estado,
            presupuestoAsignado: committee.presupuestoAsignado,
            organizacionId: committee.organizacionId,
            liderComiteId: committee.liderComiteId,
            creadoPor: committee.creadoPor,
            createdAt: committee.fechaCreacion,
          },
        },
        'Comité creado exitosamente'
      )
    );
  } catch (error) {
    // Pasar errores al middleware de manejo de errores
    next(error);
  }
};

/**
 * -----------------------------------------------------------------------------
 * OBTENER TODOS LOS COMITÉS
 * -----------------------------------------------------------------------------
 * 
 * Obtiene la lista de todos los comités del sistema.
 * Puede filtrarse por organización, estado u otros parámetros.
 * 
 * @route GET /api/committees
 * @access Privado (requiere autenticación)
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} req.query - Parámetros de consulta
 * @param {string} [req.query.organizacionId] - Filtrar por organización
 * @param {string} [req.query.estado] - Filtrar por estado (activo, inactivo)
 * @param {number} [req.query.page] - Número de página para paginación
 * @param {number} [req.query.limit] - Límite de resultados por página
 * @param {Object} req.user - Usuario autenticado
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express
 * 
 * @returns {Object} Respuesta con lista de comités y metadata de paginación
 * 
 * @example
 * // Request
 * GET /api/committees?organizacionId=uuid&estado=activo&page=1&limit=10
 * Authorization: Bearer <token>
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
 *       "total": 25,
 *       "totalPages": 3
 *     }
 *   },
 *   "message": "Comités obtenidos exitosamente"
 * }
 */
export const getAllCommittees = async (req, res, next) => {
  try {
    // =========================================================================
    // 1. EXTRAER PARÁMETROS DE CONSULTA
    // =========================================================================
    const {
      organizacionId,
      estado,
      page = '1',
      limit = '10',
    } = req.query;

    const userOrganizationId = req.user?.organizationId || await resolveOrganizationIdForUser(req.user);
    const resolvedOrganizationId = organizacionId || userOrganizationId;

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

    if (!resolvedOrganizationId) {
      throw ApiError.badRequest('La consulta de comités requiere una organización válida');
    }

    if (organizacionId && userOrganizationId && organizacionId !== userOrganizationId) {
      throw ApiError.forbidden('No tienes permisos para consultar comités de otra asociación');
    }

    // =========================================================================
    // 3. PREPARAR FILTROS DE BÚSQUEDA
    // =========================================================================
    const filters = {
      organizacionId: resolvedOrganizationId,
      estado: estado || null,
      liderComiteId: req.user?.role === USER_ROLES.LIDER_COMITE ? req.user.id : null,
    };

    const pagination = {
      page: pageNum,
      limit: limitNum,
    };

    // =========================================================================
    // 4. LLAMAR AL SERVICIO DE OBTENCIÓN
    // =========================================================================
    const result = await committeeService.getAllCommittees(filters, pagination);

    // =========================================================================
    // 5. RETORNAR RESPUESTA EXITOSA
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
            organizacionId: committee.organizacionId,
            createdAt: committee.fechaCreacion,
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

/**
 * -----------------------------------------------------------------------------
 * OBTENER COMITÉ POR ID
 * -----------------------------------------------------------------------------
 * 
 * Obtiene los detalles completos de un comité específico.
 * 
 * @route GET /api/committees/:id
 * @access Privado (requiere autenticación)
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {string} req.params.id - ID del comité a consultar
 * @param {Object} req.user - Usuario autenticado
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express
 * 
 * @returns {Object} Respuesta con datos completos del comité
 * 
 * @throws {ApiError} 404 - Si el comité no existe
 * @throws {ApiError} 403 - Si el usuario no tiene permisos para ver este comité
 * 
 * @example
 * // Request
 * GET /api/committees/uuid-comite
 * Authorization: Bearer <token>
 * 
 * @example
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": {
 *     "committee": {
 *       "id": "uuid-comite",
 *       "nombre": "Comité de Marketing",
 *       "areaResponsabilidad": "Comunicación",
 *       "descripcion": "Encargado de promoción",
 *       "estado": "activo",
 *       "presupuestoAsignado": 5000,
 *       "organizacion": {...},
 *       "lider": {...},
 *       "proyectos": [...],
 *       "createdAt": "2026-02-03T10:00:00.000Z",
 *       "updatedAt": "2026-02-03T10:00:00.000Z"
 *     }
 *   },
 *   "message": "Comité obtenido exitosamente"
 * }
 */
export const getCommitteeById = async (req, res, next) => {
  try {
    // =========================================================================
    // 1. EXTRAER ID DE LOS PARÁMETROS
    // =========================================================================
    const { id } = req.params;

    // =========================================================================
    // 2. VALIDAR FORMATO DEL ID
    // =========================================================================
    if (!id) {
      throw ApiError.badRequest('ID del comité es requerido');
    }

    await assertCommitteeAccessForLeader(req.user, id);

    // =========================================================================
    // 3. LLAMAR AL SERVICIO DE OBTENCIÓN POR ID
    // =========================================================================
    // El servicio se encarga de:
    // - Validar que el comité existe
    // - Verificar permisos del usuario
    // - Obtener datos relacionados (organización, líder, proyectos)
    const committee = await committeeService.getCommitteeById(id, req.user);

    // =========================================================================
    // 4. RETORNAR RESPUESTA EXITOSA
    // =========================================================================
    return res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        {
          committee: {
            id: committee.id,
            nombre: committee.nombre,
            areaResponsabilidad: committee.areaResponsabilidad,
            descripcion: committee.descripcion,
            estado: committee.estado,
            presupuestoAsignado: committee.presupuestoAsignado,
            organizacionId: committee.organizacionId,
            liderComiteId: committee.liderComiteId || committee.lidercomiteid || committee.lider_comite_id || null,
            organizacion: committee.organizacion,
            lider: committee.lider,
            proyectos: committee.proyectos,
            createdAt: committee.fechaCreacion,
            updatedAt: committee.fechaEdicion,
          },
        },
        'Comité obtenido exitosamente'
      )
    );
  } catch (error) {
    // Pasar errores al middleware de manejo de errores
    next(error);
  }
};

/**
 * -----------------------------------------------------------------------------
 * ACTUALIZAR COMITÉ
 * -----------------------------------------------------------------------------
 * 
 * Actualiza la información de un comité existente.
 * Solo el líder de la organización o administradores pueden actualizar comités.
 * 
 * @route PUT /api/committees/:id
 * @access Privado (requiere autenticación + rol: lider_organizacion, admin)
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {string} req.params.id - ID del comité a actualizar
 * @param {Object} req.body - Datos a actualizar
 * @param {string} [req.body.nombre] - Nuevo nombre del comité
 * @param {string} [req.body.areaResponsabilidad] - Nueva área de responsabilidad
 * @param {string} [req.body.descripcion] - Nueva descripción
 * @param {string} [req.body.estado] - Nuevo estado
 * @param {number} [req.body.presupuestoAsignado] - Nuevo presupuesto
 * @param {string} [req.body.liderComiteId] - Nuevo líder del comité
 * @param {Object} req.user - Usuario autenticado
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express
 * 
 * @returns {Object} Respuesta con datos del comité actualizado
 * 
 * @throws {ApiError} 400 - Si los datos son inválidos
 * @throws {ApiError} 403 - Si el usuario no tiene permisos
 * @throws {ApiError} 404 - Si el comité no existe
 * @throws {ApiError} 409 - Si el nuevo nombre ya existe en la organización
 * 
 * @example
 * // Request
 * PUT /api/committees/uuid-comite
 * Authorization: Bearer <token>
 * {
 *   "nombre": "Comité de Marketing Digital",
 *   "presupuestoAsignado": 7500
 * }
 * 
 * @example
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": {
 *     "committee": {
 *       "id": "uuid-comite",
 *       "nombre": "Comité de Marketing Digital",
 *       "presupuestoAsignado": 7500,
 *       "updatedAt": "2026-02-03T11:00:00.000Z"
 *     }
 *   },
 *   "message": "Comité actualizado exitosamente"
 * }
 */
export const updateCommittee = async (req, res, next) => {
  try {
    // =========================================================================
    // 1. EXTRAER ID Y DATOS DEL BODY
    // =========================================================================
    const { id } = req.params;
    const {
      nombre,
      areaResponsabilidad,
      descripcion,
      estado,
      presupuestoAsignado,
      liderComiteId,
    } = req.body;

    // =========================================================================
    // 2. VALIDAR QUE HAY DATOS PARA ACTUALIZAR
    // =========================================================================
    const updateData = {
      nombre,
      areaResponsabilidad,
      descripcion,
      estado,
      presupuestoAsignado,
      liderComiteId,
    };

    const hasUpdates = Object.values(updateData).some((val) => val !== undefined);
    
    if (!hasUpdates) {
      throw ApiError.badRequest('Debes proporcionar al menos un campo para actualizar');
    }

    // =========================================================================
    // 3. VALIDAR PERMISOS DEL USUARIO
    // =========================================================================
    const allowedRoles = ['admin', 'lider_organizacion', 'organizacion'];
    
    if (!allowedRoles.includes(req.user.role)) {
      throw ApiError.forbidden(
        'No tienes permisos para actualizar comités'
      );
    }

    // =========================================================================
    // 4. LLAMAR AL SERVICIO DE ACTUALIZACIÓN
    // =========================================================================
    // El servicio se encarga de:
    // - Validar que el comité existe
    // - Verificar permisos del usuario sobre este comité
    // - Validar unicidad del nombre si se cambia
    // - Validar que el nuevo líder existe (si se proporciona)
    // - Actualizar el registro en la base de datos
    const committee = await committeeService.updateCommittee(id, updateData, {
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
          committee: {
            id: committee.id,
            nombre: committee.nombre,
            areaResponsabilidad: committee.areaResponsabilidad,
            estado: committee.estado,
            presupuestoAsignado: committee.presupuestoAsignado,
            updatedAt: committee.fechaEdicion,
          },
        },
        'Comité actualizado exitosamente'
      )
    );
  } catch (error) {
    // Pasar errores al middleware de manejo de errores
    next(error);
  }
};

/**
 * -----------------------------------------------------------------------------
 * DESACTIVAR COMITÉ (SOFT DELETE)
 * -----------------------------------------------------------------------------
 * 
 * Desactiva un comité sin eliminarlo físicamente de la base de datos.
 * Mantiene el historial de proyectos y registros asociados.
 * 
 * @route DELETE /api/committees/:id
 * @access Privado (requiere autenticación + rol: admin, lider_organizacion)
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {string} req.params.id - ID del comité a desactivar
 * @param {Object} req.user - Usuario autenticado
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express
 * 
 * @returns {Object} Respuesta de confirmación
 * 
 * @throws {ApiError} 403 - Si el usuario no tiene permisos
 * @throws {ApiError} 404 - Si el comité no existe
 * @throws {ApiError} 409 - Si el comité tiene proyectos activos
 * 
 * @example
 * // Request
 * DELETE /api/committees/uuid-comite
 * Authorization: Bearer <token>
 * 
 * @example
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": {},
 *   "message": "Comité desactivado exitosamente"
 * }
 */
export const deactivateCommittee = async (req, res, next) => {
  try {
    // =========================================================================
    // 1. EXTRAER ID DE LOS PARÁMETROS
    // =========================================================================
    const { id } = req.params;

    // =========================================================================
    // 2. VALIDAR PERMISOS DEL USUARIO
    // =========================================================================
    const allowedRoles = ['admin', 'lider_organizacion'];
    
    if (!allowedRoles.includes(req.user.role)) {
      throw ApiError.forbidden(
        'No tienes permisos para desactivar comités'
      );
    }

    // =========================================================================
    // 3. LLAMAR AL SERVICIO DE DESACTIVACIÓN
    // =========================================================================
    // El servicio se encarga de:
    // - Validar que el comité existe
    // - Verificar que no tenga proyectos activos (opcional, según regla de negocio)
    // - Cambiar el estado a 'inactivo'
    // - Registrar quién realizó la desactivación
    await committeeService.deactivateCommittee(id, {
      deactivatedBy: req.user.id,
    });

    // =========================================================================
    // 4. RETORNAR RESPUESTA EXITOSA
    // =========================================================================
    return res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        {},
        'Comité desactivado exitosamente'
      )
    );
  } catch (error) {
    // Pasar errores al middleware de manejo de errores
    next(error);
  }
};

/**
 * -----------------------------------------------------------------------------
 * ASIGNAR LÍDER A COMITÉ
 * -----------------------------------------------------------------------------
 * 
 * Asigna o cambia el líder de un comité existente.
 * 
 * @route POST /api/committees/:id/assign-leader
 * @access Privado (requiere autenticación + rol: lider_organizacion, admin)
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {string} req.params.id - ID del comité
 * @param {Object} req.body - Datos de asignación
 * @param {string} req.body.liderComiteId - ID del nuevo líder
 * @param {Object} req.user - Usuario autenticado
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express
 * 
 * @returns {Object} Respuesta con datos del comité actualizado
 * 
 * @throws {ApiError} 400 - Si no se proporciona el ID del líder
 * @throws {ApiError} 404 - Si el comité o líder no existen
 * @throws {ApiError} 403 - Si el usuario no tiene permisos
 * 
 * @example
 * // Request
 * POST /api/committees/uuid-comite/assign-leader
 * Authorization: Bearer <token>
 * {
 *   "liderComiteId": "uuid-lider"
 * }
 * 
 * @example
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": {
 *     "committee": {
 *       "id": "uuid-comite",
 *       "liderComiteId": "uuid-lider",
 *       "updatedAt": "2026-02-03T12:00:00.000Z"
 *     }
 *   },
 *   "message": "Líder asignado exitosamente"
 * }
 */
export const assignLeader = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { liderComiteId } = req.body;

    if (!liderComiteId) {
      throw ApiError.badRequest('ID del líder es requerido');
    }

    const allowedRoles = ['admin', 'lider_organizacion', 'lider_comite'];

    if (!allowedRoles.includes(req.user.role)) {
      throw ApiError.forbidden(
        'No tienes permisos para asignar líderes a comités'
      );
    }

    await assertCommitteeAccessForLeader(req.user, id);

    const committee = await committeeService.assignLeader(supabaseAdmin, id, liderComiteId, {
      assignedBy: req.user.id,
    });

    return res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        {
          committee: {
            id: committee.id,
            liderComiteId: committee.lidercomiteid,
          },
        },
        'Líder asignado exitosamente'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * -----------------------------------------------------------------------------
 * ASIGNAR MIEMBRO A COMITÉ (CU-09)
 * -----------------------------------------------------------------------------
 */
export const addMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { miembroId } = req.body;

    if (!miembroId) throw ApiError.badRequest('ID del miembro es requerido');

    const result = await committeeService.addMemberToCommittee(supabaseAdmin, id, miembroId, {
      assignedBy: req.user.id
    });

    return res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, result, 'Miembro asignado al comité exitosamente')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * -----------------------------------------------------------------------------
 * REMOVER MIEMBRO DE COMITÉ (CU-09)
 * -----------------------------------------------------------------------------
 */
export const removeMember = async (req, res, next) => {
  try {
    const { id, memberId } = req.params;

    await assertCommitteeAccessForLeader(req.user, id);

    await committeeService.removeMemberFromCommittee(supabaseAdmin, id, memberId, {
      removedBy: req.user.id
    });

    return res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, {}, 'Miembro removido del comité exitosamente')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * -----------------------------------------------------------------------------
 * OBTENER ESTADÍSTICAS DE COMITÉ
 * -----------------------------------------------------------------------------
 * 
 * Obtiene estadísticas y métricas de un comité específico.
 * 
 * @route GET /api/committees/:id/stats
 * @access Privado (requiere autenticación)
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {string} req.params.id - ID del comité
 * @param {Object} req.user - Usuario autenticado
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express
 * 
 * @returns {Object} Respuesta con estadísticas del comité
 * 
 * @example
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": {
 *     "stats": {
 *       "totalProyectos": 5,
 *       "proyectosActivos": 3,
 *       "totalMiembros": 15,
 *       "horasTotales": 450,
 *       "presupuestoUtilizado": 3500,
 *       "presupuestoDisponible": 1500
 *     }
 *   },
 *   "message": "Estadísticas obtenidas exitosamente"
 * }
 */
export const getCommitteeStats = async (req, res, next) => {
  try {
    // =========================================================================
    // 1. EXTRAER ID DE LOS PARÁMETROS
    // =========================================================================
    const { id } = req.params;

    await assertCommitteeAccessForLeader(req.user, id);

    // =========================================================================
    // 2. LLAMAR AL SERVICIO DE ESTADÍSTICAS
    // =========================================================================
    const stats = await committeeService.getCommitteeStats(id, req.user);

    // =========================================================================
    // 3. RETORNAR RESPUESTA EXITOSA
    // =========================================================================
    return res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        {
          stats: {
            totalProyectos: stats.totalProyectos,
            proyectosActivos: stats.proyectosActivos,
            totalMiembros: stats.totalMiembros,
            horasTotales: stats.horasTotales,
            presupuestoUtilizado: stats.presupuestoUtilizado,
            presupuestoDisponible: stats.presupuestoDisponible,
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
 * Obtener miembros de un comité (CU-11)
 * 
 * Permite obtener la lista de miembros pertenecientes a un comité.
 * 
 * @route GET /api/committees/:id/members
 * @access Privado (requiere autenticación)
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {string} req.params.id - ID del comité (requerido)
 * @param {number} [req.query.page] - Número de página (default: 1)
 * @param {number} [req.query.limit] - Registros por página (default: 10, máximo 100)
 * @param {Object} req.user - Usuario autenticado (inyectado por middleware)
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express para manejo de errores
 * 
 * @returns {Object} Respuesta con lista de miembros y paginación
 * 
 * @throws {ApiError} 400 - Si el ID no es un UUID válido
 * @throws {ApiError} 404 - Si el comité no existe
 * 
 * @example
 * // Request
 * GET /api/committees/uuid-comite/members?page=1&limit=10
 * Authorization: Bearer <token>
 * 
 * @example
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": {
 *     "miembros": [
 *       {
 *         "id": "uuid-miembro-comite",
 *         "comiteId": "uuid-comite",
 *         "miembroId": "uuid-miembro",
 *         "miembro": {
 *           "id": "uuid-miembro",
 *           "nombre": "Juan Pérez",
 *           "email": "juan@example.com",
 *           "dui": "01234567-8",
 *           "telefono": "7000-0000",
 *           "estadoActivo": true,
 *           "horasTotales": 45.5,
 *           "organizacion": { "nombre": "OSFL XYZ" }
 *         }
 *       },
 *       // ... más miembros ...
 *     ]
 *   },
 *   "pagination": {
 *     "page": 1,
 *     "limit": 10,
 *     "total": 25,
 *     "totalPages": 3
 *   },
 *   "message": "Miembros del comité obtenidos exitosamente"
 * }
 */
export const getCommitteeMembers = async (req, res, next) => {
  try {
    // =========================================================================
    // 1. EXTRAER PARÁMETROS DE LA PETICIÓN
    // =========================================================================
    const { id: committeeId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    await assertCommitteeAccessForLeader(req.user, committeeId);

    // =========================================================================
    // 2. LLAMAR AL SERVICIO
    // =========================================================================
    const result = await committeeService.getCommitteeMembers(
      committeeId,
      { page, limit }
    );

    // =========================================================================
    // 3. RETORNAR RESPUESTA EXITOSA
    // =========================================================================
    return res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        {
          comiteId: committeeId,
          miembros: result.members,
        },
        'Miembros del comité obtenidos exitosamente',
        { pagination: result.pagination }
      )
    );
  } catch (error) {
    // Pasar errores al middleware de manejo de errores
    next(error);
  }
};

export const getCommitteeProjects = async (req, res, next) => {
  try {
    const { id: committeeId } = req.params;
    const { estado, page = 1, limit = 10 } = req.query;

    await assertCommitteeAccessForLeader(req.user, committeeId);

    const result = await committeeService.getCommitteeProjects(
      committeeId,
      { estado: estado || null },
      { page, limit }
    );

    return res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        {
          comiteId: committeeId,
          projects: result.projects,
        },
        'Proyectos del comité obtenidos exitosamente',
        { pagination: result.pagination }
      )
    );
  } catch (error) {
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
 * // En committee.routes.js
 * import committeeController from '../controllers/committee.controller.js';
 * 
 * router.post('/', committeeController.createCommittee);
 * router.get('/', committeeController.getAllCommittees);
 * router.get('/:id', committeeController.getCommitteeById);
 * router.put('/:id', committeeController.updateCommittee);
 * router.delete('/:id', committeeController.deactivateCommittee);
 * router.post('/:id/assign-leader', committeeController.assignLeader);
 * router.get('/:id/stats', committeeController.getCommitteeStats);
 */
export default {
  createCommittee,
  getAllCommittees,
  getCommitteeById,
  updateCommittee,
  deactivateCommittee,
  assignLeader,
  addMember,
  removeMember,
  getCommitteeStats,
  getCommitteeMembers,
  getCommitteeProjects,
};