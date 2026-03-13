/**
 * =============================================================================
 * MIDDLEWARE DE AUTENTICACIÓN - CAPA DE PRESENTACIÓN
 * =============================================================================
 * 
 * Propósito (ADR-001):
 * - Verificar la autenticidad de los tokens JWT en las peticiones HTTP
 * - Extraer información del usuario autenticado desde el token
 * - Adjuntar datos del usuario al objeto request para uso en controllers
 * - Implementar control de acceso basado en roles (RBAC básico)
 * - Proteger rutas que requieren autenticación previa
 * 
 * Arquitectura:
 * - Capa: Presentación (Middleware de Express)
 * - Patrón: Middleware Chain + Guard Pattern
 * - Integración: Supabase Auth (BaaS) para verificación de tokens
 * 
 * Librerías utilizadas:
 * - @supabase/supabase-js: SDK oficial para verificar tokens de Supabase Auth
 * - http-status-codes: Constantes de códigos de estado HTTP
 * 
 * @module middleware/auth.middleware
 * @layer Presentation
 */

import { StatusCodes } from 'http-status-codes';
import { createClient } from '@supabase/supabase-js';
import { ApiError } from '../utils/apiError.js';
import { env } from '../config/env.js';

// =============================================================================
// CONFIGURACIÓN DEL CLIENTE SUPABASE PARA VERIFICACIÓN DE TOKENS
// =============================================================================

/**
 * Cliente de Supabase para verificar tokens de autenticación
 * 
 * Se usa la clave ANON porque:
 * - La verificación de tokens no requiere privilegios elevados
 * - El token del usuario ya contiene los permisos necesarios
 * - Es más seguro que exponer la SERVICE_ROLE_KEY
 * 
 * @type {SupabaseClient}
 */
const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false, // No refrescar tokens en middleware
      persistSession: false,   // No persistir sesión en backend
    },
    global: {
      headers: {
        'X-Client-Info': 'osflsystem-backend-auth-middleware',
      },
    },
  }
);

// =============================================================================
// MIDDLEWARE PRINCIPAL DE AUTENTICACIÓN
// =============================================================================

/**
 * Middleware para verificar autenticación en rutas protegidas
 * 
 * Este middleware:
 * 1. Extrae el token JWT del header Authorization
 * 2. Verifica la validez del token con Supabase Auth
 * 3. Obtiene los datos del usuario desde Supabase
 * 4. Adjunta la información del usuario a req.user
 * 5. Permite continuar al siguiente middleware/controller
 * 
 * @function authenticate
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} req.headers - Headers HTTP de la petición
 * @param {string} [req.headers.authorization] - Header con el token JWT
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express para continuar la cadena
 * 
 * @returns {void} Llama a next() si es exitoso, o pasa error al errorHandler
 * 
 * @throws {ApiError} 401 - Si el token no está presente o es inválido
 * @throws {ApiError} 403 - Si el usuario está desactivado
 * 
 * @example
 * // Uso en rutas protegidas
 * import { authenticate } from './middleware/auth.middleware.js';
 * 
 * router.get('/profile', authenticate, profileController.getProfile);
 * router.post('/organizations', authenticate, organizationController.create);
 * 
 * @example
 * // Formato esperado del header Authorization
 * Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 */
export const authenticate = async (req, res, next) => {
  try {
    // =========================================================================
    // 1. EXTRAER TOKEN DEL HEADER AUTHORIZATION
    // =========================================================================
    /**
     * El header Authorization debe tener el formato:
     * "Bearer <token_jwt>"
     * 
     * Se soportan variaciones en mayúsculas/minúsculas del prefijo "Bearer"
     */
    const authHeader = req.headers.authorization;

    // Verificar que el header existe
    if (!authHeader) {
      throw ApiError.unauthorized(
        'Token de autenticación no proporcionado',
        {
          hint: 'Incluir header Authorization: Bearer <token>',
        }
      );
    }

    // =========================================================================
    // 2. VALIDAR FORMATO DEL HEADER
    // =========================================================================
    /**
     * Validar que el header comienza con "Bearer " (case-insensitive)
     * El token debe estar separado por un espacio después de "Bearer"
     */
    const parts = authHeader.split(' ');
    
    if (parts.length !== 2) {
      throw ApiError.unauthorized(
        'Formato de token inválido',
        {
          hint: 'Usar formato: Authorization: Bearer <token>',
          received: authHeader.substring(0, 20) + '...',
        }
      );
    }

    const [scheme, token] = parts;

    // Validar que el esquema es "Bearer" (case-insensitive)
    if (scheme.toLowerCase() !== 'bearer') {
      throw ApiError.unauthorized(
        'Esquema de autenticación inválido',
        {
          hint: 'Usar esquema: Bearer',
          received: scheme,
        }
      );
    }

    // Validar que el token no está vacío
    if (!token || token.trim() === '') {
      throw ApiError.unauthorized(
        'Token vacío',
        {
          hint: 'Proporcionar un token JWT válido',
        }
      );
    }

    // =========================================================================
    // 3. VERIFICAR TOKEN CON SUPABASE AUTH
    // =========================================================================
    /**
     * Supabase Auth verifica:
     * - Firma del token (JWT signature)
     * - Expiración del token (exp claim)
     * - Emisor del token (iss claim)
     * - Audiencia del token (aud claim)
     * - Estado del usuario en auth.users
     * 
     * Si el token es inválido, Supabase lanza un error con detalles específicos
     */
    const { data: { user }, error: verifyError } = await supabase.auth.getUser(token);

    // Manejar errores de verificación de Supabase
    if (verifyError || !user) {
      // Determinar el tipo de error basado en el mensaje
      const errorMessage = verifyError?.message || 'Token inválido';
      
      if (errorMessage.includes('expired')) {
        throw ApiError.unauthorized(
          'Token expirado. Por favor inicia sesión nuevamente',
          {
            code: 'TOKEN_EXPIRED',
            hint: 'Realizar login para obtener nuevo token',
          }
        );
      }
      
      if (errorMessage.includes('invalid') || errorMessage.includes('bad')) {
        throw ApiError.unauthorized(
          'Token inválido o malformado',
          {
            code: 'INVALID_TOKEN',
            hint: 'Verificar que el token fue copiado correctamente',
          }
        );
      }

      // Error genérico de autenticación
      throw ApiError.unauthorized(
        'Error de autenticación',
        {
          code: 'AUTH_ERROR',
          details: errorMessage,
        }
      );
    }

    // =========================================================================
    // 4. VERIFICAR ESTADO DEL USUARIO
    // =========================================================================
    /**
     * Verificar que el usuario no esté desactivado en Supabase Auth
     * 
     * user.email_confirmed_at indica si el email fue verificado
     * user.aud indica la audiencia del usuario (authenticated, etc.)
     */
    if (!user.email_confirmed_at) {
      throw ApiError.forbidden(
        'Email no verificado. Por favor verifica tu email antes de continuar',
        {
          code: 'EMAIL_NOT_VERIFIED',
          hint: 'Revisar bandeja de entrada para email de verificación',
        }
      );
    }

    // =========================================================================
    // 5. EXTRAER METADATOS DEL USUARIO
    // =========================================================================
    /**
     * Supabase Auth almacena información personalizada en:
     * - user.user_metadata: Datos personalizados del usuario (rol, perfil, etc.)
     * - user.app_metadata: Datos de aplicación (roles, permisos, etc.)
     * 
     * Para OSFLSystem, almacenamos en user_metadata:
     * - role: Rol del usuario (admin, lider_organizacion, miembro, etc.)
     * - organization_id: ID de la organización asociada
     * - profile: Información adicional del perfil
     */
    const userMetadata = user.user_metadata || {};
    const appMetadata = user.app_metadata || {};

    // =========================================================================
    // 6. CONSTRUIR OBJETO DE USUARIO PARA LA APLICACIÓN
    // =========================================================================
    /**
     * Crear un objeto de usuario estandarizado para usar en toda la aplicación
     * 
     * Esto abstrae los detalles de Supabase y provee una interfaz consistente
     * para los controllers y services
     */
    req.user = {
      /**
       * ID único del usuario en Supabase Auth (UUID)
       * @type {string}
       */
      id: user.id,

      /**
       * Email verificado del usuario
       * @type {string}
       */
      email: user.email,

      /**
       * Rol del usuario para control de acceso
       * @type {string}
       * @default 'miembro' - Rol por defecto si no está especificado
       */
      role: userMetadata.role || appMetadata.role || 'miembro',

      /**
       * ID de la organización asociada (si aplica)
       * @type {string|null}
       */
      organizationId: userMetadata.organization_id || userMetadata.organizationId || null,

      /**
       * Información adicional del perfil
       * @type {Object}
       */
      profile: {
        nombre: userMetadata.nombre || userMetadata.name || null,
        apellido: userMetadata.apellido || userMetadata.last_name || null,
        avatar: userMetadata.avatar || userMetadata.avatar_url || null,
        telefono: userMetadata.telefono || userMetadata.phone || null,
        ...userMetadata.profile,
      },

      /**
       * Estado de verificación del email
       * @type {boolean}
       */
      emailVerified: !!user.email_confirmed_at,

      /**
       * Fecha de creación del usuario en Supabase Auth
       * @type {string}
       */
      createdAt: user.created_at,

      /**
       * Última vez que el usuario inició sesión
       * @type {string}
       */
      lastSignInAt: user.last_sign_in_at,

      /**
       * Metadatos completos para acceso avanzado (si se necesita)
       * @type {Object}
       */
      metadata: userMetadata,
    };

    // =========================================================================
    // 7. AGREGAR INFORMACIÓN DE AUDITORÍA AL REQUEST
    // =========================================================================
    /**
     * Agregar información del usuario autenticado para logging y auditoría
     * 
     * Esto permite rastrear qué usuario realizó cada operación en los logs
     */
    req.authContext = {
      userId: user.id,
      userEmail: user.email,
      userRole: req.user.role,
      authenticatedAt: new Date().toISOString(),
      tokenScheme: 'Bearer',
    };

    // =========================================================================
    // 8. CONTINUAR CON LA CADENA DE MIDDLEWARE
    // =========================================================================
    /**
     * El usuario ha sido autenticado exitosamente
     * 
     * Los controllers siguientes pueden acceder a:
     * - req.user: Información completa del usuario
     * - req.authContext: Contexto de autenticación para auditoría
     */
    next();

  } catch (error) {
    /**
     * Manejo de errores de autenticación
     * 
     * Si el error ya es un ApiError, lo propagamos directamente
     * Si es un error desconocido, lo convertimos a ApiError
     */
    if (error instanceof ApiError) {
      next(error);
    } else {
      // Error inesperado - loggear para debugging
      console.error('❌ Error inesperado en auth.middleware:', {
        message: error.message,
        stack: error.stack,
        authHeader: req.headers.authorization ? 'Presente' : 'Ausente',
      });

      next(
        ApiError.internal(
          'Error de autenticación en el servidor',
          { isOperational: false }
        )
      );
    }
  }
};

// =============================================================================
// MIDDLEWARE DE VERIFICACIÓN DE ROLES
// =============================================================================

/**
 * Middleware para verificar que el usuario tenga uno de los roles permitidos
 * 
 * Este middleware debe usarse DESPUÉS del middleware authenticate,
 * ya que depende de que req.user esté disponible.
 * 
 * @function requireRole
 * @param {Array<string>} allowedRoles - Array de roles permitidos para acceder a la ruta
 * @returns {Function} Middleware de Express que verifica el rol
 * 
 * @throws {ApiError} 403 - Si el usuario no tiene uno de los roles permitidos
 * 
 * @example
 * // Uso básico - Solo administradores
 * router.delete('/users/:id', 
 *   authenticate, 
 *   requireRole(['admin', 'super_admin']), 
 *   userController.delete
 * );
 * 
 * @example
 * // Uso con múltiples roles
 * router.post('/organizations', 
 *   authenticate, 
 *   requireRole(['admin', 'lider_organizacion']), 
 *   organizationController.create
 * );
 * 
 * @example
 * // Uso con un solo rol
 * router.get('/admin/dashboard', 
 *   authenticate, 
 *   requireRole(['admin']), 
 *   adminController.dashboard
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
      'Ejemplo: requireRole([\'admin\', \'lider_organizacion\'])'
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
        console.warn('⚠️  Intento de acceso con rol no autorizado:', {
          userId: req.user.id,
          userEmail: req.user.email,
          userRole: userRole,
          requiredRoles: allowedRoles,
          path: req.path,
          method: req.method,
          timestamp: new Date().toISOString(),
        });

        throw ApiError.forbidden(
          'No tienes permisos para acceder a este recurso',
          {
            code: 'INSUFFICIENT_ROLE',
            details: {
              userRole: userRole,
              requiredRoles: allowedRoles,
              hint: `Roles permitidos: ${allowedRoles.join(', ')}`,
            },
          }
        );
      }

      // =========================================================================
      // 4. AGREGAR INFORMACIÓN DE AUTORIZACIÓN AL REQUEST
      // =========================================================================
      /**
       * Agregar contexto de autorización para logging y auditoría
       */
      req.authContext = {
        ...req.authContext,
        authorizedAt: new Date().toISOString(),
        authorizedRole: userRole,
        requiredRoles: allowedRoles,
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
// MIDDLEWARE DE VERIFICACIÓN DE ORGANIZACIÓN
// =============================================================================

/**
 * Middleware para verificar que el usuario pertenezca a una organización específica
 * 
 * Útil para rutas donde los usuarios solo pueden acceder a datos de su propia organización
 * 
 * @function requireOrganization
 * @param {string} [organizationIdParam] - Nombre del parámetro donde está el organizationId
 *                                         (ej: 'organizationId' en req.params o req.body)
 * @returns {Function} Middleware de Express que verifica la organización
 * 
 * @throws {ApiError} 403 - Si el usuario no pertenece a la organización especificada
 * 
 * @example
 * // Verificar que el usuario accede solo a su organización
 * router.get('/members', 
 *   authenticate, 
 *   requireOrganization('organizationId'), 
 *   memberController.getAll
 * );
 */
export const requireOrganization = (organizationIdParam = 'organizationId') => {
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
      /**
       * Buscar el organizationId en:
       * 1. req.params (ej: /api/organizations/:organizationId/members)
       * 2. req.body (ej: POST /api/members con organizationId en body)
       * 3. req.query (ej: GET /api/members?organizationId=xxx)
       */
      const requestOrganizationId =
        req.params[organizationIdParam] ||
        req.body[organizationIdParam] ||
        req.query[organizationIdParam];

      // =========================================================================
      // 4. VERIFICAR COINCIDENCIA DE ORGANIZACIONES
      // =========================================================================
      /**
       * Si el usuario tiene una organización asignada y la petición especifica
       * una organización diferente, rechazar el acceso
       * 
       * Esto previene que usuarios accedan a datos de otras organizaciones
       */
      if (userOrganizationId && requestOrganizationId) {
        if (userOrganizationId !== requestOrganizationId) {
          throw ApiError.forbidden(
            'No tienes acceso a esta organización',
            {
              code: 'ORGANIZATION_MISMATCH',
              details: {
                userOrganization: userOrganizationId,
                requestedOrganization: requestOrganizationId,
              },
            }
          );
        }
      }

      // =========================================================================
      // 5. AGREGAR ORGANIZACIÓN AL CONTEXTO DE AUTENTICACIÓN
      // =========================================================================
      req.authContext = {
        ...req.authContext,
        organizationId: userOrganizationId || requestOrganizationId,
        organizationVerified: true,
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
// MIDDLEWARE OPCIONAL DE AUTENTICACIÓN
// =============================================================================

/**
 * Middleware de autenticación opcional
 * 
 * A diferencia de authenticate, este middleware NO falla si no hay token.
 * Es útil para rutas que funcionan tanto para usuarios autenticados como anónimos,
 * pero que pueden mostrar información adicional si el usuario está logueado.
 * 
 * @function optionalAuth
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express
 * 
 * @example
 * // Ruta pública que muestra información extra si estás logueado
 * router.get('/projects', 
 *   optionalAuth, 
 *   projectController.getAll
 * );
 */
export const optionalAuth = async (req, res, next) => {
  try {
    // =========================================================================
    // 1. EXTRAER TOKEN DEL HEADER (SI EXISTE)
    // =========================================================================
    const authHeader = req.headers.authorization;

    // Si no hay header de autorización, continuar sin autenticar
    if (!authHeader) {
      req.user = null;
      req.authContext = { authenticated: false };
      return next();
    }

    // =========================================================================
    // 2. INTENTAR VERIFICAR TOKEN (SIN FALLAR SI ES INVÁLIDO)
    // =========================================================================
    const parts = authHeader.split(' ');
    
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      const token = parts[1];

      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (!error && user) {
          // Usuario autenticado exitosamente
          req.user = {
            id: user.id,
            email: user.email,
            role: user.user_metadata?.role || 'miembro',
            organizationId: user.user_metadata?.organization_id || null,
            profile: user.user_metadata?.profile || {},
          };
          req.authContext = {
            authenticated: true,
            userId: user.id,
            authenticatedAt: new Date().toISOString(),
          };
        } else {
          // Token inválido pero continuamos como anónimo
          req.user = null;
          req.authContext = { authenticated: false };
        }
      } catch (verifyError) {
        // Error de verificación pero continuamos como anónimo
        req.user = null;
        req.authContext = { authenticated: false };
      }
    } else {
      // Formato de token inválido pero continuamos como anónimo
      req.user = null;
      req.authContext = { authenticated: false };
    }

    // =========================================================================
    // 3. CONTINUAR CON LA CADENA DE MIDDLEWARE
    // =========================================================================
    next();

  } catch (error) {
    // En autenticación opcional, los errores no detienen la petición
    req.user = null;
    req.authContext = { authenticated: false };
    next();
  }
};

// =============================================================================
// MIDDLEWARE DE VERIFICACIÓN DE PROPIEDAD DE RECURSO
// =============================================================================

/**
 * Middleware para verificar que el usuario es propietario de un recurso
 * 
 * Útil para operaciones CRUD donde los usuarios solo pueden modificar sus propios recursos
 * 
 * @function requireOwnership
 * @param {string} resourceOwnerIdField - Campo donde está el ID del propietario del recurso
 * @param {string} [userIdField='id'] - Campo donde está el ID del usuario en req.user
 * @returns {Function} Middleware de Express que verifica propiedad
 * 
 * @throws {ApiError} 403 - Si el usuario no es propietario del recurso
 * 
 * @example
 * // Verificar que el usuario solo puede editar su propio perfil
 * router.put('/profile', 
 *   authenticate, 
 *   requireOwnership('userId', 'id'), 
 *   profileController.update
 * );
 */
export const requireOwnership = (resourceOwnerIdField, userIdField = 'id') => {
  return (req, res, next) => {
    try {
      // =========================================================================
      // 1. VERIFICAR QUE EL USUARIO ESTÉ AUTENTICADO
      // =========================================================================
      if (!req.user || !req.user[userIdField]) {
        throw ApiError.unauthorized('Usuario no autenticado');
      }

      // =========================================================================
      // 2. OBTENER ID DEL PROPIETARIO DEL RECURSO
      // =========================================================================
      const resourceOwnerId =
        req.params[resourceOwnerIdField] ||
        req.body[resourceOwnerIdField] ||
        req.query[resourceOwnerIdField];

      // =========================================================================
      // 3. OBTENER ID DEL USUARIO AUTENTICADO
      // =========================================================================
      const authenticatedUserId = req.user[userIdField];

      // =========================================================================
      // 4. VERIFICAR COINCIDENCIA DE IDs
      // =========================================================================
      if (resourceOwnerId && resourceOwnerId !== authenticatedUserId) {
        throw ApiError.forbidden(
          'No tienes permisos para modificar este recurso',
          {
            code: 'NOT_RESOURCE_OWNER',
            details: {
              authenticatedUserId: authenticatedUserId,
              resourceOwnerId: resourceOwnerId,
            },
          }
        );
      }

      // =========================================================================
      // 5. AGREGAR INFORMACIÓN DE PROPIEDAD AL CONTEXTO
      // =========================================================================
      req.authContext = {
        ...req.authContext,
        isOwner: true,
        resourceId: resourceOwnerId,
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
// MIDDLEWARE DE VERIFICACIÓN DE USUARIO ACTIVO
// =============================================================================

/**
 * Middleware para verificar que el usuario esté activo en el sistema
 * 
 * Complementa la verificación de Supabase Auth verificando el estado en la tabla pública.usuario
 * 
 * @function requireActiveUser
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express
 * 
 * @throws {ApiError} 403 - Si el usuario está desactivado
 * 
 * @note Este middleware requiere que authenticate se haya ejecutado primero
 * 
 * @example
 * router.get('/dashboard', 
 *   authenticate, 
 *   requireActiveUser, 
 *   dashboardController.show
 * );
 */
export const requireActiveUser = async (req, res, next) => {
  try {
    // =========================================================================
    // 1. VERIFICAR QUE EL USUARIO ESTÉ AUTENTICADO
    // =========================================================================
    if (!req.user || !req.user.id) {
      throw ApiError.unauthorized('Usuario no autenticado');
    }

    // =========================================================================
    // 2. VERIFICAR ESTADO ACTIVO EN METADATOS
    // =========================================================================
    /**
     * El campo isActive puede estar en:
     * - req.user.metadata.isActive
     * - req.user.profile.isActive
     * 
     * Si no está presente, asumimos que el usuario está activo
     * (la verificación detallada se hace en el service layer)
     */
    const isActive =
      req.user.metadata?.isActive ??
      req.user.profile?.isActive ??
      true;

    if (!isActive) {
      throw ApiError.forbidden(
        'Tu cuenta ha sido desactivada. Contacta al administrador',
        {
          code: 'USER_DEACTIVATED',
          hint: 'Contactar al administrador de tu organización',
        }
      );
    }

    // =========================================================================
    // 3. AGREGAR INFORMACIÓN DE ESTADO AL CONTEXTO
    // =========================================================================
    req.authContext = {
      ...req.authContext,
      userActive: true,
      activeVerifiedAt: new Date().toISOString(),
    };

    // =========================================================================
    // 4. CONTINUAR CON LA CADENA DE MIDDLEWARE
    // =========================================================================
    next();

  } catch (error) {
    next(error);
  }
};

// =============================================================================
// COMBINACIONES DE MIDDLEWARE PREDEFINIDAS
// =============================================================================

/**
 * Middleware combinado para rutas de administrador
 * 
 * Combina authenticate + requireRole(['admin', 'super_admin'])
 * 
 * @example
 * router.delete('/users/:id', adminOnly, userController.delete);
 */
export const adminOnly = [authenticate, requireRole(['admin', 'super_admin'])];

/**
 * Middleware combinado para rutas de líder de organización
 * 
 * Combina authenticate + requireRole(['admin', 'lider_organizacion', 'organizacion'])
 * 
 * @example
 * router.post('/members', orgLeaderOnly, memberController.create);
 */
export const orgLeaderOnly = [
  authenticate,
  requireRole(['admin', 'lider_organizacion', 'organizacion']),
];

/**
 * Middleware combinado para rutas autenticadas básicas
 * 
 * Combina authenticate + requireActiveUser
 * 
 * @example
 * router.get('/profile', authenticatedOnly, profileController.getProfile);
 */
export const authenticatedOnly = [authenticate, requireActiveUser];

// =============================================================================
// EXPORTACIÓN POR DEFECTO
// =============================================================================

/**
 * Exporta todos los middlewares para facilitar la importación
 * 
 * @example
 * // Importación individual
 * import { authenticate, requireRole } from './middleware/auth.middleware.js';
 * 
 * // Importación por defecto
 * import authMiddleware from './middleware/auth.middleware.js';
 * authMiddleware.authenticate;
 * authMiddleware.requireRole(['admin']);
 */
export default {
  authenticate,
  requireRole,
  requireOrganization,
  optionalAuth,
  requireOwnership,
  requireActiveUser,
  // Combinaciones predefinidas
  adminOnly,
  orgLeaderOnly,
  authenticatedOnly,
};