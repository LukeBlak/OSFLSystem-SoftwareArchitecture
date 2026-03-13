/**
 * =============================================================================
 * RUTAS DE MIEMBROS - CAPA DE PRESENTACIÓN
 * =============================================================================
 * 
 * Propósito (ADR-001):
 * - Definir todos los endpoints relacionados con la gestión de miembros/voluntarios
 * - Conectar controllers con middleware de validación y autenticación
 * - Implementar los casos de uso de gestión de miembros del MVP
 * - Centralizar la configuración de rutas de miembros en un solo módulo
 * 
 * Arquitectura:
 * - Capa: Presentación (Rutas/Endpoints)
 * - Patrón: Router Module
 * - Integración: Express Router + Middleware Chain
 * 
 * Casos de Uso que implementa:
 * - CU-06: Registrar miembros
 * - CU-07: Dar de baja miembros
 * - Consultar miembros de una organización
 * - Actualizar información de miembros
 * - Gestionar horas sociales de miembros
 * 
 * @module routes/member.routes
 * @layer Presentation
 */

import { Router } from 'express';
import memberController from '../controllers/member.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { ROLES } from '../models/User.js';
import { validate } from '../middleware/validation.middleware.js';
import {
  createMemberSchema,
  updateMemberSchema,
  memberIdSchema,
  listMembersSchema,
  registerHoursSchema,
} from '../validators/member.validator.js';
import { rateLimit } from 'express-rate-limit';

// =============================================================================
// CONFIGURACIÓN DEL ROUTER
// =============================================================================

/**
 * Instancia del router para rutas de miembros
 * 
 * Todas las rutas estarán prefijadas con /api/members
 * @type {Router}
 */
const router = Router();

// =============================================================================
// MIDDLEWARE DE RATE LIMITING ESPECÍFICO PARA MIEMBROS
// =============================================================================

/**
 * Rate limiter para registro de miembros
 * 
 * Previene creación masiva de miembros falsos
 * - 20 registros por hora
 */
const registerMemberLimiter = rateLimit({
  /**
   * Ventana de tiempo: 1 hora
   */
  windowMs: 60 * 60 * 1000,
  
  /**
   * Máximo de peticiones por ventana
   */
  max: 20,
  
  /**
   * Mensaje cuando se excede el límite
   */
  message: {
    success: false,
    error: {
      code: 'MEMBER_REGISTER_RATE_LIMIT_EXCEEDED',
      message: 'Demasiados registros de miembros. Por favor espera 1 hora.',
      retryAfter: 3600,
    },
  },
  
  /**
   * Incluir headers de rate limit en la respuesta
   */
  standardHeaders: true,
  legacyHeaders: false,
  
  /**
   * Key para identificar usuarios (por IP + user ID)
   */
  keyGenerator: (req) => {
    return `${req.ip}-${req.user?.id || 'anonymous'}`;
  },
});

/**
 * Rate limiter para operaciones de escritura en miembros
 * 
 * - 50 operaciones por hora
 */
const writeMemberLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 50,
  message: {
    success: false,
    error: {
      code: 'MEMBER_WRITE_RATE_LIMIT_EXCEEDED',
      message: 'Demasiadas operaciones. Por favor espera un momento.',
      retryAfter: 3600,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `${req.ip}-${req.user?.id || 'anonymous'}`;
  },
});

/**
 * Rate limiter para registro de horas
 * 
 * Previene abuso en registro de horas sociales
 * - 10 registros por día
 */
const registerHoursLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 horas
  max: 10,
  message: {
    success: false,
    error: {
      code: 'HOURS_REGISTER_RATE_LIMIT_EXCEEDED',
      message: 'Demasiados registros de horas hoy. Máximo 10 por día.',
      retryAfter: 86400,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `${req.ip}-${req.user?.id || 'anonymous'}`;
  },
});

// =============================================================================
// MIDDLEWARE DE PERMISOS ESPECÍFICOS
// =============================================================================

/**
 * Middleware para verificar permisos de gestión de miembros
 * 
 * Roles permitidos: admin, super_admin, lider_organizacion
 */
const canManageMembers = [
  authenticate,
  requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.LIDER_ORGANIZACION]),
];

/**
 * Middleware para verificar permisos de lectura de miembros
 * 
 * Roles permitidos: todos los usuarios autenticados
 */
const canViewMembers = [
  authenticate,
  requireRole([
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.LIDER_ORGANIZACION,
    ROLES.LIDER_COMITE,
    ROLES.MIEMBRO,
  ]),
];

// =============================================================================
// RUTAS PÚBLICAS (No requieren autenticación)
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * LISTAR MIEMBROS PÚBLICOS (OPCIONAL)
 * -----------------------------------------------------------------------------
 * 
 * Obtiene una lista de miembros públicos (sin información sensible).
 * Útil para páginas públicas de organizaciones.
 * 
 * @route GET /api/members/public
 * @access Público
 * 
 * @query {number} page - Número de página (default: 1)
 * @query {number} limit - Límite de resultados (default: 10, max: 50)
 * @query {string} organizacionId - Filtrar por organización
 * 
 * @returns {Object} 200 - Lista de miembros públicos
 * @returns {Object} 400 - Parámetros inválidos
 */
router.get(
  '/public',
  validate(listMembersSchema, { source: 'query' }),
  memberController.getAllMembers
);

// =============================================================================
// RUTAS PROTEGIDAS (Requieren autenticación)
// =============================================================================

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
 * @middleware canViewMembers, validate(listMembersSchema)
 * 
 * @header {string} Authorization - Bearer <token>
 * @query {string} organizacionId - Filtrar por organización
 * @query {boolean} estadoActivo - Filtrar por estado (true/false)
 * @query {string} search - Buscar por nombre o email
 * @query {number} page - Número de página (default: 1)
 * @query {number} limit - Límite de resultados (default: 10, max: 100)
 * @query {string} sortBy - Campo para ordenar (nombre, email, fechaCreacion, horasTotales)
 * @query {string} sortOrder - Orden (ASC, DESC)
 * 
 * @returns {Object} 200 - Lista de miembros con paginación
 * @returns {Object} 400 - Parámetros inválidos
 * @returns {Object} 401 - No autenticado
 * @returns {Object} 403 - No tiene permisos
 * 
 * @example
 * // Request
 * GET /api/members?organizacionId=uuid&estadoActivo=true&page=1&limit=10
 * Authorization: Bearer <token>
 * 
 * @example
 * // Response (200)
 * {
 *   "success": true,
 *   "data": {
 *     "members": [
 *       {
 *         "id": "uuid-miembro",
 *         "dui": "01234567-8",
 *         "nombre": "Juan Pérez",
 *         "email": "juan@example.com",
 *         "telefono": "7000-0000",
 *         "estadoActivo": true,
 *         "horasTotales": 120,
 *         "organizacionId": "uuid-organizacion",
 *         "createdAt": "2026-01-01T10:00:00.000Z"
 *       }
 *     ],
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
router.get(
  '/',
  canViewMembers,
  validate(listMembersSchema, { source: 'query' }),
  memberController.getAllMembers
);

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
 * @middleware canManageMembers, registerMemberLimiter, validate(createMemberSchema)
 * 
 * @header {string} Authorization - Bearer <token>
 * @body {Object} requestData
 * @body {string} requestData.dui - DUI del miembro (requerido, único, formato 00000000-0)
 * @body {string} requestData.nombre - Nombre completo (requerido)
 * @body {string} requestData.email - Email del miembro (requerido, único)
 * @body {string} [requestData.telefono] - Teléfono de contacto (8 dígitos)
 * @body {string} [requestData.fechanacimiento] - Fecha de nacimiento (YYYY-MM-DD)
 * @body {string} [requestData.direccion] - Dirección de residencia
 * @body {string} requestData.organizacionId - ID de la organización
 * 
 * @returns {Object} 201 - Miembro registrado exitosamente
 * @returns {Object} 400 - Datos inválidos
 * @returns {Object} 403 - No tiene permisos
 * @returns {Object} 404 - Organización no encontrada
 * @returns {Object} 409 - DUI o email ya registrado
 * @returns {Object} 429 - Límite de registros excedido
 * 
 * @example
 * // Request
 * POST /api/members
 * Authorization: Bearer <token>
 * Content-Type: application/json
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
 * // Response (201)
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
router.post(
  '/',
  canManageMembers,
  registerMemberLimiter,
  validate(createMemberSchema),
  memberController.registerMember
);

/**
 * -----------------------------------------------------------------------------
 * OBTENER MIEMBRO POR ID
 * -----------------------------------------------------------------------------
 * 
 * Obtiene los detalles completos de un miembro específico.
 * Incluye información de organización, proyectos y horas registradas.
 * 
 * @route GET /api/members/:id
 * @access Privado (requiere autenticación)
 * @middleware canViewMembers, validate(memberIdSchema)
 * 
 * @header {string} Authorization - Bearer <token>
 * @param {string} id - ID del miembro a consultar
 * 
 * @returns {Object} 200 - Datos completos del miembro
 * @returns {Object} 400 - ID inválido
 * @returns {Object} 401 - No autenticado
 * @returns {Object} 403 - No tiene permisos para ver este miembro
 * @returns {Object} 404 - Miembro no encontrado
 * 
 * @example
 * // Request
 * GET /api/members/uuid-miembro
 * Authorization: Bearer <token>
 * 
 * @example
 * // Response (200)
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
 *       "organizacionId": "uuid-organizacion",
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
router.get(
  '/:id',
  canViewMembers,
  validate(memberIdSchema, { source: 'params' }),
  memberController.getMemberById
);

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
 * @middleware canManageMembers, writeMemberLimiter, validate(updateMemberSchema)
 * 
 * @header {string} Authorization - Bearer <token>
 * @param {string} id - ID del miembro a actualizar
 * @body {Object} [requestData] - Datos a actualizar (todos opcionales)
 * @body {string} [requestData.dui] - Nuevo DUI
 * @body {string} [requestData.nombre] - Nuevo nombre
 * @body {string} [requestData.email] - Nuevo email
 * @body {string} [requestData.telefono] - Nuevo teléfono
 * @body {string} [requestData.fechanacimiento] - Nueva fecha de nacimiento
 * @body {string} [requestData.direccion] - Nueva dirección
 * 
 * @returns {Object} 200 - Miembro actualizado exitosamente
 * @returns {Object} 400 - Datos inválidos
 * @returns {Object} 403 - No tiene permisos
 * @returns {Object} 404 - Miembro no encontrado
 * @returns {Object} 409 - Nuevo DUI o email ya existe
 * @returns {Object} 429 - Límite de operaciones excedido
 * 
 * @example
 * // Request
 * PUT /api/members/uuid-miembro
 * Authorization: Bearer <token>
 * Content-Type: application/json
 * {
 *   "nombre": "Juan Carlos Pérez",
 *   "telefono": "7000-1111"
 * }
 * 
 * @example
 * // Response (200)
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
router.put(
  '/:id',
  canManageMembers,
  writeMemberLimiter,
  validate(updateMemberSchema),
  memberController.updateMember
);

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
 * @middleware canManageMembers, writeMemberLimiter
 * 
 * @header {string} Authorization - Bearer <token>
 * @param {string} id - ID del miembro a desactivar
 * 
 * @returns {Object} 200 - Miembro dado de baja exitosamente
 * @returns {Object} 403 - No tiene permisos
 * @returns {Object} 404 - Miembro no encontrado
 * @returns {Object} 409 - Miembro tiene proyectos activos pendientes
 * @returns {Object} 429 - Límite de operaciones excedido
 * 
 * @example
 * // Request
 * DELETE /api/members/uuid-miembro
 * Authorization: Bearer <token>
 * 
 * @example
 * // Response (200)
 * {
 *   "success": true,
 *   "data": {},
 *   "message": "Miembro dado de baja exitosamente"
 * }
 */
router.delete(
  '/:id',
  canManageMembers,
  writeMemberLimiter,
  memberController.deactivateMember
);

/**
 * -----------------------------------------------------------------------------
 * REACTIVAR MIEMBRO
 * -----------------------------------------------------------------------------
 * 
 * Reactiva un miembro previamente desactivado.
 * 
 * @route POST /api/members/:id/reactivate
 * @access Privado (requiere autenticación + rol: admin, lider_organizacion)
 * @middleware canManageMembers, writeMemberLimiter
 * 
 * @header {string} Authorization - Bearer <token>
 * @param {string} id - ID del miembro a reactivar
 * 
 * @returns {Object} 200 - Miembro reactivado exitosamente
 * @returns {Object} 403 - No tiene permisos
 * @returns {Object} 404 - Miembro no encontrado
 * @returns {Object} 409 - Miembro ya está activo
 * @returns {Object} 429 - Límite de operaciones excedido
 * 
 * @example
 * // Request
 * POST /api/members/uuid-miembro/reactivate
 * Authorization: Bearer <token>
 * 
 * @example
 * // Response (200)
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
router.post(
  '/:id/reactivate',
  canManageMembers,
  writeMemberLimiter,
  memberController.reactivateMember
);

/**
 * -----------------------------------------------------------------------------
 * OBTENER HORAS TOTALES DE UN MIEMBRO
 * -----------------------------------------------------------------------------
 * 
 * Obtiene el resumen de horas sociales registradas por un miembro.
 * 
 * @route GET /api/members/:id/horas
 * @access Privado (requiere autenticación)
 * @middleware canViewMembers, validate(memberIdSchema)
 * 
 * @header {string} Authorization - Bearer <token>
 * @param {string} id - ID del miembro
 * 
 * @returns {Object} 200 - Resumen de horas del miembro
 * @returns {Object} 400 - ID inválido
 * @returns {Object} 401 - No autenticado
 * @returns {Object} 403 - No tiene permisos
 * @returns {Object} 404 - Miembro no encontrado
 * 
 * @example
 * // Request
 * GET /api/members/uuid-miembro/horas
 * Authorization: Bearer <token>
 * 
 * @example
 * // Response (200)
 * {
 *   "success": true,
 *   "data": {
 *     "horasResumen": {
 *       "totales": 120,
 *       "validadas": 100,
 *       "pendientes": 20,
 *       "porProyecto": [
 *         {
 *           "proyectoId": "uuid-proyecto",
 *           "proyectoNombre": "Proyecto de Limpieza",
 *           "horas": 50
 *         }
 *       ]
 *     }
 *   },
 *   "message": "Horas obtenidas exitosamente"
 * }
 */
router.get(
  '/:id/horas',
  canViewMembers,
  validate(memberIdSchema, { source: 'params' }),
  memberController.getMemberHours
);

/**
 * -----------------------------------------------------------------------------
 * REGISTRAR HORAS DE UN MIEMBRO
 * -----------------------------------------------------------------------------
 * 
 * Permite registrar horas sociales para un miembro en un proyecto específico.
 * 
 * @route POST /api/members/:id/horas
 * @access Privado (requiere autenticación)
 * @middleware authenticate, registerHoursLimiter, validate(registerHoursSchema)
 * 
 * @header {string} Authorization - Bearer <token>
 * @param {string} id - ID del miembro
 * @body {Object} requestData
 * @body {string} requestData.proyectoId - ID del proyecto
 * @body {string} requestData.fecha - Fecha del registro (YYYY-MM-DD)
 * @body {number} requestData.cantidadHoras - Número de horas (0.5 - 24)
 * @body {string} [requestData.descripcion] - Descripción de las actividades
 * 
 * @returns {Object} 201 - Horas registradas exitosamente
 * @returns {Object} 400 - Datos inválidos
 * @returns {Object} 401 - No autenticado
 * @returns {Object} 403 - No tiene permisos
 * @returns {Object} 404 - Miembro o proyecto no encontrado
 * @returns {Object} 429 - Límite de registros excedido
 * 
 * @example
 * // Request
 * POST /api/members/uuid-miembro/horas
 * Authorization: Bearer <token>
 * Content-Type: application/json
 * {
 *   "proyectoId": "uuid-proyecto",
 *   "fecha": "2026-02-03",
 *   "cantidadHoras": 4,
 *   "descripcion": "Actividades de limpieza comunitaria"
 * }
 * 
 * @example
 * // Response (201)
 * {
 *   "success": true,
 *   "data": {
 *     "registro": {
 *       "id": "uuid-registro",
 *       "fecha": "2026-02-03",
 *       "cantidadHoras": 4,
 *       "descripcion": "Actividades de limpieza comunitaria",
 *       "validado": false,
 *       "createdAt": "2026-02-03T10:00:00.000Z"
 *     }
 *   },
 *   "message": "Horas registradas exitosamente"
 * }
 */
router.post(
  '/:id/horas',
  authenticate,
  registerHoursLimiter,
  validate(registerHoursSchema),
  memberController.registerMemberHours
);

/**
 * -----------------------------------------------------------------------------
 * OBTENER PROYECTOS DE UN MIEMBRO
 * -----------------------------------------------------------------------------
 * 
 * Obtiene la lista de proyectos en los que participa un miembro.
 * 
 * @route GET /api/members/:id/projects
 * @access Privado (requiere autenticación)
 * @middleware canViewMembers, validate(memberIdSchema)
 * 
 * @header {string} Authorization - Bearer <token>
 * @param {string} id - ID del miembro
 * @query {string} estado - Filtrar por estado de proyecto
 * @query {number} page - Número de página
 * @query {number} limit - Límite de resultados
 * 
 * @returns {Object} 200 - Lista de proyectos del miembro
 * @returns {Object} 400 - ID inválido
 * @returns {Object} 401 - No autenticado
 * @returns {Object} 403 - No tiene permisos
 * @returns {Object} 404 - Miembro no encontrado
 * 
 * @example
 * // Request
 * GET /api/members/uuid-miembro/projects?estado=activo
 * Authorization: Bearer <token>
 * 
 * @example
 * // Response (200)
 * {
 *   "success": true,
 *   "data": {
 *     "projects": [...],
 *     "pagination": {
 *       "page": 1,
 *       "limit": 10,
 *       "total": 5,
 *       "totalPages": 1
 *     }
 *   },
 *   "message": "Proyectos obtenidos exitosamente"
 * }
 */
router.get(
  '/:id/projects',
  canViewMembers,
  validate(memberIdSchema, { source: 'params' }),
  memberController.getMemberProjects
);

/**
 * -----------------------------------------------------------------------------
 * OBTENER POSTULACIONES DE UN MIEMBRO
 * -----------------------------------------------------------------------------
 * 
 * Obtiene la lista de postulaciones a proyectos de un miembro.
 * 
 * @route GET /api/members/:id/applications
 * @access Privado (requiere autenticación)
 * @middleware canViewMembers, validate(memberIdSchema)
 * 
 * @header {string} Authorization - Bearer <token>
 * @param {string} id - ID del miembro
 * @query {string} estado - Filtrar por estado de postulación
 * 
 * @returns {Object} 200 - Lista de postulaciones del miembro
 * @returns {Object} 400 - ID inválido
 * @returns {Object} 401 - No autenticado
 * @returns {Object} 403 - No tiene permisos
 * @returns {Object} 404 - Miembro no encontrado
 */
router.get(
  '/:id/applications',
  canViewMembers,
  validate(memberIdSchema, { source: 'params' }),
  memberController.getMemberApplications
);

// =============================================================================
// EXPORTACIÓN DEL ROUTER
// =============================================================================

/**
 * Exporta el router para ser montado en app.js
 * 
 * @example
 * // En src/routes/index.js
 * import memberRoutes from './member.routes.js';
 * router.use('/members', memberRoutes);
 * 
 * @example
 * // En src/app.js
 * import routes from './routes/index.js';
 * app.use('/api', routes);
 */
export default router;

/**
 * Exporta el router con nombre para importación específica
 */
export { router as memberRouter };