/**
 * =============================================================================
 * MIDDLEWARE DE AUTORIZACIÓN POR ROLES - CAPA DE PRESENTACIÓN
 * =============================================================================
 * 
 * Propósito (ADR-001):
 * - Implementar control de acceso basado en roles (RBAC - Role-Based Access Control)
 * - Verificar que el usuario autenticado tenga los permisos necesarios para acceder a recursos
 * - Centralizar la lógica de autorización en un middleware reutilizable
 * - Proteger rutas según el rol del usuario en el sistema
 * 
 * Arquitectura:
 * - Capa: Presentación (Middleware de Express)
 * - Patrón: Middleware Chain + Guard Pattern
 * - Integración: Depende de auth.middleware.js (requiere req.user poblado)
 * 
 * Roles del Sistema (según Modelo de Dominio):
 * - super_admin: Acceso total al sistema, todas las organizaciones
 * - admin: Acceso administrativo a la plataforma
 * - lider_organizacion: Líder de organización, gestiona su organización
 * - lider_comite: Líder de comité, gestiona su comité
 * - miembro: Miembro/voluntario, acceso básico a proyectos y anuncios
 * 
 * @module middleware/role.middleware
 * @layer Presentation
 */

import { StatusCodes } from 'http-status-codes';
import { ApiError } from '../utils/apiError.js';
import { logger } from '../utils/logger.js';

// =============================================================================
// DEFINICIÓN DE ROLES DEL SISTEMA
// =============================================================================

/**
 * Enumeración de roles válidos en el sistema
 * 
 * @constant {Object}
 * @readonly
 */
export const ROLES = {
  /** Super Administrador - Acceso total al sistema */
  SUPER_ADMIN: 'super_admin',
  
  /** Administrador - Acceso administrativo a la plataforma */
  ADMIN: 'admin',
  
  /** Líder de Organización - Gestiona una organización específica */
  LIDER_ORGANIZACION: 'lider_organizacion',
  
  /** Líder de Comité - Gestiona un comité específico */
  LIDER_COMITE: 'lider_comite',
  
  /** Miembro/Voluntario - Acceso básico */
  MIEMBRO: 'miembro',
};

/**
 * Array de todos los roles válidos
 * @constant {Array<string>}
 */
export const VALID_ROLES = Object.values(ROLES);

// =============================================================================
// JERARQUÍA DE ROLES
// =============================================================================

/**
 * Niveles de jerarquía de roles (mayor número = más privilegios)
 * 
 * Esto permite verificar si un usuario tiene al menos un cierto nivel de acceso
 * 
 * @constant {Object}
 * @readonly
 */
export const ROLE_HIERARCHY = {
  [ROLES.MIEMBRO]: 1,
  [ROLES.LIDER_COMITE]: 2,
  [ROLES.LIDER_ORGANIZACION]: 3,
  [ROLES.ADMIN]: 4,
  [ROLES.SUPER_ADMIN]: 5,
};

/**
 * Matriz de permisos por rol y recurso
 * 
 * Define qué roles pueden realizar qué acciones en cada recurso del sistema
 * 
 * @constant {Object}
 * @readonly
 * 
 * @example
 * // Verificar si un rol puede realizar una acción
 * const canEdit = PERMISSIONS.organization[ROLES.LIDER_ORGANIZACION]?.includes('edit');
 */
export const PERMISSIONS = {
  /**
   * Permisos para recursos de Organización
   */
  organization: {
    [ROLES.SUPER_ADMIN]: ['create', 'read', 'update', 'delete', 'manage'],
    [ROLES.ADMIN]: ['create', 'read', 'update', 'delete', 'manage'],
    [ROLES.LIDER_ORGANIZACION]: ['read', 'update', 'manage_members', 'manage_committees'],
    [ROLES.LIDER_COMITE]: ['read'],
    [ROLES.MIEMBRO]: ['read'],
  },
  
  /**
   * Permisos para recursos de Comité
   */
  committee: {
    [ROLES.SUPER_ADMIN]: ['create', 'read', 'update', 'delete', 'manage'],
    [ROLES.ADMIN]: ['create', 'read', 'update', 'delete', 'manage'],
    [ROLES.LIDER_ORGANIZACION]: ['create', 'read', 'update', 'delete', 'manage'],
    [ROLES.LIDER_COMITE]: ['read', 'update', 'manage_members'],
    [ROLES.MIEMBRO]: ['read'],
  },
  
  /**
   * Permisos para recursos de Miembro
   */
  member: {
    [ROLES.SUPER_ADMIN]: ['create', 'read', 'update', 'delete', 'manage'],
    [ROLES.ADMIN]: ['create', 'read', 'update', 'delete', 'manage'],
    [ROLES.LIDER_ORGANIZACION]: ['create', 'read', 'update', 'delete'],
    [ROLES.LIDER_COMITE]: ['read', 'update'],
    [ROLES.MIEMBRO]: ['read_own'],
  },
  
  /**
   * Permisos para recursos de Proyecto
   */
  project: {
    [ROLES.SUPER_ADMIN]: ['create', 'read', 'update', 'delete', 'manage'],
    [ROLES.ADMIN]: ['create', 'read', 'update', 'delete', 'manage'],
    [ROLES.LIDER_ORGANIZACION]: ['create', 'read', 'update', 'delete', 'manage'],
    [ROLES.LIDER_COMITE]: ['create', 'read', 'update', 'manage'],
    [ROLES.MIEMBRO]: ['read', 'apply'],
  },
  
  /**
   * Permisos para recursos de Horas Sociales
   */
  hours: {
    [ROLES.SUPER_ADMIN]: ['create', 'read', 'update', 'delete', 'validate'],
    [ROLES.ADMIN]: ['create', 'read', 'update', 'delete', 'validate'],
    [ROLES.LIDER_ORGANIZACION]: ['read', 'validate'],
    [ROLES.LIDER_COMITE]: ['read', 'validate', 'create'],
    [ROLES.MIEMBRO]: ['read_own', 'create_own'],
  },
  
  /**
   * Permisos para recursos Financieros
   */
  finances: {
    [ROLES.SUPER_ADMIN]: ['create', 'read', 'update', 'delete', 'manage'],
    [ROLES.ADMIN]: ['create', 'read', 'update', 'delete', 'manage'],
    [ROLES.LIDER_ORGANIZACION]: ['create', 'read', 'update', 'approve'],
    [ROLES.LIDER_COMITE]: ['read', 'request'],
    [ROLES.MIEMBRO]: [],
  },
  
  /**
   * Permisos para recursos de Anuncios
   */
  announcements: {
    [ROLES.SUPER_ADMIN]: ['create', 'read', 'update', 'delete'],
    [ROLES.ADMIN]: ['create', 'read', 'update', 'delete'],
    [ROLES.LIDER_ORGANIZACION]: ['create', 'read', 'update', 'delete'],
    [ROLES.LIDER_COMITE]: ['create', 'read'],
    [ROLES.MIEMBRO]: ['read'],
  },
};

// =============================================================================
// MIDDLEWARE PRINCIPAL DE VERIFICACIÓN DE ROLES
// =============================================================================

/**
 * Middleware para verificar que el usuario tenga al menos uno de los roles permitidos
 * 
 * Este middleware debe usarse DESPUÉS del middleware de autenticación (auth.middleware.js),
 * ya que depende de que req.user esté disponible y poblado con la información del usuario.
 * 
 * @function requireRole
 * @param {Array<string>} allowedRoles - Array de roles permitidos para acceder a la ruta
 * @returns {Function} Middleware de Express que verifica el rol
 * 
 * @throws {ApiError} 401 - Si el usuario no está autenticado (req.user no existe)
 * @throws {ApiError} 403 - Si el usuario no tiene uno de los roles permitidos
 * 
 * @example
 * // Solo administradores pueden acceder
 * router.delete('/users/:id', 
 *   authenticate, 
 *   requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]), 
 *   userController.delete
 * );
 * 
 * @example
 * // Líderes de organización pueden acceder
 * router.post('/committees', 
 *   authenticate, 
 *   requireRole([ROLES.LIDER_ORGANIZACION, ROLES.ADMIN, ROLES.SUPER_ADMIN]), 
 *   committeeController.create
 * );
 * 
 * @example
 * // Cualquier usuario autenticado puede acceder
 * router.get('/announcements', 
 *   authenticate, 
 *   requireRole(VALID_ROLES), 
 *   announcementController.getAll
 * );
 */
export const requireRole = (allowedRoles) => {
  /**
   * Validar que allowedRoles sea un array no vacío
   * Esto previene errores de configuración en las rutas
   */
  if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
    throw new Error(
      'requireRole: allowedRoles debe ser un array no vacío de roles. ' +
      'Ejemplo: requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN])'
    );
  }

  /**
   * Validar que todos los roles en allowedRoles sean válidos
   */
  const invalidRoles = allowedRoles.filter(role => !VALID_ROLES.includes(role));
  
  if (invalidRoles.length > 0) {
    throw new Error(
      `requireRole: Roles inválidos detectados: ${invalidRoles.join(', ')}. ` +
      `Roles válidos: ${VALID_ROLES.join(', ')}`
    );
  }

  /**
   * Middleware retornado que ejecuta la verificación de roles
   */
  return (req, res, next) => {
    try {
      // =========================================================================
      // 1. VERIFICAR QUE EL USUARIO ESTÉ AUTENTICADO
      // =========================================================================
      /**
       * El middleware authenticate debe haberse ejecutado antes
       * y haber adjuntado req.user a la petición
       */
      if (!req.user || !req.user.id) {
        logger.warn('Intento de acceso sin autenticación', {
          path: req.path,
          method: req.method,
          ip: req.ip,
        });

        throw ApiError.unauthorized(
          'Usuario no autenticado',
          {
            hint: 'El middleware authenticate debe ejecutarse antes de requireRole',
          }
        );
      }

      // =========================================================================
      // 2. OBTENER ROL DEL USUARIO
      // =========================================================================
      const userRole = req.user.role;

      // =========================================================================
      // 3. VERIFICAR SI EL ROL ESTÁ PERMITIDO
      // =========================================================================
      /**
       * Comprobar si el rol del usuario está en la lista de roles permitidos
       * 
       * La comparación es case-sensitive para evitar confusiones
       * Los roles deben estar definidos consistentemente en todo el sistema
       */
      if (!allowedRoles.includes(userRole)) {
        // Loggear intento de acceso no autorizado para auditoría
        logger.warn('⚠️  Intento de acceso con rol no autorizado', {
          userId: req.user.id,
          userEmail: req.user.email,
          userRole: userRole,
          requiredRoles: allowedRoles,
          path: req.path,
          method: req.method,
          timestamp: new Date().toISOString(),
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        });

        throw ApiError.forbidden(
          'No tienes permisos para acceder a este recurso',
          {
            code: 'INSUFFICIENT_ROLE',
            details: {
              userRole: userRole,
              requiredRoles: allowedRoles,
              hint: `Roles permitidos: ${allowedRoles.map(r => r.replace('_', ' ')).join(', ')}`,
              userOrganization: req.user.organizationId || null,
            },
          }
        );
      }

      // =========================================================================
      // 4. AGREGAR INFORMACIÓN DE AUTORIZACIÓN AL REQUEST
      // =========================================================================
      /**
       * Agregar contexto de autorización para logging y auditoría
       * Esto permite rastrear qué permisos se verificaron en cada petición
       */
      req.authContext = {
        ...req.authContext,
        authorizedAt: new Date().toISOString(),
        authorizedRole: userRole,
        requiredRoles: allowedRoles,
        authorizationType: 'role-based',
      };

      // =========================================================================
      // 5. CONTINUAR CON LA CADENA DE MIDDLEWARE
      // =========================================================================
      next();

    } catch (error) {
      // Propagar errores al middleware de manejo de errores
      next(error);
    }
  };
};

// =============================================================================
// MIDDLEWARE DE VERIFICACIÓN DE JERARQUÍA DE ROLES
// =============================================================================

/**
 * Middleware para verificar que el usuario tenga al menos un nivel mínimo de jerarquía
 * 
 * Útil cuando quieres permitir acceso a múltiples roles superiores sin listarlos todos
 * 
 * @function requireMinRoleLevel
 * @param {string} minRole - Rol mínimo requerido (según ROLE_HIERARCHY)
 * @returns {Function} Middleware de Express que verifica el nivel de jerarquía
 * 
 * @throws {ApiError} 403 - Si el usuario no tiene el nivel de jerarquía requerido
 * 
 * @example
 * // Solo roles con nivel 3 o superior (LIDER_ORGANIZACION, ADMIN, SUPER_ADMIN)
 * router.post('/organizations', 
 *   authenticate, 
 *   requireMinRoleLevel(ROLES.LIDER_ORGANIZACION), 
 *   organizationController.create
 * );
 * 
 * @example
 * // Solo roles con nivel 4 o superior (ADMIN, SUPER_ADMIN)
 * router.delete('/users/:id', 
 *   authenticate, 
 *   requireMinRoleLevel(ROLES.ADMIN), 
 *   userController.delete
 * );
 */
export const requireMinRoleLevel = (minRole) => {
  /**
   * Validar que minRole sea un rol válido
   */
  if (!VALID_ROLES.includes(minRole)) {
    throw new Error(
      `requireMinRoleLevel: Rol inválido "${minRole}". ` +
      `Roles válidos: ${VALID_ROLES.join(', ')}`
    );
  }

  /**
   * Obtener el nivel mínimo requerido
   */
  const minLevel = ROLE_HIERARCHY[minRole];

  /**
   * Middleware retornado que ejecuta la verificación de jerarquía
   */
  return (req, res, next) => {
    try {
      // =========================================================================
      // 1. VERIFICAR QUE EL USUARIO ESTÉ AUTENTICADO
      // =========================================================================
      if (!req.user || !req.user.role) {
        throw ApiError.unauthorized('Usuario no autenticado');
      }

      // =========================================================================
      // 2. OBTENER NIVEL DEL USUARIO
      // =========================================================================
      const userRole = req.user.role;
      const userLevel = ROLE_HIERARCHY[userRole];

      // =========================================================================
      // 3. VERIFICAR JERARQUÍA
      // =========================================================================
      if (userLevel < minLevel) {
        logger.warn('Intento de acceso con nivel de jerarquía insuficiente', {
          userId: req.user.id,
          userRole: userRole,
          userLevel: userLevel,
          requiredMinRole: minRole,
          requiredMinLevel: minLevel,
          path: req.path,
          method: req.method,
        });

        throw ApiError.forbidden(
          'No tienes el nivel de acceso requerido',
          {
            code: 'INSUFFICIENT_ROLE_LEVEL',
            details: {
              userRole: userRole,
              userLevel: userLevel,
              requiredMinRole: minRole,
              requiredMinLevel: minLevel,
            },
          }
        );
      }

      // =========================================================================
      // 4. AGREGAR CONTEXTO DE AUTORIZACIÓN
      // =========================================================================
      req.authContext = {
        ...req.authContext,
        authorizedAt: new Date().toISOString(),
        authorizedRole: userRole,
        authorizedLevel: userLevel,
        requiredMinRole: minRole,
        requiredMinLevel: minLevel,
        authorizationType: 'hierarchy-based',
      };

      // =========================================================================
      // 5. CONTINUAR CON LA CADENA DE MIDDLEWARE
      // =========================================================================
      next();

    } catch (error) {
      next(error);
    }
  };
};

// =============================================================================
// MIDDLEWARE DE VERIFICACIÓN DE PERMISOS ESPECÍFICOS
// =============================================================================

/**
 * Middleware para verificar que el usuario tenga un permiso específico sobre un recurso
 * 
 * Usa la matriz PERMISSIONS para verificar acciones específicas
 * 
 * @function requirePermission
 * @param {string} resource - Nombre del recurso (organization, committee, member, etc.)
 * @param {string} action - Acción a verificar (create, read, update, delete, manage, etc.)
 * @returns {Function} Middleware de Express que verifica el permiso
 * 
 * @throws {ApiError} 403 - Si el usuario no tiene el permiso requerido
 * 
 * @example
 * // Verificar permiso para crear organizaciones
 * router.post('/organizations', 
 *   authenticate, 
 *   requirePermission('organization', 'create'), 
 *   organizationController.create
 * );
 * 
 * @example
 * // Verificar permiso para validar horas
 * router.post('/hours/validate/:id', 
 *   authenticate, 
 *   requirePermission('hours', 'validate'), 
 *   hoursController.validate
 * );
 */
export const requirePermission = (resource, action) => {
  /**
   * Validar que el recurso exista en la matriz de permisos
   */
  if (!PERMISSIONS[resource]) {
    throw new Error(
      `requirePermission: Recurso "${resource}" no definido en PERMISSIONS. ` +
      `Recursos disponibles: ${Object.keys(PERMISSIONS).join(', ')}`
    );
  }

  /**
   * Middleware retornado que ejecuta la verificación de permisos
   */
  return (req, res, next) => {
    try {
      // =========================================================================
      // 1. VERIFICAR QUE EL USUARIO ESTÉ AUTENTICADO
      // =========================================================================
      if (!req.user || !req.user.role) {
        throw ApiError.unauthorized('Usuario no autenticado');
      }

      // =========================================================================
      // 2. OBTENER ROL DEL USUARIO
      // =========================================================================
      const userRole = req.user.role;

      // =========================================================================
      // 3. VERIFICAR PERMISOS EN LA MATRIZ
      // =========================================================================
      const rolePermissions = PERMISSIONS[resource][userRole];

      if (!rolePermissions || !rolePermissions.includes(action)) {
        logger.warn('Intento de acción sin permiso', {
          userId: req.user.id,
          userRole: userRole,
          resource: resource,
          action: action,
          availablePermissions: rolePermissions || [],
          path: req.path,
          method: req.method,
        });

        throw ApiError.forbidden(
          `No tienes permiso para ${action} en ${resource}`,
          {
            code: 'INSUFFICIENT_PERMISSION',
            details: {
              userRole: userRole,
              resource: resource,
              action: action,
              availablePermissions: rolePermissions || [],
            },
          }
        );
      }

      // =========================================================================
      // 4. AGREGAR CONTEXTO DE AUTORIZACIÓN
      // =========================================================================
      req.authContext = {
        ...req.authContext,
        authorizedAt: new Date().toISOString(),
        authorizedRole: userRole,
        authorizedResource: resource,
        authorizedAction: action,
        authorizationType: 'permission-based',
      };

      // =========================================================================
      // 5. CONTINUAR CON LA CADENA DE MIDDLEWARE
      // =========================================================================
      next();

    } catch (error) {
      next(error);
    }
  };
};

// =============================================================================
// MIDDLEWARE DE VERIFICACIÓN DE PROPIEDAD DE RECURSO
// =============================================================================

/**
 * Middleware para verificar que el usuario sea propietario del recurso
 * 
 * Útil cuando los usuarios solo pueden modificar sus propios recursos
 * 
 * @function requireOwnership
 * @param {string} [ownerField='userId'] - Campo donde se almacena el ID del propietario
 * @param {string} [source='params'] - Dónde buscar el ID del recurso ('params', 'body', 'query')
 * @returns {Function} Middleware de Express que verifica propiedad
 * 
 * @throws {ApiError} 403 - Si el usuario no es propietario del recurso
 * 
 * @example
 * // Usuario solo puede editar su propio perfil
 * router.put('/profile', 
 *   authenticate, 
 *   requireOwnership('userId', 'user'), 
 *   profileController.update
 * );
 * 
 * @example
 * // Usuario solo puede editar su propio miembro (si es líder)
 * router.put('/members/:id', 
 *   authenticate, 
 *   requireRole([ROLES.LIDER_ORGANIZACION]),
 *   requireOwnership('organizacionId', 'params'), 
 *   memberController.update
 * );
 */
export const requireOwnership = (ownerField = 'userId', source = 'params') => {
  /**
   * Middleware retornado que ejecuta la verificación de propiedad
   */
  return (req, res, next) => {
    try {
      // =========================================================================
      // 1. VERIFICAR QUE EL USUARIO ESTÉ AUTENTICADO
      // =========================================================================
      if (!req.user || !req.user.id) {
        throw ApiError.unauthorized('Usuario no autenticado');
      }

      // =========================================================================
      // 2. OBTENER ID DEL RECURSO
      // =========================================================================
      let resourceId;
      
      switch (source) {
        case 'params':
          resourceId = req.params[ownerField] || req.params.id;
          break;
        case 'body':
          resourceId = req.body[ownerField] || req.body.id;
          break;
        case 'query':
          resourceId = req.query[ownerField] || req.query.id;
          break;
        case 'user':
          resourceId = req.user[ownerField] || req.user.id;
          break;
        default:
          resourceId = req.params[ownerField] || req.params.id;
      }

      // =========================================================================
      // 3. OBTENER ID DEL PROPIETARIO DEL USUARIO
      // =========================================================================
      const userOwnerId = req.user.id;
      const userOrganizationId = req.user.organizationId;

      // =========================================================================
      // 4. VERIFICAR PROPIEDAD
      // =========================================================================
      /**
       * Para recursos de organización, verificar que el usuario pertenezca a la organización
       * Para otros recursos, verificar que el ID coincida con el del usuario
       */
      let isOwner = false;

      if (ownerField.includes('organizacion') || ownerField.includes('organization')) {
        // Verificar pertenencia a organización
        isOwner = userOrganizationId === resourceId;
      } else {
        // Verificar propiedad directa
        isOwner = userOwnerId === resourceId;
      }

      if (!isOwner) {
        logger.warn('Intento de acceso a recurso ajeno', {
          userId: req.user.id,
          userOrganizationId: userOrganizationId,
          resourceId: resourceId,
          ownerField: ownerField,
          path: req.path,
          method: req.method,
        });

        throw ApiError.forbidden(
          'No tienes permisos sobre este recurso',
          {
            code: 'NOT_RESOURCE_OWNER',
            details: {
              userId: userOwnerId,
              userOrganizationId: userOrganizationId,
              resourceId: resourceId,
              ownerField: ownerField,
            },
          }
        );
      }

      // =========================================================================
      // 5. AGREGAR CONTEXTO DE AUTORIZACIÓN
      // =========================================================================
      req.authContext = {
        ...req.authContext,
        authorizedAt: new Date().toISOString(),
        isOwner: true,
        resourceId: resourceId,
        authorizationType: 'ownership-based',
      };

      // =========================================================================
      // 6. CONTINUAR CON LA CADENA DE MIDDLEWARE
      // =========================================================================
      next();

    } catch (error) {
      next(error);
    }
  };
};

// =============================================================================
// MIDDLEWARE DE VERIFICACIÓN DE ORGANIZACIÓN
// =============================================================================

/**
 * Middleware para verificar que el usuario pertenezca a una organización específica
 * 
 * Útil en sistemas multi-tenant donde los usuarios solo pueden acceder a datos de su organización
 * 
 * @function requireOrganizationAccess
 * @param {string} [organizationField='organizationId'] - Campo donde se almacena el ID de la organización
 * @param {string} [source='params'] - Dónde buscar el ID de la organización
 * @returns {Function} Middleware de Express que verifica acceso a organización
 * 
 * @throws {ApiError} 403 - Si el usuario no pertenece a la organización
 * 
 * @example
 * // Usuario solo puede ver miembros de su organización
 * router.get('/members', 
 *   authenticate, 
 *   requireOrganizationAccess(), 
 *   memberController.getAll
 * );
 */
export const requireOrganizationAccess = (organizationField = 'organizationId', source = 'params') => {
  /**
   * Middleware retornado que ejecuta la verificación de organización
   */
  return (req, res, next) => {
    try {
      // =========================================================================
      // 1. VERIFICAR QUE EL USUARIO ESTÉ AUTENTICADO
      // =========================================================================
      if (!req.user || !req.user.id) {
        throw ApiError.unauthorized('Usuario no autenticado');
      }

      // =========================================================================
      // 2. OBTENER ORGANIZACIÓN DEL USUARIO
      // =========================================================================
      const userOrganizationId = req.user.organizationId;

      // =========================================================================
      // 3. OBTENER ORGANIZACIÓN DE LA PETICIÓN
      // =========================================================================
      let requestOrganizationId;
      
      switch (source) {
        case 'params':
          requestOrganizationId = req.params[organizationField] || req.params.organizationId;
          break;
        case 'body':
          requestOrganizationId = req.body[organizationField] || req.body.organizationId;
          break;
        case 'query':
          requestOrganizationId = req.query[organizationField] || req.query.organizationId;
          break;
        default:
          requestOrganizationId = req.params[organizationField] || req.params.organizationId;
      }

      // =========================================================================
      // 4. VERIFICAR ACCESO A ORGANIZACIÓN
      // =========================================================================
      /**
       * Super Admin y Admin pueden acceder a todas las organizaciones
       * Otros roles solo pueden acceder a su propia organización
       */
      const isAdmin = [ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(req.user.role);
      
      if (!isAdmin && userOrganizationId && requestOrganizationId) {
        if (userOrganizationId !== requestOrganizationId) {
          logger.warn('Intento de acceso a organización ajena', {
            userId: req.user.id,
            userRole: req.user.role,
            userOrganizationId: userOrganizationId,
            requestedOrganizationId: requestOrganizationId,
            path: req.path,
            method: req.method,
          });

          throw ApiError.forbidden(
            'No tienes acceso a esta organización',
            {
              code: 'ORGANIZATION_ACCESS_DENIED',
              details: {
                userOrganizationId: userOrganizationId,
                requestedOrganizationId: requestOrganizationId,
                userRole: req.user.role,
              },
            }
          );
        }
      }

      // =========================================================================
      // 5. AGREGAR CONTEXTO DE AUTORIZACIÓN
      // =========================================================================
      req.authContext = {
        ...req.authContext,
        authorizedAt: new Date().toISOString(),
        organizationId: userOrganizationId || requestOrganizationId,
        organizationAccessVerified: true,
        authorizationType: 'organization-based',
      };

      // =========================================================================
      // 6. CONTINUAR CON LA CADENA DE MIDDLEWARE
      // =========================================================================
      next();

    } catch (error) {
      next(error);
    }
  };
};

// =============================================================================
// COMBINACIONES PREDEFINIDAS DE MIDDLEWARE
// =============================================================================

/**
 * Middleware combinado para rutas de Super Admin
 * 
 * Combina authenticate + requireRole([SUPER_ADMIN])
 * 
 * @example
 * router.delete('/system/reset', superAdminOnly, systemController.reset);
 */
export const superAdminOnly = [
  requireRole([ROLES.SUPER_ADMIN]),
];

/**
 * Middleware combinado para rutas de Administrador
 * 
 * Combina authenticate + requireRole([ADMIN, SUPER_ADMIN])
 * 
 * @example
 * router.post('/users', adminOnly, userController.create);
 */
export const adminOnly = [
  requireRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]),
];

/**
 * Middleware combinado para rutas de Líder de Organización
 * 
 * Combina authenticate + requireRole([LIDER_ORGANIZACION, ADMIN, SUPER_ADMIN])
 * 
 * @example
 * router.post('/committees', orgLeaderOnly, committeeController.create);
 */
export const orgLeaderOnly = [
  requireRole([ROLES.LIDER_ORGANIZACION, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
];

/**
 * Middleware combinado para rutas de Líder de Comité
 * 
 * Combina authenticate + requireRole([LIDER_COMITE, LIDER_ORGANIZACION, ADMIN, SUPER_ADMIN])
 * 
 * @example
 * router.post('/hours/validate', committeeLeaderOnly, hoursController.validate);
 */
export const committeeLeaderOnly = [
  requireRole([ROLES.LIDER_COMITE, ROLES.LIDER_ORGANIZACION, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
];

/**
 * Middleware combinado para cualquier usuario autenticado
 * 
 * Combina authenticate + requireRole(VALID_ROLES)
 * 
 * @example
 * router.get('/announcements', authenticatedUserOnly, announcementController.getAll);
 */
export const authenticatedUserOnly = [
  requireRole(VALID_ROLES),
];

// =============================================================================
// UTILIDADES DE VERIFICACIÓN DE ROLES
// =============================================================================

/**
 * Verifica si un usuario tiene un rol específico
 * 
 * @function hasRole
 * @param {Object} user - Objeto de usuario con propiedad role
 * @param {string|string[]} role - Rol o array de roles a verificar
 * @returns {boolean} True si el usuario tiene el rol
 * 
 * @example
 * if (hasRole(req.user, ROLES.ADMIN)) {
 *   // Usuario es admin
 * }
 * 
 * if (hasRole(req.user, [ROLES.ADMIN, ROLES.SUPER_ADMIN])) {
 *   // Usuario es admin o super admin
 * }
 */
export const hasRole = (user, role) => {
  if (!user || !user.role) return false;
  
  if (Array.isArray(role)) {
    return role.includes(user.role);
  }
  
  return user.role === role;
};

/**
 * Verifica si un usuario tiene al menos un nivel de jerarquía
 * 
 * @function hasMinRoleLevel
 * @param {Object} user - Objeto de usuario con propiedad role
 * @param {string} minRole - Rol mínimo requerido
 * @returns {boolean} True si el usuario tiene el nivel mínimo
 * 
 * @example
 * if (hasMinRoleLevel(req.user, ROLES.LIDER_ORGANIZACION)) {
 *   // Usuario tiene nivel de líder de organización o superior
 * }
 */
export const hasMinRoleLevel = (user, minRole) => {
  if (!user || !user.role) return false;
  
  const userLevel = ROLE_HIERARCHY[user.role];
  const minLevel = ROLE_HIERARCHY[minRole];
  
  return userLevel >= minLevel;
};

/**
 * Verifica si un usuario tiene un permiso específico
 * 
 * @function hasPermission
 * @param {Object} user - Objeto de usuario con propiedad role
 * @param {string} resource - Nombre del recurso
 * @param {string} action - Acción a verificar
 * @returns {boolean} True si el usuario tiene el permiso
 * 
 * @example
 * if (hasPermission(req.user, 'organization', 'create')) {
 *   // Usuario puede crear organizaciones
 * }
 */
export const hasPermission = (user, resource, action) => {
  if (!user || !user.role) return false;
  
  const rolePermissions = PERMISSIONS[resource]?.[user.role];
  
  if (!rolePermissions) return false;
  
  return rolePermissions.includes(action);
};

// =============================================================================
// EXPORTACIÓN POR DEFECTO
// =============================================================================

/**
 * Exporta todos los middlewares, constantes y utilidades
 * 
 * @example
 * // Importación named (recomendado)
 * import { 
 *   requireRole, 
 *   requirePermission, 
 *   ROLES, 
 *   PERMISSIONS 
 * } from './middleware/role.middleware.js';
 * 
 * @example
 * // Importación por defecto
 * import roleMiddleware from './middleware/role.middleware.js';
 * roleMiddleware.requireRole([ROLES.ADMIN]);
 */
export default {
  // Middlewares principales
  requireRole,
  requireMinRoleLevel,
  requirePermission,
  requireOwnership,
  requireOrganizationAccess,
  
  // Combinaciones predefinidas
  superAdminOnly,
  adminOnly,
  orgLeaderOnly,
  committeeLeaderOnly,
  authenticatedUserOnly,
  
  // Utilidades
  hasRole,
  hasMinRoleLevel,
  hasPermission,
  
  // Constantes
  ROLES,
  VALID_ROLES,
  ROLE_HIERARCHY,
  PERMISSIONS,
};