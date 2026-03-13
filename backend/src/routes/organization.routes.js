/**
 * =============================================================================
 * RUTAS DE ORGANIZACIONES - CAPA DE PRESENTACIÓN
 * =============================================================================
 * 
 * Propósito (ADR-001):
 * - Definir todos los endpoints relacionados con la gestión de organizaciones
 * - Conectar controllers con middleware de validación y autenticación
 * - Implementar los casos de uso de gestión de organizaciones del MVP
 * - Centralizar la configuración de rutas de organizaciones en un solo módulo
 * 
 * Arquitectura:
 * - Capa: Presentación (Rutas/Endpoints)
 * - Patrón: Router Module
 * - Integración: Express Router + Middleware Chain
 * 
 * Casos de Uso que implementa:
 * - CU-01: Registrar organización
 * - CU-02: Consultar organizaciones
 * - Actualizar información de organización
 * - Dar de baja organización (soft delete)
 * - Gestionar miembros y comités de la organización
 * 
 * @module routes/organization.routes
 * @layer Presentation
 */

import { Router } from 'express';
import organizationController from '../controllers/organization.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { ROLES } from '../models/User.js';
import { validate } from '../middleware/validation.middleware.js';
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  organizationIdSchema,
  listOrganizationsSchema,
} from '../validators/organization.validator.js';
import { rateLimit } from 'express-rate-limit';

// =============================================================================
// CONFIGURACIÓN DEL ROUTER
// =============================================================================

/**
 * Instancia del router para rutas de organizaciones
 * 
 * Todas las rutas estarán prefijadas con /api/organizations
 * @type {Router}
 */
const router = Router();

// =============================================================================
// MIDDLEWARE DE RATE LIMITING ESPECÍFICO PARA ORGANIZACIONES
// =============================================================================

/**
 * Rate limiter para creación de organizaciones
 * 
 * Previene creación masiva de organizaciones falsas
 * - 5 creaciones por hora (operación sensible)
 */
const createOrganizationLimiter = rateLimit({
  /**
   * Ventana de tiempo: 1 hora
   */
  windowMs: 60 * 60 * 1000,
  
  /**
   * Máximo de peticiones por ventana
   */
  max: 5,
  
  /**
   * Mensaje cuando se excede el límite
   */
  message: {
    success: false,
    error: {
      code: 'ORGANIZATION_CREATE_RATE_LIMIT_EXCEEDED',
      message: 'Demasiadas solicitudes de creación de organizaciones. Por favor espera 1 hora.',
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
 * Rate limiter para operaciones de escritura en organizaciones
 * 
 * - 20 operaciones por hora
 */
const writeOrganizationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20,
  message: {
    success: false,
    error: {
      code: 'ORGANIZATION_WRITE_RATE_LIMIT_EXCEEDED',
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
 * Middleware para verificar permisos de creación de organizaciones
 * 
 * Roles permitidos: admin, super_admin (solo administradores pueden crear organizaciones)
 */
const canCreateOrganization = [
  authenticate,
  requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]),
];

/**
 * Middleware para verificar permisos de gestión de organización
 * 
 * Roles permitidos: admin, super_admin, lider_organizacion
 */
const canManageOrganization = [
  authenticate,
  requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.LIDER_ORGANIZACION]),
];

/**
 * Middleware para verificar permisos de lectura de organizaciones
 * 
 * Roles permitidos: todos los usuarios autenticados
 */
const canViewOrganizations = [
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
 * LISTAR ORGANIZACIONES PÚBLICAS
 * -----------------------------------------------------------------------------
 * 
 * Obtiene una lista de organizaciones públicas (sin información sensible).
 * Útil para páginas públicas, landing pages o directorio de organizaciones.
 * 
 * @route GET /api/organizations/public
 * @access Público
 * @middleware validate(listOrganizationsSchema)
 * 
 * @query {string} tipo - Filtrar por tipo de organización
 * @query {number} page - Número de página (default: 1)
 * @query {number} limit - Límite de resultados (default: 10, max: 50)
 * @query {string} search - Buscar por nombre o descripción
 * 
 * @returns {Object} 200 - Lista de organizaciones públicas
 * @returns {Object} 400 - Parámetros inválidos
 * 
 * @example
 * // Request
 * GET /api/organizations/public?page=1&limit=10&tipo=ong
 * 
 * @example
 * // Response (200)
 * {
 *   "success": true,
 *   "data": {
 *     "organizations": [
 *       {
 *         "id": "uuid-organizacion",
 *         "nombre": "Asociación de Voluntarios",
 *         "tipo": "ong",
 *         "descripcion": "Organización dedicada al voluntariado",
 *         "fechaCreacion": "2026-01-01T10:00:00.000Z"
 *       }
 *     ],
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
router.get(
  '/public',
  validate(listOrganizationsSchema, { source: 'query' }),
  organizationController.getAllOrganizations
);

/**
 * -----------------------------------------------------------------------------
 * OBTENER ORGANIZACIÓN PÚBLICA POR ID
 * -----------------------------------------------------------------------------
 * 
 * Obtiene información pública de una organización específica.
 * 
 * @route GET /api/organizations/public/:id
 * @access Público
 * @middleware validate(organizationIdSchema)
 * 
 * @param {string} id - ID de la organización
 * 
 * @returns {Object} 200 - Datos públicos de la organización
 * @returns {Object} 400 - ID inválido
 * @returns {Object} 404 - Organización no encontrada
 */
router.get(
  '/public/:id',
  validate(organizationIdSchema, { source: 'params' }),
  organizationController.getOrganizationById
);

// =============================================================================
// RUTAS PROTEGIDAS (Requieren autenticación)
// =============================================================================

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
 * @middleware canViewOrganizations, validate(listOrganizationsSchema)
 * 
 * @header {string} Authorization - Bearer <token>
 * @query {string} tipo - Filtrar por tipo de organización
 * @query {string} estado - Filtrar por estado (activa, inactiva)
 * @query {string} search - Buscar por nombre o descripción
 * @query {number} page - Número de página (default: 1)
 * @query {number} limit - Límite de resultados (default: 10, max: 100)
 * @query {string} sortBy - Campo para ordenar (nombre, fechaCreacion, tipo)
 * @query {string} sortOrder - Orden (ASC, DESC)
 * 
 * @returns {Object} 200 - Lista de organizaciones con paginación
 * @returns {Object} 400 - Parámetros inválidos
 * @returns {Object} 401 - No autenticado
 * @returns {Object} 403 - No tiene permisos
 * 
 * @example
 * // Request
 * GET /api/organizations?tipo=ong&estado=activa&page=1&limit=10
 * Authorization: Bearer <token>
 * 
 * @example
 * // Response (200)
 * {
 *   "success": true,
 *   "data": {
 *     "organizations": [
 *       {
 *         "id": "uuid-organizacion",
 *         "nombre": "Asociación de Voluntarios",
 *         "tipo": "ong",
 *         "descripcion": "Organización dedicada al voluntariado",
 *         "direccion": "Calle Principal #123",
 *         "telefono": "+503 2222-0000",
 *         "email": "contacto@asovol.org",
 *         "saldoActual": 15000,
 *         "fechaCreacion": "2026-01-01T10:00:00.000Z"
 *       }
 *     ],
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
router.get(
  '/',
  canViewOrganizations,
  validate(listOrganizationsSchema, { source: 'query' }),
  organizationController.getAllOrganizations
);

/**
 * -----------------------------------------------------------------------------
 * CREAR ORGANIZACIÓN (CU-01)
 * -----------------------------------------------------------------------------
 * 
 * Permite registrar una nueva organización en el sistema.
 * Solo usuarios con rol de administrador o super_admin pueden crear organizaciones.
 * 
 * @route POST /api/organizations
 * @access Privado (requiere autenticación + rol: admin, super_admin)
 * @middleware canCreateOrganization, createOrganizationLimiter, validate(createOrganizationSchema)
 * 
 * @header {string} Authorization - Bearer <token>
 * @body {Object} requestData
 * @body {string} requestData.nombre - Nombre de la organización (requerido, único)
 * @body {string} [requestData.tipo] - Tipo de organización (ong, asociacion, fundacion, etc.)
 * @body {string} [requestData.descripcion] - Descripción detallada
 * @body {string} [requestData.direccion] - Dirección física
 * @body {string} [requestData.telefono] - Teléfono de contacto
 * @body {string} [requestData.email] - Email de contacto
 * @body {string} [requestData.estado] - Estado inicial (activa, en_registro)
 * 
 * @returns {Object} 201 - Organización creada exitosamente
 * @returns {Object} 400 - Datos inválidos
 * @returns {Object} 403 - No tiene permisos
 * @returns {Object} 409 - Nombre de organización ya existe
 * @returns {Object} 429 - Límite de creación excedido
 * 
 * @example
 * // Request
 * POST /api/organizations
 * Authorization: Bearer <token>
 * Content-Type: application/json
 * {
 *   "nombre": "Asociación de Voluntarios de El Salvador",
 *   "tipo": "ong",
 *   "descripcion": "Organización dedicada al voluntariado social",
 *   "direccion": "Calle Principal #123, San Salvador",
 *   "telefono": "+503 2222-0000",
 *   "email": "contacto@asvoluntarios.org",
 *   "estado": "activa"
 * }
 * 
 * @example
 * // Response (201)
 * {
 *   "success": true,
 *   "data": {
 *     "organization": {
 *       "id": "uuid-organizacion",
 *       "nombre": "Asociación de Voluntarios de El Salvador",
 *       "tipo": "ong",
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
router.post(
  '/',
  canCreateOrganization,
  createOrganizationLimiter,
  validate(createOrganizationSchema),
  organizationController.createOrganization
);

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
 * @middleware canViewOrganizations, validate(organizationIdSchema)
 * 
 * @header {string} Authorization - Bearer <token>
 * @param {string} id - ID de la organización a consultar
 * 
 * @returns {Object} 200 - Datos completos de la organización
 * @returns {Object} 400 - ID inválido
 * @returns {Object} 401 - No autenticado
 * @returns {Object} 403 - No tiene permisos para ver esta organización
 * @returns {Object} 404 - Organización no encontrada
 * 
 * @example
 * // Request
 * GET /api/organizations/uuid-organizacion
 * Authorization: Bearer <token>
 * 
 * @example
 * // Response (200)
 * {
 *   "success": true,
 *   "data": {
 *     "organization": {
 *       "id": "uuid-organizacion",
 *       "nombre": "Asociación de Voluntarios",
 *       "tipo": "ong",
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
router.get(
  '/:id',
  canViewOrganizations,
  validate(organizationIdSchema, { source: 'params' }),
  organizationController.getOrganizationById
);

/**
 * -----------------------------------------------------------------------------
 * ACTUALIZAR ORGANIZACIÓN
 * -----------------------------------------------------------------------------
 * 
 * Actualiza la información de una organización existente.
 * Solo el líder de la organización o administradores pueden actualizar.
 * 
 * @route PUT /api/organizations/:id
 * @access Privado (requiere autenticación + rol: admin, super_admin, lider_organizacion)
 * @middleware canManageOrganization, writeOrganizationLimiter, validate(updateOrganizationSchema)
 * 
 * @header {string} Authorization - Bearer <token>
 * @param {string} id - ID de la organización a actualizar
 * @body {Object} [requestData] - Datos a actualizar (todos opcionales)
 * @body {string} [requestData.nombre] - Nuevo nombre
 * @body {string} [requestData.tipo] - Nuevo tipo
 * @body {string} [requestData.descripcion] - Nueva descripción
 * @body {string} [requestData.direccion] - Nueva dirección
 * @body {string} [requestData.telefono] - Nuevo teléfono
 * @body {string} [requestData.email] - Nuevo email
 * @body {string} [requestData.estado] - Nuevo estado
 * 
 * @returns {Object} 200 - Organización actualizada exitosamente
 * @returns {Object} 400 - Datos inválidos
 * @returns {Object} 403 - No tiene permisos
 * @returns {Object} 404 - Organización no encontrada
 * @returns {Object} 409 - Nuevo nombre ya existe
 * @returns {Object} 429 - Límite de operaciones excedido
 * 
 * @example
 * // Request
 * PUT /api/organizations/uuid-organizacion
 * Authorization: Bearer <token>
 * Content-Type: application/json
 * {
 *   "nombre": "Asociación de Voluntarios de El Salvador - Actualizado",
 *   "telefono": "+503 2222-1111"
 * }
 * 
 * @example
 * // Response (200)
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
router.put(
  '/:id',
  canManageOrganization,
  writeOrganizationLimiter,
  validate(updateOrganizationSchema),
  organizationController.updateOrganization
);

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
 * @middleware canManageOrganization, writeOrganizationLimiter
 * 
 * @header {string} Authorization - Bearer <token>
 * @param {string} id - ID de la organización a desactivar
 * 
 * @returns {Object} 200 - Organización desactivada exitosamente
 * @returns {Object} 403 - No tiene permisos
 * @returns {Object} 404 - Organización no encontrada
 * @returns {Object} 409 - Organización tiene proyectos activos pendientes
 * @returns {Object} 429 - Límite de operaciones excedido
 * 
 * @example
 * // Request
 * DELETE /api/organizations/uuid-organizacion
 * Authorization: Bearer <token>
 * 
 * @example
 * // Response (200)
 * {
 *   "success": true,
 *   "data": {},
 *   "message": "Organización desactivada exitosamente"
 * }
 */
router.delete(
  '/:id',
  canManageOrganization,
  writeOrganizationLimiter,
  organizationController.deactivateOrganization
);

/**
 * -----------------------------------------------------------------------------
 * OBTENER ESTADÍSTICAS DE ORGANIZACIÓN
 * -----------------------------------------------------------------------------
 * 
 * Obtiene estadísticas y métricas de una organización específica.
 * Incluye total de comités, miembros, proyectos, horas, finanzas, etc.
 * 
 * @route GET /api/organizations/:id/stats
 * @access Privado (requiere autenticación)
 * @middleware canViewOrganizations, validate(organizationIdSchema)
 * 
 * @header {string} Authorization - Bearer <token>
 * @param {string} id - ID de la organización
 * 
 * @returns {Object} 200 - Estadísticas de la organización
 * @returns {Object} 400 - ID inválido
 * @returns {Object} 401 - No autenticado
 * @returns {Object} 403 - No tiene permisos
 * @returns {Object} 404 - Organización no encontrada
 * 
 * @example
 * // Request
 * GET /api/organizations/uuid-organizacion/stats
 * Authorization: Bearer <token>
 * 
 * @example
 * // Response (200)
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
router.get(
  '/:id/stats',
  canViewOrganizations,
  validate(organizationIdSchema, { source: 'params' }),
  organizationController.getOrganizationStats
);

/**
 * -----------------------------------------------------------------------------
 * OBTENER MIEMBROS DE UNA ORGANIZACIÓN
 * -----------------------------------------------------------------------------
 * 
 * Obtiene la lista de miembros pertenecientes a una organización.
 * 
 * @route GET /api/organizations/:id/members
 * @access Privado (requiere autenticación)
 * @middleware canViewOrganizations, validate(organizationIdSchema)
 * 
 * @header {string} Authorization - Bearer <token>
 * @param {string} id - ID de la organización
 * @query {boolean} estadoActivo - Filtrar por estado (true/false)
 * @query {number} page - Número de página
 * @query {number} limit - Límite de resultados
 * 
 * @returns {Object} 200 - Lista de miembros de la organización
 * @returns {Object} 400 - ID inválido
 * @returns {Object} 401 - No autenticado
 * @returns {Object} 403 - No tiene permisos
 * @returns {Object} 404 - Organización no encontrada
 * 
 * @example
 * // Request
 * GET /api/organizations/uuid-organizacion/members?estadoActivo=true&page=1&limit=10
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
 *       "total": 50,
 *       "totalPages": 5
 *     }
 *   },
 *   "message": "Miembros obtenidos exitosamente"
 * }
 */
router.get(
  '/:id/members',
  canViewOrganizations,
  validate(organizationIdSchema, { source: 'params' }),
  organizationController.getOrganizationMembers
);

/**
 * -----------------------------------------------------------------------------
 * OBTENER COMITÉS DE UNA ORGANIZACIÓN
 * -----------------------------------------------------------------------------
 * 
 * Obtiene la lista de comités pertenecientes a una organización.
 * 
 * @route GET /api/organizations/:id/committees
 * @access Privado (requiere autenticación)
 * @middleware canViewOrganizations, validate(organizationIdSchema)
 * 
 * @header {string} Authorization - Bearer <token>
 * @param {string} id - ID de la organización
 * @query {string} estado - Filtrar por estado de comité
 * @query {number} page - Número de página
 * @query {number} limit - Límite de resultados
 * 
 * @returns {Object} 200 - Lista de comités de la organización
 * @returns {Object} 400 - ID inválido
 * @returns {Object} 401 - No autenticado
 * @returns {Object} 403 - No tiene permisos
 * @returns {Object} 404 - Organización no encontrada
 * 
 * @example
 * // Request
 * GET /api/organizations/uuid-organizacion/committees?estado=activo
 * Authorization: Bearer <token>
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
 *       "total": 5,
 *       "totalPages": 1
 *     }
 *   },
 *   "message": "Comités obtenidos exitosamente"
 * }
 */
router.get(
  '/:id/committees',
  canViewOrganizations,
  validate(organizationIdSchema, { source: 'params' }),
  organizationController.getOrganizationCommittees
);

/**
 * -----------------------------------------------------------------------------
 * OBTENER PROYECTOS DE UNA ORGANIZACIÓN
 * -----------------------------------------------------------------------------
 * 
 * Obtiene la lista de proyectos pertenecientes a una organización.
 * 
 * @route GET /api/organizations/:id/projects
 * @access Privado (requiere autenticación)
 * @middleware canViewOrganizations, validate(organizationIdSchema)
 * 
 * @header {string} Authorization - Bearer <token>
 * @param {string} id - ID de la organización
 * @query {string} estado - Filtrar por estado de proyecto
 * @query {number} page - Número de página
 * @query {number} limit - Límite de resultados
 * 
 * @returns {Object} 200 - Lista de proyectos de la organización
 * @returns {Object} 400 - ID inválido
 * @returns {Object} 401 - No autenticado
 * @returns {Object} 403 - No tiene permisos
 * @returns {Object} 404 - Organización no encontrada
 */
router.get(
  '/:id/projects',
  canViewOrganizations,
  validate(organizationIdSchema, { source: 'params' }),
  organizationController.getOrganizationProjects
);

/**
 * -----------------------------------------------------------------------------
 * OBTENER FINANZAS DE UNA ORGANIZACIÓN
 * -----------------------------------------------------------------------------
 * 
 * Obtiene el resumen financiero de una organización (ingresos, egresos, saldo).
 * 
 * @route GET /api/organizations/:id/finances
 * @access Privado (requiere autenticación + rol: admin, lider_organizacion)
 * @middleware canManageOrganization, validate(organizationIdSchema)
 * 
 * @header {string} Authorization - Bearer <token>
 * @param {string} id - ID de la organización
 * @query {string} periodo - Filtrar por periodo (ej: 2026-01, 2026-Q1)
 * 
 * @returns {Object} 200 - Resumen financiero de la organización
 * @returns {Object} 400 - ID inválido
 * @returns {Object} 401 - No autenticado
 * @returns {Object} 403 - No tiene permisos
 * @returns {Object} 404 - Organización no encontrada
 */
router.get(
  '/:id/finances',
  canManageOrganization,
  validate(organizationIdSchema, { source: 'params' }),
  organizationController.getOrganizationFinances
);

// =============================================================================
// EXPORTACIÓN DEL ROUTER
// =============================================================================

/**
 * Exporta el router para ser montado en app.js
 * 
 * @example
 * // En src/routes/index.js
 * import organizationRoutes from './organization.routes.js';
 * router.use('/organizations', organizationRoutes);
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
export { router as organizationRouter };