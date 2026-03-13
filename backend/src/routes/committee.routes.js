/**
 * =============================================================================
 * RUTAS DE COMITÉS - CAPA DE PRESENTACIÓN
 * =============================================================================
 * 
 * Propósito (ADR-001):
 * - Definir todos los endpoints relacionados con la gestión de comités
 * - Conectar controllers con middleware de validación y autenticación
 * - Implementar los casos de uso de gestión de comités del MVP
 * - Centralizar la configuración de rutas de comités en un solo módulo
 * 
 * Arquitectura:
 * - Capa: Presentación (Rutas/Endpoints)
 * - Patrón: Router Module
 * - Integración: Express Router + Middleware Chain
 * 
 * Casos de Uso que implementa:
 * - CU-08: Crear comités
 * - Consultar comités de una organización
 * - Actualizar información de comités
 * - Dar de baja comités (soft delete)
 * - Asignar líder a comité
 * 
 * @module routes/committee.routes
 * @layer Presentation
 */

import { Router } from 'express';
import committeeController from '../controllers/committee.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { ROLES } from '../models/User.js';
import { validate } from '../middleware/validation.middleware.js';
import {
  createCommitteeSchema,
  updateCommitteeSchema,
  committeeIdSchema,
  listCommitteesSchema,
  assignLeaderSchema,
} from '../validators/committee.validator.js';
import { rateLimit } from 'express-rate-limit';

// =============================================================================
// CONFIGURACIÓN DEL ROUTER
// =============================================================================

/**
 * Instancia del router para rutas de comités
 * 
 * Todas las rutas estarán prefijadas con /api/committees
 * @type {Router}
 */
const router = Router();

// =============================================================================
// MIDDLEWARE DE RATE LIMITING ESPECÍFICO PARA COMITÉS
// =============================================================================

/**
 * Rate limiter para creación de comités
 * 
 * Previene creación masiva de comités
 * - 10 creaciones por hora
 */
const createCommitteeLimiter = rateLimit({
  /**
   * Ventana de tiempo: 1 hora
   */
  windowMs: 60 * 60 * 1000,
  
  /**
   * Máximo de peticiones por ventana
   */
  max: 10,
  
  /**
   * Mensaje cuando se excede el límite
   */
  message: {
    success: false,
    error: {
      code: 'COMMITTEE_CREATE_RATE_LIMIT_EXCEEDED',
      message: 'Demasiadas solicitudes de creación de comités. Por favor espera 1 hora.',
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
 * Rate limiter para operaciones de escritura en comités
 * 
 * - 30 operaciones por hora
 */
const writeCommitteeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 30,
  message: {
    success: false,
    error: {
      code: 'COMMITTEE_WRITE_RATE_LIMIT_EXCEEDED',
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

// =============================================================================
// MIDDLEWARE DE PERMISOS ESPECÍFICOS
// =============================================================================

/**
 * Middleware para verificar permisos de gestión de comités
 * 
 * Roles permitidos: admin, super_admin, lider_organizacion
 */
const canManageCommittees = [
  authenticate,
  requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.LIDER_ORGANIZACION]),
];

/**
 * Middleware para verificar permisos de lectura de comités
 * 
 * Roles permitidos: todos los usuarios autenticados
 */
const canViewCommittees = [
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
 * LISTAR COMITÉS PÚBLICOS
 * -----------------------------------------------------------------------------
 * 
 * Obtiene una lista de comités públicos (sin información sensible).
 * Útil para páginas públicas o landing pages.
 * 
 * @route GET /api/committees/public
 * @access Público
 * 
 * @query {number} page - Número de página (default: 1)
 * @query {number} limit - Límite de resultados (default: 10, max: 50)
 * @query {string} organizacionId - Filtrar por organización
 * 
 * @returns {Object} 200 - Lista de comités públicos
 * @returns {Object} 400 - Parámetros inválidos
 * 
 * @example
 * // Request
 * GET /api/committees/public?page=1&limit=10
 * 
 * @example
 * // Response (200)
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
router.get(
  '/public',
  validate(listCommitteesSchema, { source: 'query' }),
  committeeController.getAllCommittees
);

// =============================================================================
// RUTAS PROTEGIDAS (Requieren autenticación)
// =============================================================================

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
 * @middleware canViewCommittees, validate(listCommitteesSchema)
 * 
 * @header {string} Authorization - Bearer <token>
 * @query {string} organizacionId - Filtrar por organización
 * @query {string} estado - Filtrar por estado (activo, inactivo)
 * @query {number} page - Número de página (default: 1)
 * @query {number} limit - Límite de resultados (default: 10, max: 100)
 * @query {string} sortBy - Campo para ordenar (nombre, fechaCreacion, estado)
 * @query {string} sortOrder - Orden (ASC, DESC)
 * 
 * @returns {Object} 200 - Lista de comités con paginación
 * @returns {Object} 400 - Parámetros inválidos
 * @returns {Object} 401 - No autenticado
 * @returns {Object} 403 - No tiene permisos
 * 
 * @example
 * // Request
 * GET /api/committees?organizacionId=uuid&estado=activo&page=1&limit=10
 * Authorization: Bearer <token>
 * 
 * @example
 * // Response (200)
 * {
 *   "success": true,
 *   "data": {
 *     "committees": [
 *       {
 *         "id": "uuid-comite",
 *         "nombre": "Comité de Marketing",
 *         "areaResponsabilidad": "comunicacion",
 *         "estado": "activo",
 *         "organizacionId": "uuid-organizacion",
 *         "createdAt": "2026-02-03T10:00:00.000Z"
 *       }
 *     ],
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
router.get(
  '/',
  canViewCommittees,
  validate(listCommitteesSchema, { source: 'query' }),
  committeeController.getAllCommittees
);

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
 * @middleware canManageCommittees, createCommitteeLimiter, validate(createCommitteeSchema)
 * 
 * @header {string} Authorization - Bearer <token>
 * @body {Object} requestData
 * @body {string} requestData.nombre - Nombre del comité (requerido, único por organización)
 * @body {string} [requestData.areaResponsabilidad] - Área de responsabilidad
 * @body {string} [requestData.descripcion] - Descripción detallada
 * @body {string} [requestData.estado] - Estado inicial (activo, inactivo)
 * @body {number} [requestData.presupuestoAsignado] - Presupuesto asignado
 * @body {string} requestData.organizacionId - ID de la organización
 * @body {string} [requestData.liderComiteId] - ID del líder asignado
 * 
 * @returns {Object} 201 - Comité creado exitosamente
 * @returns {Object} 400 - Datos inválidos
 * @returns {Object} 403 - No tiene permisos
 * @returns {Object} 404 - Organización no encontrada
 * @returns {Object} 409 - Comité con mismo nombre ya existe
 * @returns {Object} 429 - Límite de creación excedido
 * 
 * @example
 * // Request
 * POST /api/committees
 * Authorization: Bearer <token>
 * Content-Type: application/json
 * {
 *   "nombre": "Comité de Marketing",
 *   "areaResponsabilidad": "comunicacion",
 *   "descripcion": "Encargado de la promoción de eventos",
 *   "estado": "activo",
 *   "presupuestoAsignado": 5000,
 *   "organizacionId": "uuid-organizacion",
 *   "liderComiteId": "uuid-lider"
 * }
 * 
 * @example
 * // Response (201)
 * {
 *   "success": true,
 *   "data": {
 *     "committee": {
 *       "id": "uuid-comite",
 *       "nombre": "Comité de Marketing",
 *       "areaResponsabilidad": "comunicacion",
 *       "estado": "activo",
 *       "organizacionId": "uuid-organizacion",
 *       "createdAt": "2026-02-03T10:00:00.000Z"
 *     }
 *   },
 *   "message": "Comité creado exitosamente"
 * }
 */
router.post(
  '/',
  canManageCommittees,
  createCommitteeLimiter,
  validate(createCommitteeSchema),
  committeeController.createCommittee
);

/**
 * -----------------------------------------------------------------------------
 * OBTENER COMITÉ POR ID
 * -----------------------------------------------------------------------------
 * 
 * Obtiene los detalles completos de un comité específico.
 * Incluye información de organización, líder y proyectos asociados.
 * 
 * @route GET /api/committees/:id
 * @access Privado (requiere autenticación)
 * @middleware canViewCommittees, validate(committeeIdSchema)
 * 
 * @header {string} Authorization - Bearer <token>
 * @param {string} id - ID del comité a consultar
 * 
 * @returns {Object} 200 - Datos completos del comité
 * @returns {Object} 400 - ID inválido
 * @returns {Object} 401 - No autenticado
 * @returns {Object} 403 - No tiene permisos para ver este comité
 * @returns {Object} 404 - Comité no encontrado
 * 
 * @example
 * // Request
 * GET /api/committees/uuid-comite
 * Authorization: Bearer <token>
 * 
 * @example
 * // Response (200)
 * {
 *   "success": true,
 *   "data": {
 *     "committee": {
 *       "id": "uuid-comite",
 *       "nombre": "Comité de Marketing",
 *       "areaResponsabilidad": "comunicacion",
 *       "descripcion": "Encargado de promoción",
 *       "estado": "activo",
 *       "presupuestoAsignado": 5000,
 *       "organizacionId": "uuid-organizacion",
 *       "liderComiteId": "uuid-lider",
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
router.get(
  '/:id',
  canViewCommittees,
  validate(committeeIdSchema, { source: 'params' }),
  committeeController.getCommitteeById
);

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
 * @middleware canManageCommittees, writeCommitteeLimiter, validate(updateCommitteeSchema)
 * 
 * @header {string} Authorization - Bearer <token>
 * @param {string} id - ID del comité a actualizar
 * @body {Object} [requestData] - Datos a actualizar (todos opcionales)
 * @body {string} [requestData.nombre] - Nuevo nombre
 * @body {string} [requestData.areaResponsabilidad] - Nueva área
 * @body {string} [requestData.descripcion] - Nueva descripción
 * @body {string} [requestData.estado] - Nuevo estado
 * @body {number} [requestData.presupuestoAsignado] - Nuevo presupuesto
 * @body {string} [requestData.liderComiteId] - Nuevo líder
 * 
 * @returns {Object} 200 - Comité actualizado exitosamente
 * @returns {Object} 400 - Datos inválidos
 * @returns {Object} 403 - No tiene permisos
 * @returns {Object} 404 - Comité no encontrado
 * @returns {Object} 409 - Nuevo nombre ya existe
 * @returns {Object} 429 - Límite de operaciones excedido
 * 
 * @example
 * // Request
 * PUT /api/committees/uuid-comite
 * Authorization: Bearer <token>
 * Content-Type: application/json
 * {
 *   "nombre": "Comité de Marketing Digital",
 *   "presupuestoAsignado": 7500
 * }
 * 
 * @example
 * // Response (200)
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
router.put(
  '/:id',
  canManageCommittees,
  writeCommitteeLimiter,
  validate(updateCommitteeSchema),
  committeeController.updateCommittee
);

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
 * @middleware canManageCommittees, writeCommitteeLimiter
 * 
 * @header {string} Authorization - Bearer <token>
 * @param {string} id - ID del comité a desactivar
 * 
 * @returns {Object} 200 - Comité desactivado exitosamente
 * @returns {Object} 403 - No tiene permisos
 * @returns {Object} 404 - Comité no encontrado
 * @returns {Object} 409 - Comité tiene proyectos activos pendientes
 * @returns {Object} 429 - Límite de operaciones excedido
 * 
 * @example
 * // Request
 * DELETE /api/committees/uuid-comite
 * Authorization: Bearer <token>
 * 
 * @example
 * // Response (200)
 * {
 *   "success": true,
 *   "data": {},
 *   "message": "Comité desactivado exitosamente"
 * }
 */
router.delete(
  '/:id',
  canManageCommittees,
  writeCommitteeLimiter,
  committeeController.deactivateCommittee
);

/**
 * -----------------------------------------------------------------------------
 * ASIGNAR LÍDER A COMITÉ
 * -----------------------------------------------------------------------------
 * 
 * Asigna o cambia el líder de un comité existente.
 * 
 * @route POST /api/committees/:id/assign-leader
 * @access Privado (requiere autenticación + rol: lider_organizacion, admin)
 * @middleware canManageCommittees, writeCommitteeLimiter, validate(assignLeaderSchema)
 * 
 * @header {string} Authorization - Bearer <token>
 * @param {string} id - ID del comité
 * @body {Object} requestData
 * @body {string} requestData.liderComiteId - ID del nuevo líder
 * 
 * @returns {Object} 200 - Líder asignado exitosamente
 * @returns {Object} 400 - ID del líder no proporcionado
 * @returns {Object} 403 - No tiene permisos
 * @returns {Object} 404 - Comité o líder no encontrado
 * @returns {Object} 429 - Límite de operaciones excedido
 * 
 * @example
 * // Request
 * POST /api/committees/uuid-comite/assign-leader
 * Authorization: Bearer <token>
 * Content-Type: application/json
 * {
 *   "liderComiteId": "uuid-lider"
 * }
 * 
 * @example
 * // Response (200)
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
router.post(
  '/:id/assign-leader',
  canManageCommittees,
  writeCommitteeLimiter,
  validate(assignLeaderSchema),
  committeeController.assignLeader
);

/**
 * -----------------------------------------------------------------------------
 * OBTENER ESTADÍSTICAS DE COMITÉ
 * -----------------------------------------------------------------------------
 * 
 * Obtiene estadísticas y métricas de un comité específico.
 * Incluye total de proyectos, miembros, horas, presupuesto, etc.
 * 
 * @route GET /api/committees/:id/stats
 * @access Privado (requiere autenticación)
 * @middleware canViewCommittees, validate(committeeIdSchema)
 * 
 * @header {string} Authorization - Bearer <token>
 * @param {string} id - ID del comité
 * 
 * @returns {Object} 200 - Estadísticas del comité
 * @returns {Object} 400 - ID inválido
 * @returns {Object} 401 - No autenticado
 * @returns {Object} 403 - No tiene permisos
 * @returns {Object} 404 - Comité no encontrado
 * 
 * @example
 * // Request
 * GET /api/committees/uuid-comite/stats
 * Authorization: Bearer <token>
 * 
 * @example
 * // Response (200)
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
router.get(
  '/:id/stats',
  canViewCommittees,
  validate(committeeIdSchema, { source: 'params' }),
  committeeController.getCommitteeStats
);

/**
 * -----------------------------------------------------------------------------
 * OBTENER MIEMBROS DE UN COMITÉ
 * -----------------------------------------------------------------------------
 * 
 * Obtiene la lista de miembros pertenecientes a un comité.
 * 
 * @route GET /api/committees/:id/members
 * @access Privado (requiere autenticación)
 * @middleware canViewCommittees, validate(committeeIdSchema)
 * 
 * @header {string} Authorization - Bearer <token>
 * @param {string} id - ID del comité
 * @query {number} page - Número de página
 * @query {number} limit - Límite de resultados
 * 
 * @returns {Object} 200 - Lista de miembros del comité
 * @returns {Object} 400 - ID inválido
 * @returns {Object} 401 - No autenticado
 * @returns {Object} 403 - No tiene permisos
 * @returns {Object} 404 - Comité no encontrado
 * 
 * @example
 * // Request
 * GET /api/committees/uuid-comite/members?page=1&limit=10
 * Authorization: Bearer <token>
 * 
 * @example
 * // Response (200)
 * {
 *   "success": true,
 *   "data": {
 *     "members": [...],
 *     "pagination": {
 *       "page": 1,
 *       "limit": 10,
 *       "total": 15,
 *       "totalPages": 2
 *     }
 *   },
 *   "message": "Miembros obtenidos exitosamente"
 * }
 */
router.get(
  '/:id/members',
  canViewCommittees,
  validate(committeeIdSchema, { source: 'params' }),
  committeeController.getCommitteeMembers
);

/**
 * -----------------------------------------------------------------------------
 * OBTENER PROYECTOS DE UN COMITÉ
 * -----------------------------------------------------------------------------
 * 
 * Obtiene la lista de proyectos pertenecientes a un comité.
 * 
 * @route GET /api/committees/:id/projects
 * @access Privado (requiere autenticación)
 * @middleware canViewCommittees, validate(committeeIdSchema)
 * 
 * @header {string} Authorization - Bearer <token>
 * @param {string} id - ID del comité
 * @query {string} estado - Filtrar por estado de proyecto
 * @query {number} page - Número de página
 * @query {number} limit - Límite de resultados
 * 
 * @returns {Object} 200 - Lista de proyectos del comité
 * @returns {Object} 400 - ID inválido
 * @returns {Object} 401 - No autenticado
 * @returns {Object} 403 - No tiene permisos
 * @returns {Object} 404 - Comité no encontrado
 * 
 * @example
 * // Request
 * GET /api/committees/uuid-comite/projects?estado=activo
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
  canViewCommittees,
  validate(committeeIdSchema, { source: 'params' }),
  committeeController.getCommitteeProjects
);

// =============================================================================
// EXPORTACIÓN DEL ROUTER
// =============================================================================

/**
 * Exporta el router para ser montado en app.js
 * 
 * @example
 * // En src/routes/index.js
 * import committeeRoutes from './committee.routes.js';
 * router.use('/committees', committeeRoutes);
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
export { router as committeeRouter };