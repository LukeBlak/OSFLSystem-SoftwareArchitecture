/**
 * =============================================================================
 * CONTROLADOR DE MIEMBROS - CAPA DE PRESENTACIÓN
 * =============================================================================
 * 
 * Propósito (ADR-001):
 * - Manejar todas las peticiones HTTP relacionadas con la gestión de miembros/voluntarios
 * - Coordinar con la capa de aplicación (services) para implementar casos de uso
 * - Validar datos de entrada y formatear respuestas estandarizadas
 * - Implementar control de acceso basado en roles para operaciones de miembros
 * 
 * Arquitectura:
 * - Capa: Presentación (Controladores)
 * - Patrón: MVC Controller
 * - Integración: Supabase (PostgreSQL + Auth)
 * 
 * Casos de Uso que implementa:
 * - CU-06: Registrar miembros
 * - CU-07: Dar de baja miembros
 * - Consultar miembros de una organización
 * - Actualizar información de miembros
 * - Consultar historial de horas de un miembro
 * 
 * @module controllers/member.controller
 * @layer Presentation
 */

import { StatusCodes } from 'http-status-codes';
import { memberService } from '../services/member.service.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';

// =============================================================================
// FUNCIONES DEL CONTROLADOR
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * REGISTRAR MIEMBRO (CU-06)
 * -----------------------------------------------------------------------------
 * 
 * Permite registrar un nuevo miembro/voluntario en el sistema.
 * Solo usuarios con rol de líder de organización o administrador pueden registrar miembros.
 * 
 * @route POST /api/members
 * @access Privado (requiere autenticación + rol: lider_organizacion, admin)
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} req.body - Datos del miembro a registrar
 * @param {string} req.body.dui - Documento Único de Identidad (requerido, único)
 * @param {string} req.body.nombre - Nombre completo del miembro (requerido)
 * @param {string} req.body.email - Email del miembro (requerido, único)
 * @param {string} [req.body.telefono] - Teléfono de contacto
 * @param {string} [req.body.fechanacimiento] - Fecha de nacimiento (YYYY-MM-DD)
 * @param {string} [req.body.direccion] - Dirección de residencia
 * @param {string} req.body.organizacionId - ID de la organización a la que pertenece
 * @param {Object} req.user - Usuario autenticado (inyectado por middleware)
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express para manejo de errores
 * 
 * @returns {Object} Respuesta con datos del miembro creado
 * 
 * @throws {ApiError} 400 - Si los datos son inválidos o faltan campos requeridos
 * @throws {ApiError} 403 - Si el usuario no tiene permisos para registrar miembros
 * @throws {ApiError} 404 - Si la organización no existe
 * @throws {ApiError} 409 - Si el DUI o email ya está registrado
 * 
 * @example
 * // Request
 * POST /api/members
 * Authorization: Bearer <token>
 * {
 *   "dui": "01234567-8",
 *   "nombre": "Juan Pérez",
 *   "email": "juan.perez@example.com",
 *   "telefono": "7000-0000",
 *   "fechanacimiento": "1990-05-15",
 *   "direccion": "Calle Principal #123, San Salvador",
 *   "organizacionId": "uuid-organizacion"
 * }
 * 
 * @example
 * // Response (201 Created)
 * {
 *   "success": true,
 *   "data": {
 *     "member": {
 *       "id": "uuid-miembro",
 *       "dui": "01234567-8",
 *       "nombre": "Juan Pérez",
 *       "email": "juan.perez@example.com",
 *       "telefono": "7000-0000",
 *       "estadoActivo": true,
 *       "horasTotales": 0,
 *       "organizacionId": "uuid-organizacion",
 *       "createdAt": "2026-02-03T10:00:00.000Z"
 *     }
 *   },
 *   "message": "Miembro registrado exitosamente"
 * }
 */
export const registerMember = async (req, res, next) => {
  try {
    // =========================================================================
    // 1. EXTRAER DATOS DEL BODY
    // =========================================================================
    const {
      dui,
      nombre,
      email,
      telefono,
      fechanacimiento,
      direccion,
      organizacionId,
    } = req.body;

    // =========================================================================
    // 2. VALIDAR CAMPOS REQUERIDOS
    // =========================================================================
    const requiredFields = {
      dui: !dui || dui.trim() === '',
      nombre: !nombre || nombre.trim() === '',
      email: !email || email.trim() === '',
      organizacionId: !organizacionId,
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([_, isMissing]) => isMissing)
      .map(([field]) => field);

    if (missingFields.length > 0) {
      throw ApiError.badRequest('Campos requeridos faltantes', {
        missingFields,
        requiredFields: ['dui', 'nombre', 'email', 'organizacionId'],
      });
    }

    // =========================================================================
    // 3. VALIDAR FORMATO DE EMAIL
    // =========================================================================
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw ApiError.badRequest('Formato de email inválido');
    }

    // =========================================================================
    // 4. VALIDAR PERMISOS DEL USUARIO
    // =========================================================================
    // Solo líderes de organización y administradores pueden registrar miembros
    const allowedRoles = ['admin', 'lider_organizacion', 'organizacion'];
    
    if (!allowedRoles.includes(req.user.role)) {
      throw ApiError.forbidden(
        'No tienes permisos para registrar miembros. Roles requeridos: admin, lider_organizacion'
      );
    }

    // =========================================================================
    // 5. LLAMAR AL SERVICIO DE REGISTRO
    // =========================================================================
    // El servicio se encarga de:
    // - Validar unicidad de DUI y email
    // - Verificar que la organización existe
    // - Validar que el usuario tiene permisos sobre la organización
    // - Crear el registro en la base de datos
    const member = await memberService.registerMember({
      dui,
      nombre,
      email,
      telefono,
      fechanacimiento,
      direccion,
      organizacionId,
      registradoPor: req.user.id,
    });

    // =========================================================================
    // 6. RETORNAR RESPUESTA EXITOSA
    // =========================================================================
    return res.status(StatusCodes.CREATED).json(
      new ApiResponse(
        StatusCodes.CREATED,
        {
          member: {
            id: member.id,
            dui: member.dui,
            nombre: member.nombre,
            email: member.email,
            telefono: member.telefono,
            fechanacimiento: member.fechanacimiento,
            direccion: member.direccion,
            estadoActivo: member.estadoActivo,
            horasTotales: member.horasTotales,
            organizacionId: member.organizacionId,
            createdAt: member.fechaCreacion,
          },
        },
        'Miembro registrado exitosamente'
      )
    );
  } catch (error) {
    // Pasar errores al middleware de manejo de errores
    next(error);
  }
};

/**
 * -----------------------------------------------------------------------------
 * OBTENER TODOS LOS MIEMBROS
 * -----------------------------------------------------------------------------
 * 
 * Obtiene la lista de todos los miembros del sistema.
 * Puede filtrarse por organización, estado u otros parámetros.
 * 
 * @route GET /api/members
 * @access Privado (requiere autenticación)
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} req.query - Parámetros de consulta
 * @param {string} [req.query.organizacionId] - Filtrar por organización
 * @param {string} [req.query.estadoActivo] - Filtrar por estado (true/false)
 * @param {string} [req.query.search] - Buscar por nombre o email
 * @param {number} [req.query.page] - Número de página para paginación
 * @param {number} [req.query.limit] - Límite de resultados por página
 * @param {Object} req.user - Usuario autenticado
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express
 * 
 * @returns {Object} Respuesta con lista de miembros y metadata de paginación
 * 
 * @example
 * // Request
 * GET /api/members?organizacionId=uuid&estadoActivo=true&page=1&limit=10
 * Authorization: Bearer <token>
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
 *       "total": 25,
 *       "totalPages": 3
 *     }
 *   },
 *   "message": "Miembros obtenidos exitosamente"
 * }
 */
export const getAllMembers = async (req, res, next) => {
  try {
    // =========================================================================
    // 1. EXTRAER PARÁMETROS DE CONSULTA
    // =========================================================================
    const {
      organizacionId,
      estadoActivo,
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
      organizacionId: organizacionId || null,
      estadoActivo: estadoActivo !== undefined ? estadoActivo === 'true' : null,
      search: search || null,
    };

    const pagination = {
      page: pageNum,
      limit: limitNum,
    };

    // =========================================================================
    // 4. VALIDAR PERMISOS DE ACCESO
    // =========================================================================
    // Los usuarios solo pueden ver miembros de su propia organización
    // excepto los administradores
    if (req.user.role !== 'admin' && !organizacionId) {
      throw ApiError.forbidden(
        'Debes especificar una organización para consultar miembros'
      );
    }

    // =========================================================================
    // 5. LLAMAR AL SERVICIO DE OBTENCIÓN
    // =========================================================================
    const result = await memberService.getAllMembers(filters, pagination, req.user);

    // =========================================================================
    // 6. RETORNAR RESPUESTA EXITOSA
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
            organizacionId: member.organizacionId,
            createdAt: member.fechaCreacion,
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
 * OBTENER MIEMBRO POR ID
 * -----------------------------------------------------------------------------
 * 
 * Obtiene los detalles completos de un miembro específico.
 * 
 * @route GET /api/members/:id
 * @access Privado (requiere autenticación)
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {string} req.params.id - ID del miembro a consultar
 * @param {Object} req.user - Usuario autenticado
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express
 * 
 * @returns {Object} Respuesta con datos completos del miembro
 * 
 * @throws {ApiError} 404 - Si el miembro no existe
 * @throws {ApiError} 403 - Si el usuario no tiene permisos para ver este miembro
 * 
 * @example
 * // Request
 * GET /api/members/uuid-miembro
 * Authorization: Bearer <token>
 * 
 * @example
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": {
 *     "member": {
 *       "id": "uuid-miembro",
 *       "dui": "01234567-8",
 *       "nombre": "Juan Pérez",
 *       "email": "juan.perez@example.com",
 *       "telefono": "7000-0000",
 *       "fechanacimiento": "1990-05-15",
 *       "direccion": "Calle Principal #123",
 *       "estadoActivo": true,
 *       "horasTotales": 120,
 *       "organizacion": {...},
 *       "proyectos": [...],
 *       "registroHoras": [...],
 *       "createdAt": "2026-01-01T10:00:00.000Z",
 *       "updatedAt": "2026-02-03T10:00:00.000Z"
 *     }
 *   },
 *   "message": "Miembro obtenido exitosamente"
 * }
 */
export const getMemberById = async (req, res, next) => {
  try {
    // =========================================================================
    // 1. EXTRAER ID DE LOS PARÁMETROS
    // =========================================================================
    const { id } = req.params;

    // =========================================================================
    // 2. VALIDAR FORMATO DEL ID
    // =========================================================================
    if (!id) {
      throw ApiError.badRequest('ID del miembro es requerido');
    }

    // =========================================================================
    // 3. LLAMAR AL SERVICIO DE OBTENCIÓN POR ID
    // =========================================================================
    // El servicio se encarga de:
    // - Validar que el miembro existe
    // - Verificar permisos del usuario
    // - Obtener datos relacionados (organización, proyectos, horas)
    const member = await memberService.getMemberById(id, req.user);

    // =========================================================================
    // 4. RETORNAR RESPUESTA EXITOSA
    // =========================================================================
    return res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        {
          member: {
            id: member.id,
            dui: member.dui,
            nombre: member.nombre,
            email: member.email,
            telefono: member.telefono,
            fechanacimiento: member.fechanacimiento,
            direccion: member.direccion,
            estadoActivo: member.estadoActivo,
            horasTotales: member.horasTotales,
            organizacionId: member.organizacionId,
            organizacion: member.organizacion,
            proyectos: member.proyectos,
            registroHoras: member.registroHoras,
            createdAt: member.fechaCreacion,
            updatedAt: member.fechaEdicion,
          },
        },
        'Miembro obtenido exitosamente'
      )
    );
  } catch (error) {
    // Pasar errores al middleware de manejo de errores
    next(error);
  }
};

/**
 * -----------------------------------------------------------------------------
 * ACTUALIZAR MIEMBRO
 * -----------------------------------------------------------------------------
 * 
 * Actualiza la información de un miembro existente.
 * Solo el líder de la organización o administradores pueden actualizar miembros.
 * 
 * @route PUT /api/members/:id
 * @access Privado (requiere autenticación + rol: lider_organizacion, admin)
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {string} req.params.id - ID del miembro a actualizar
 * @param {Object} req.body - Datos a actualizar
 * @param {string} [req.body.dui] - Nuevo DUI
 * @param {string} [req.body.nombre] - Nuevo nombre
 * @param {string} [req.body.email] - Nuevo email
 * @param {string} [req.body.telefono] - Nuevo teléfono
 * @param {string} [req.body.fechanacimiento] - Nueva fecha de nacimiento
 * @param {string} [req.body.direccion] - Nueva dirección
 * @param {Object} req.user - Usuario autenticado
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express
 * 
 * @returns {Object} Respuesta con datos del miembro actualizado
 * 
 * @throws {ApiError} 400 - Si los datos son inválidos
 * @throws {ApiError} 403 - Si el usuario no tiene permisos
 * @throws {ApiError} 404 - Si el miembro no existe
 * @throws {ApiError} 409 - Si el nuevo DUI o email ya existe
 * 
 * @example
 * // Request
 * PUT /api/members/uuid-miembro
 * Authorization: Bearer <token>
 * {
 *   "nombre": "Juan Carlos Pérez",
 *   "telefono": "7000-1111"
 * }
 * 
 * @example
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": {
 *     "member": {
 *       "id": "uuid-miembro",
 *       "nombre": "Juan Carlos Pérez",
 *       "telefono": "7000-1111",
 *       "updatedAt": "2026-02-03T11:00:00.000Z"
 *     }
 *   },
 *   "message": "Miembro actualizado exitosamente"
 * }
 */
export const updateMember = async (req, res, next) => {
  try {
    // =========================================================================
    // 1. EXTRAER ID Y DATOS DEL BODY
    // =========================================================================
    const { id } = req.params;
    const {
      dui,
      nombre,
      email,
      telefono,
      fechanacimiento,
      direccion,
    } = req.body;

    // =========================================================================
    // 2. VALIDAR QUE HAY DATOS PARA ACTUALIZAR
    // =========================================================================
    const updateData = {
      dui,
      nombre,
      email,
      telefono,
      fechanacimiento,
      direccion,
    };

    const hasUpdates = Object.values(updateData).some((val) => val !== undefined);
    
    if (!hasUpdates) {
      throw ApiError.badRequest('Debes proporcionar al menos un campo para actualizar');
    }

    // =========================================================================
    // 3. VALIDAR FORMATO DE EMAIL (SI SE PROPORCIONA)
    // =========================================================================
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw ApiError.badRequest('Formato de email inválido');
      }
    }

    // =========================================================================
    // 4. VALIDAR PERMISOS DEL USUARIO
    // =========================================================================
    const allowedRoles = ['admin', 'lider_organizacion', 'organizacion'];
    
    if (!allowedRoles.includes(req.user.role)) {
      throw ApiError.forbidden(
        'No tienes permisos para actualizar miembros'
      );
    }

    // =========================================================================
    // 5. LLAMAR AL SERVICIO DE ACTUALIZACIÓN
    // =========================================================================
    // El servicio se encarga de:
    // - Validar que el miembro existe
    // - Verificar permisos del usuario sobre este miembro
    // - Validar unicidad de DUI y email si se cambian
    // - Actualizar el registro en la base de datos
    const member = await memberService.updateMember(id, updateData, {
      updatedBy: req.user.id,
      userRole: req.user.role,
    });

    // =========================================================================
    // 6. RETORNAR RESPUESTA EXITOSA
    // =========================================================================
    return res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        {
          member: {
            id: member.id,
            dui: member.dui,
            nombre: member.nombre,
            email: member.email,
            telefono: member.telefono,
            estadoActivo: member.estadoActivo,
            updatedAt: member.fechaEdicion,
          },
        },
        'Miembro actualizado exitosamente'
      )
    );
  } catch (error) {
    // Pasar errores al middleware de manejo de errores
    next(error);
  }
};

/**
 * -----------------------------------------------------------------------------
 * DAR DE BAJA MIEMBRO (CU-07)
 * -----------------------------------------------------------------------------
 * 
 * Desactiva un miembro sin eliminarlo físicamente de la base de datos.
 * Mantiene el historial de proyectos y horas registradas.
 * 
 * @route DELETE /api/members/:id
 * @access Privado (requiere autenticación + rol: admin, lider_organizacion)
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {string} req.params.id - ID del miembro a desactivar
 * @param {Object} req.user - Usuario autenticado
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express
 * 
 * @returns {Object} Respuesta de confirmación
 * 
 * @throws {ApiError} 403 - Si el usuario no tiene permisos
 * @throws {ApiError} 404 - Si el miembro no existe
 * @throws {ApiError} 409 - Si el miembro tiene proyectos activos pendientes
 * 
 * @example
 * // Request
 * DELETE /api/members/uuid-miembro
 * Authorization: Bearer <token>
 * 
 * @example
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": {},
 *   "message": "Miembro dado de baja exitosamente"
 * }
 */
export const deactivateMember = async (req, res, next) => {
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
        'No tienes permisos para dar de baja miembros'
      );
    }

    // =========================================================================
    // 3. LLAMAR AL SERVICIO DE DESACTIVACIÓN
    // =========================================================================
    // El servicio se encarga de:
    // - Validar que el miembro existe
    // - Verificar que no tenga proyectos activos pendientes (opcional)
    // - Cambiar el estado a inactivo
    // - Registrar quién realizó la desactivación
    await memberService.deactivateMember(id, {
      deactivatedBy: req.user.id,
    });

    // =========================================================================
    // 4. RETORNAR RESPUESTA EXITOSA
    // =========================================================================
    return res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        {},
        'Miembro dado de baja exitosamente'
      )
    );
  } catch (error) {
    // Pasar errores al middleware de manejo de errores
    next(error);
  }
};

/**
 * -----------------------------------------------------------------------------
 * REACTIVAR MIEMBRO
 * -----------------------------------------------------------------------------
 * 
 * Reactiva un miembro previamente desactivado.
 * 
 * @route POST /api/members/:id/reactivate
 * @access Privado (requiere autenticación + rol: admin, lider_organizacion)
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {string} req.params.id - ID del miembro a reactivar
 * @param {Object} req.user - Usuario autenticado
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express
 * 
 * @returns {Object} Respuesta con datos del miembro reactivado
 * 
 * @throws {ApiError} 403 - Si el usuario no tiene permisos
 * @throws {ApiError} 404 - Si el miembro no existe
 * @throws {ApiError} 409 - Si el miembro ya está activo
 * 
 * @example
 * // Request
 * POST /api/members/uuid-miembro/reactivate
 * Authorization: Bearer <token>
 * 
 * @example
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": {
 *     "member": {
 *       "id": "uuid-miembro",
 *       "estadoActivo": true,
 *       "updatedAt": "2026-02-03T12:00:00.000Z"
 *     }
 *   },
 *   "message": "Miembro reactivado exitosamente"
 * }
 */
export const reactivateMember = async (req, res, next) => {
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
        'No tienes permisos para reactivar miembros'
      );
    }

    // =========================================================================
    // 3. LLAMAR AL SERVICIO DE REACTIVACIÓN
    // =========================================================================
    const member = await memberService.reactivateMember(id, {
      reactivatedBy: req.user.id,
    });

    // =========================================================================
    // 4. RETORNAR RESPUESTA EXITOSA
    // =========================================================================
    return res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        {
          member: {
            id: member.id,
            estadoActivo: member.estadoActivo,
            updatedAt: member.fechaEdicion,
          },
        },
        'Miembro reactivado exitosamente'
      )
    );
  } catch (error) {
    // Pasar errores al middleware de manejo de errores
    next(error);
  }
};

/**
 * -----------------------------------------------------------------------------
 * OBTENER HORAS TOTALES DE UN MIEMBRO
 * -----------------------------------------------------------------------------
 * 
 * Obtiene el resumen de horas sociales registradas por un miembro.
 * 
 * @route GET /api/members/:id/horas
 * @access Privado (requiere autenticación)
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {string} req.params.id - ID del miembro
 * @param {Object} req.user - Usuario autenticado
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express
 * 
 * @returns {Object} Respuesta con resumen de horas
 * 
 * @example
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": {
 *     "horasResumen": {
 *       "totales": 120,
 *       "validadas": 100,
 *       "pendientes": 20,
 *       "porProyecto": [...]
 *     }
 *   },
 *   "message": "Horas obtenidas exitosamente"
 * }
 */
export const getMemberHours = async (req, res, next) => {
  try {
    // =========================================================================
    // 1. EXTRAER ID DE LOS PARÁMETROS
    // =========================================================================
    const { id } = req.params;

    // =========================================================================
    // 2. LLAMAR AL SERVICIO DE OBTENCIÓN DE HORAS
    // =========================================================================
    const hoursSummary = await memberService.getMemberHours(id, req.user);

    // =========================================================================
    // 3. RETORNAR RESPUESTA EXITOSA
    // =========================================================================
    return res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        {
          horasResumen: {
            totales: hoursSummary.totales,
            validadas: hoursSummary.validadas,
            pendientes: hoursSummary.pendientes,
            porProyecto: hoursSummary.porProyecto,
          },
        },
        'Horas obtenidas exitosamente'
      )
    );
  } catch (error) {
    // Pasar errores al middleware de manejo de errores
    next(error);
  }
};

/**
 * -----------------------------------------------------------------------------
 * REGISTRAR HORAS DE UN MIEMBRO
 * -----------------------------------------------------------------------------
 * 
 * Permite registrar horas sociales para un miembro en un proyecto específico.
 * 
 * @route POST /api/members/:id/horas
 * @access Privado (requiere autenticación)
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {string} req.params.id - ID del miembro
 * @param {Object} req.body - Datos del registro de horas
 * @param {string} req.body.proyectoId - ID del proyecto
 * @param {string} req.body.fecha - Fecha del registro (YYYY-MM-DD)
 * @param {number} req.body.cantidadHoras - Número de horas registradas
 * @param {string} [req.body.descripcion] - Descripción de las actividades
 * @param {Object} req.user - Usuario autenticado
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express
 * 
 * @returns {Object} Respuesta con el registro creado
 * 
 * @throws {ApiError} 400 - Si los datos son inválidos
 * @throws {ApiError} 403 - Si el usuario no tiene permisos
 * @throws {ApiError} 404 - Si el miembro o proyecto no existe
 * 
 * @example
 * // Request
 * POST /api/members/uuid-miembro/horas
 * Authorization: Bearer <token>
 * {
 *   "proyectoId": "uuid-proyecto",
 *   "fecha": "2026-02-03",
 *   "cantidadHoras": 4,
 *   "descripcion": "Actividades de limpieza comunitaria"
 * }
 * 
 * @example
 * // Response (201 Created)
 * {
 *   "success": true,
 *   "data": {
 *     "registro": {
 *       "id": "uuid-registro",
 *       "fecha": "2026-02-03",
 *       "cantidadHoras": 4,
 *       "validado": false
 *     }
 *   },
 *   "message": "Horas registradas exitosamente"
 * }
 */
export const registerMemberHours = async (req, res, next) => {
  try {
    // =========================================================================
    // 1. EXTRAER ID Y DATOS DEL BODY
    // =========================================================================
    const { id: memberId } = req.params;
    const {
      proyectoId,
      fecha,
      cantidadHoras,
      descripcion,
    } = req.body;

    // =========================================================================
    // 2. VALIDAR CAMPOS REQUERIDOS
    // =========================================================================
    const requiredFields = {
      proyectoId: !proyectoId,
      fecha: !fecha,
      cantidadHoras: cantidadHoras === undefined || cantidadHoras === null,
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([_, isMissing]) => isMissing)
      .map(([field]) => field);

    if (missingFields.length > 0) {
      throw ApiError.badRequest('Campos requeridos faltantes', {
        missingFields,
        requiredFields: ['proyectoId', 'fecha', 'cantidadHoras'],
      });
    }

    // =========================================================================
    // 3. VALIDAR CANTIDAD DE HORAS
    // =========================================================================
    const hoursNum = parseFloat(cantidadHoras);
    if (isNaN(hoursNum) || hoursNum <= 0 || hoursNum > 24) {
      throw ApiError.badRequest(
        'La cantidad de horas debe ser un número entre 0 y 24'
      );
    }

    // =========================================================================
    // 4. LLAMAR AL SERVICIO DE REGISTRO DE HORAS
    // =========================================================================
    const registro = await memberService.registerHours({
      memberId,
      proyectoId,
      fecha,
      cantidadHoras: hoursNum,
      descripcion,
      registradoPor: req.user.id,
    });

    // =========================================================================
    // 5. RETORNAR RESPUESTA EXITOSA
    // =========================================================================
    return res.status(StatusCodes.CREATED).json(
      new ApiResponse(
        StatusCodes.CREATED,
        {
          registro: {
            id: registro.id,
            fecha: registro.fecha,
            cantidadHoras: registro.cantidadHoras,
            descripcion: registro.descripcion,
            validado: registro.validado,
            createdAt: registro.fechaCreacion,
          },
        },
        'Horas registradas exitosamente'
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
 * // En member.routes.js
 * import memberController from '../controllers/member.controller.js';
 * 
 * router.post('/', memberController.registerMember);
 * router.get('/', memberController.getAllMembers);
 * router.get('/:id', memberController.getMemberById);
 * router.put('/:id', memberController.updateMember);
 * router.delete('/:id', memberController.deactivateMember);
 * router.post('/:id/reactivate', memberController.reactivateMember);
 * router.get('/:id/horas', memberController.getMemberHours);
 * router.post('/:id/horas', memberController.registerMemberHours);
 */
export default {
  registerMember,
  getAllMembers,
  getMemberById,
  updateMember,
  deactivateMember,
  reactivateMember,
  getMemberHours,
  registerMemberHours,
};