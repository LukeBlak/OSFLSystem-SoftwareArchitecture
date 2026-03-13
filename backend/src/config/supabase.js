/**
 * =============================================================================
 * CONFIGURACIÓN DEL CLIENTE DE SUPABASE
 * =============================================================================
 * 
 * Propósito (ADR-001):
 * - Centralizar la configuración de conexión a la base de datos PostgreSQL
 * - Proveer dos instancias del cliente: una para operaciones normales y otra 
 *   para operaciones administrativas (con privilegios elevados)
 * - Facilitar la verificación de conexión al iniciar la aplicación
 * - Abstraer la complejidad de la configuración del SDK de Supabase
 * 
 * Arquitectura:
 * - Capa: Infraestructura / Persistencia
 * - Patrón: Singleton (una instancia por tipo de cliente)
 * - Base de datos: PostgreSQL gestionado por Supabase (BaaS)
 * 
 * Librerías utilizadas:
 * - @supabase/supabase-js: SDK oficial para interactuar con Supabase
 * 
 * @module config/supabase
 * @layer Infrastructure
 */

// Importar el constructor del cliente de Supabase
import { createClient } from '@supabase/supabase-js';

// Importar las variables de entorno validadas
import { env } from './env.js';

// =============================================================================
// CLIENTE PRINCIPAL DE SUPABASE (Operaciones Normales)
// =============================================================================

/**
 * Instancia del cliente de Supabase para operaciones estándar
 * 
 * Este cliente usa la clave ANON (pública) y respeta las políticas de 
 * Row Level Security (RLS) configuradas en la base de datos.
 * 
 * Uso recomendado:
 * - Consultas desde el frontend (con token de usuario)
 * - Operaciones CRUD que deben respetar permisos de RLS
 * - Cualquier operación donde el contexto del usuario sea relevante
 * 
 * @type {SupabaseClient}
 * 
 * @example
 * // Consulta respetando RLS
 * const { data, error } = await supabase
 *   .from('proyecto')
 *   .select('*')
 *   .eq('organizacion_id', user.orgId);
 */
export const supabase = createClient(
  /**
   * URL base del proyecto en Supabase
   * 
   * Formato: https://[project-ref].supabase.co
   * 
   * Esta URL apunta al endpoint REST de Supabase que recibe las peticiones
   * y las enruta al esquema correspondiente de PostgreSQL.
   * 
   * @see env.SUPABASE_URL - Validada en config/env.js
   */
  env.SUPABASE_URL,
  
  /**
   * Clave de autenticación ANON (pública)
   * 
   * Esta clave:
   * - PUEDE exponerse en el frontend (con precaución)
   * - Respeta las políticas de Row Level Security (RLS)
   * - Solo permite operaciones que el usuario tiene permiso de ejecutar
   * 
   * @security Esta clave NO otorga acceso administrativo
   * @security Las políticas de RLS son la primera línea de defensa
   * 
   * @see env.SUPABASE_ANON_KEY - Validada en config/env.js
   */
  env.SUPABASE_ANON_KEY,
  
  /**
   * Opciones de configuración del cliente
   * 
   * @type {SupabaseClientOptions}
   */
  {
    /**
     * Configuración del módulo de autenticación
     */
    auth: {
      /**
       * Auto-refresh de tokens de acceso
       * 
       * Cuando es true, el cliente automáticamente refresca el token
       * de acceso antes de que expire, usando el refresh token.
       * 
       * @default true - Mantener sesiones activas sin intervención del usuario
       */
      autoRefreshToken: true,
      
      /**
       * Persistencia de la sesión
       * 
       * En el backend, NO persistimos sesiones porque:
       * - Cada petición HTTP es independiente (stateless)
       * - El token se envía en el header Authorization de cada request
       * - No hay almacenamiento local disponible en el servidor
       * 
       * @default false - No persistir en backend (cada request es independiente)
       */
      persistSession: false,
    },
    
    /**
     * Configuración global del cliente
     */
    global: {
      /**
       * Headers personalizados para identificar la aplicación
       * 
       * Útil para:
       * - Logs y monitoreo en el dashboard de Supabase
       * - Depuración de peticiones en tiempo real
       * - Identificar el origen de las peticiones en logs de PostgreSQL
       */
      headers: {
        /**
         * Identificador del cliente
         * 
         * Este valor aparece en:
         * - Logs de Supabase > Logs > API
         * - PostgreSQL logs (si está habilitado)
         * - Herramientas de monitoreo de rendimiento
         */
        'X-Client-Info': 'osflsystem-backend',
      },
    },
  }
);

// =============================================================================
// CLIENTE ADMINISTRATIVO DE SUPABASE (Operaciones con Privilegios)
// =============================================================================

/**
 * Instancia del cliente de Supabase para operaciones administrativas
 * 
 * Este cliente usa la clave SERVICE_ROLE (secreta) y BYPASSEA las políticas 
 * de Row Level Security (RLS). Tiene acceso total a la base de datos.
 * 
 * ⚠️  ADVERTENCIA DE SEGURIDAD ⚠️ 
 * - NUNCA exponer esta clave en el frontend
 * - NUNCA usar este cliente para peticiones de usuario directo
 * - SOLO usar en el backend para operaciones que requieren privilegios
 * 
 * Uso recomendado:
 * - Migraciones de datos
 * - Scripts de mantenimiento
 * - Operaciones que requieren acceso a datos de múltiples organizaciones
 * - Gestión de usuarios desde el backend (cuando RLS no es suficiente)
 * 
 * @type {SupabaseClient}
 * 
 * @security Esta clave otorga acceso ADMINISTRATIVO completo
 * @security Mantener SECRETA en variables de entorno del servidor
 * 
 * @example
 * // Operación administrativa: crear usuario sin pasar por RLS
 * const { data, error } = await supabaseAdmin
 *   .from('usuario')
 *   .insert({ email: 'admin@org.com', role: 'admin' });
 */
export const supabaseAdmin = createClient(
  /**
   * URL base del proyecto (misma que el cliente principal)
   * 
   * @see env.SUPABASE_URL
   */
  env.SUPABASE_URL,
  
  /**
   * Clave de autenticación SERVICE_ROLE (secreta)
   * 
   * Esta clave:
   * - NUNCA debe exponerse en el frontend
   * - BYPASSEA todas las políticas de Row Level Security (RLS)
   * - Otorga acceso de lectura/escritura a TODAS las tablas
   * - Debe tratarse como una contraseña maestra de la base de datos
   * 
   * @security ⚠️  CLAVE CRÍTICA - Proteger como secreto de producción
   * @security ⚠️  Rotar periódicamente en entornos productivos
   * @security ⚠️  Usar solo en operaciones backend verificadas
   * 
   * @see env.SUPABASE_SERVICE_ROLE_KEY - Validada en config/env.js
   */
  env.SUPABASE_SERVICE_ROLE_KEY,
  
  /**
   * Opciones de configuración para el cliente administrativo
   */
  {
    auth: {
      /**
       * Auto-refresh deshabilitado para operaciones administrativas
       * 
       * Las operaciones admin suelen ser puntuales (scripts, migraciones)
       * y no requieren mantener sesiones activas a largo plazo.
       * 
       * @default false - No refrescar tokens automáticamente
       */
      autoRefreshToken: false,
      
      /**
       * Sin persistencia de sesión (backend stateless)
       * 
       * @see persistSession en el cliente principal
       */
      persistSession: false,
    },
  }
);

// =============================================================================
// FUNCIÓN DE VERIFICACIÓN DE CONEXIÓN
// =============================================================================

/**
 * Verifica que la conexión a Supabase esté funcionando correctamente
 * 
 * Esta función realiza una consulta mínima a la tabla 'usuario' para:
 * 1. Confirmar que las credenciales son válidas
 * 2. Confirmar que la tabla existe y es accesible
 * 3. Detectar problemas de red o configuración tempranamente
 * 
 * Se recomienda ejecutar esta función al iniciar el servidor (startup check)
 * para fallar rápido (fail-fast) si la configuración es incorrecta.
 * 
 * @async
 * @returns {Promise<Object>} Resultado de la verificación
 * @returns {boolean} return.isConnected - True si la conexión es exitosa
 * @returns {Object|null} return.error - Detalles del error si falla
 * @returns {string} return.error.message - Mensaje descriptivo del error
 * @returns {string} return.error.details - Detalles técnicos del error
 * 
 * @example
 * // En server.js al iniciar
 * const status = await checkSupabaseConnection();
 * if (!status.isConnected) {
 *   console.error('❌ No se pudo conectar a Supabase:', status.error);
 *   process.exit(1);
 * }
 * 
 * @example
 * // En un endpoint de health check
 * app.get('/api/health/db', async (req, res) => {
 *   const status = await checkSupabaseConnection();
 *   res.json({ database: status.isConnected ? 'ok' : 'error' });
 * });
 */
export const checkSupabaseConnection = async () => {
  try {
    /**
     * Consulta mínima de prueba
     * 
     * Seleccionamos solo el campo 'id' y limitamos a 1 registro para:
     * - Minimizar el impacto en la base de datos
     * - Reducir el tiempo de respuesta de la verificación
     * - Evitar cargar datos sensibles innecesariamente
     * 
     * La tabla 'usuario' se eligió porque:
     * - Es fundamental para el sistema (siempre debe existir)
     * - Tiene pocas columnas, consulta rápida
     * - Es accesible con la clave ANON (respeta RLS)
     */
    const { error } = await supabase
      .from('usuario')        // Nombre de la tabla en el esquema 'public'
      .select('id')           // Solo seleccionar el campo 'id' (mínimo necesario)
      .limit(1);              // Limitar a 1 registro para eficiencia
    
    /**
     * Construir objeto de resultado estandarizado
     * 
     * Patrón de retorno consistente para facilitar el manejo de errores
     * en diferentes partes de la aplicación.
     */
    return {
      /**
       * Indicador booleano de éxito/fallo
       * 
       * - true: La consulta se ejecutó sin errores
       * - false: Hubo un error de conexión, permisos o configuración
       */
      isConnected: !error,
      
      /**
       * Detalles del error (solo si ocurrió uno)
       * 
       * Se incluye información útil para debugging pero se evita
       * exponer detalles sensibles en producción.
       */
      error: error ? {
        /**
         * Mensaje de error legible para humanos
         * 
         * Ejemplos:
         * - "relation \"usuario\" does not exist" → Tabla no creada
         * - "invalid API key" → Credenciales incorrectas
         * - "timeout" → Problema de red o servidor sobrecargado
         */
        message: error.message,
        
        /**
         * Detalles técnicos adicionales del error
         * 
         * Puede incluir:
         * - Código de error de PostgreSQL (ej: "42P01")
         * - Hint para resolver el problema
         * - Stack trace parcial (en desarrollo)
         * 
         * @note En producción, considerar sanitizar este campo
         *       para no exponer información interna de la BD
         */
        details: error.details,
      } : null,
    };
    
  } catch (error) {
    /**
     * Manejo de excepciones no capturadas por Supabase
     * 
     * Aunque el SDK de Supabase maneja la mayoría de errores,
     * esta captura adicional protege contra:
     * - Errores de red no manejados
     * - Excepciones en el runtime de Node.js
     * - Problemas de configuración no detectados por el SDK
     */
    return {
      isConnected: false,
      error: {
        message: error.message,
        // Convertir el error a string para capturar información adicional
        // que pueda no estar en error.message
        details: error.toString(),
      },
    };
  }
};

// =============================================================================
// NOTAS DE SEGURIDAD Y MEJORES PRÁCTICAS
// =============================================================================

/**
 * =============================================================================
 * GUÍA DE USO SEGURO
 * =============================================================================
 * 
 * 1. SELECCIÓN DEL CLIENTE CORRECTO
 *    ┌─────────────────────────────────────────┐
 *    │ ¿La operación debe respetar RLS?        │
 *    ├─────────────────────────────────────────┤
 *    │ ✅ SÍ → Usar `supabase` (cliente normal)│
 *    │ ❌ NO  → Usar `supabaseAdmin` (admin)   │
 *    └─────────────────────────────────────────┘
 * 
 * 2. PROTECCIÓN DE CREDENCIALES
 *    - SUPABASE_ANON_KEY: Puede ir en frontend (con RLS activado)
 *    - SUPABASE_SERVICE_ROLE_KEY: NUNCA en frontend, solo backend
 *    - Ambas deben estar en variables de entorno, NO hardcodeadas
 * 
 * 3. ROW LEVEL SECURITY (RLS)
 *    - Activar RLS en todas las tablas sensibles
 *    - Definir políticas granulares por rol/organización
 *    - Probar políticas con diferentes usuarios antes de desplegar
 * 
 * 4. MANEJO DE ERRORES
 *    - Siempre verificar `error` en las respuestas de Supabase
 *    - No exponer mensajes de error de BD directamente al usuario
 *    - Loggear errores para monitoreo y debugging
 * 
 * 5. OPTIMIZACIÓN DE CONSULTAS
 *    - Usar `.select('campo1,campo2')` en lugar de `.select('*')`
 *    - Aplicar `.limit()` cuando no se necesitan todos los registros
 *    - Usar filtros (`.eq()`, `.gt()`, etc.) para reducir datos transferidos
 * 
 * @see https://supabase.com/docs/guides/auth/row-level-security
 * @see https://supabase.com/docs/reference/javascript/supabase-client
 */

// =============================================================================
// EXPORTACIÓN POR DEFECTO
// =============================================================================

/**
 * Exporta el cliente principal por defecto para conveniencia
 * 
 * Uso común en repositories y services:
 * ```javascript
 * import supabase from '../config/supabase.js';
 * // o
 * import { supabase } from '../config/supabase.js';
 * ```
 */
export default supabase;