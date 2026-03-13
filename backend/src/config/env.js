/**
 * =============================================================================
 * CONFIGURACIÓN Y VALIDACIÓN DE VARIABLES DE ENTORNO
 * =============================================================================
 * 
 * Propósito:
 * - Centralizar la gestión de todas las variables de entorno del backend
 * - Validar que las variables requeridas existan y tengan el formato correcto
 * - Prevenir errores en tiempo de ejecución por configuración incorrecta
 * - Proveer una interfaz tipada y segura para acceder a las variables
 * - Fallar rápido (fail-fast) al iniciar si la configuración es inválida
 * 
 * Arquitectura:
 * - Capa: Configuración (Infrastructure)
 * - Patrón: Configuration Object + Validation Schema
 * 
 * Librerías utilizadas:
 * - zod: Validación de esquemas con TypeScript-like safety
 * - dotenv: Carga de variables desde archivo .env
 * 
 * @module config/env
 * @layer Infrastructure
 */

// Importar librerías necesarias
import { z } from 'zod';        // Validación de esquemas
import dotenv from 'dotenv';    // Carga de variables de entorno

/**
 * Cargar variables desde el archivo .env hacia process.env
 * 
 * dotenv.config() busca automáticamente el archivo .env en la raíz del proyecto
 * y carga sus variables en process.env para que estén disponibles en toda la app
 * 
 * @note Esto debe ejecutarse ANTES de cualquier validación o uso de process.env
 */
dotenv.config();

// =============================================================================
// ESQUEMA DE VALIDACIÓN CON ZOD
// =============================================================================

/**
 * Definición del esquema de validación para todas las variables de entorno
 * 
 * Zod permite definir reglas estrictas para cada variable:
 * - Tipo de dato esperado (string, number, enum, etc.)
 * - Validaciones personalizadas (regex, min/max, formato URL, email, etc.)
 * - Transformaciones automáticas (string → number)
 * - Valores por defecto cuando la variable es opcional
 * 
 * Si alguna variable no cumple con su regla, validation.success será false
 * y el proceso se detendrá con un mensaje de error claro.
 * 
 * @type {z.ZodObject}
 */
const envSchema = z.object({
  
  // ===========================================================================
  // CONFIGURACIÓN DEL SERVIDOR
  // ===========================================================================
  
  /**
   * Entorno de ejecución de la aplicación
   * 
   * Valores permitidos:
   * - 'development': Modo desarrollo con logs detallados y hot-reload
   * - 'production': Modo producción con optimizaciones y seguridad máxima
   * - 'test': Modo testing para ejecución de pruebas automatizadas
   * 
   * @default 'development' - Si no se especifica, asume desarrollo
   */
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  
  /**
   * Puerto donde escuchará el servidor HTTP
   * 
   * Validaciones:
   * - Debe ser una cadena que contenga solo dígitos (regex /^\d+$/)
   * - Se transforma automáticamente a número entero con parseInt
   * 
   * @default '3000' - Puerto estándar para desarrollo en Node.js
   * @example PORT=3000 → env.PORT = 3000 (número)
   */
  PORT: z
    .string()
    .regex(/^\d+$/, 'PORT debe contener solo números')
    .transform(val => parseInt(val, 10))
    .default('3000'),

  // ===========================================================================
  // CONFIGURACIÓN DE SUPABASE (BaaS: Auth + Database + Storage)
  // ===========================================================================
  
  /**
   * URL base del proyecto en Supabase
   * 
   * Formato esperado: https://[project-ref].supabase.co
   * 
   * Validaciones:
   * - Debe ser una URL válida (protocolo http/https, dominio, etc.)
   * 
   * @example SUPABASE_URL=https://xyzabcdefgh.supabase.co
   * @see https://supabase.com/docs/guides/getting-started
   */
  SUPABASE_URL: z
    .string()
    .url('SUPABASE_URL debe ser una URL válida (ej: https://proyecto.supabase.co)'),
  
  /**
   * Clave pública (anon) de Supabase para operaciones del cliente
   * 
   * Propósito:
   * - Autenticar peticiones desde el frontend y backend
   * - Respetar las políticas de Row Level Security (RLS) de la BD
   * 
   * Validaciones:
   * - Debe ser una cadena no vacía (min(1))
   * - Debe comenzar con 'eyJ' (indicador de JWT codificado en base64)
   * 
   * @security Esta clave SÍ puede exponerse en el frontend
   * @example SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   */
  SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'SUPABASE_ANON_KEY es requerida')
    .refine(
      val => val.startsWith('eyJ'),
      'SUPABASE_ANON_KEY debe ser un token JWT válido (comienza con "eyJ")'
    ),
  
  /**
   * Clave de servicio (service_role) de Supabase para operaciones administrativas
   * 
   * Propósito:
   * - Ejecutar operaciones que requieren bypass de Row Level Security (RLS)
   * - Gestionar usuarios, migraciones de datos, tareas de mantenimiento
   * 
   * Validaciones:
   * - Debe ser una cadena no vacía (min(1))
   * - Debe comenzar con 'eyJ' (indicador de JWT codificado en base64)
   * 
   * @security ⚠️  NUNCA exponer esta clave en el frontend
   * @security ⚠️  Solo usar en el backend, protegida por variables de entorno
   * @example SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   */
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY es requerida')
    .refine(
      val => val.startsWith('eyJ'),
      'SUPABASE_SERVICE_ROLE_KEY debe ser un token JWT válido (comienza con "eyJ")'
    ),

  // ===========================================================================
  // CONFIGURACIÓN DE SEGURIDAD (JWT)
  // ===========================================================================
  
  /**
   * Secreto para firmar y verificar tokens JWT personalizados
   * 
   * Propósito:
   * - Firmar tokens de sesión generados por el backend
   * - Verificar la autenticidad de tokens en peticiones protegidas
   * 
   * Validaciones:
   * - Debe tener al menos 32 caracteres para seguridad criptográfica
   *   (recomendación OWASP para algoritmos HS256)
   * 
   * @security Generar con: openssl rand -base64 32
   * @security Rotar periódicamente en producción
   * @example JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
   */
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET debe tener al menos 32 caracteres para seguridad criptográfica'),
  
  /**
   * Tiempo de expiración para tokens JWT
   * 
   * Formato: String compatible con la librería `ms` o `jsonwebtoken`
   * 
   * Valores comunes:
   * - '1h' = 1 hora (recomendado para sesiones de usuario)
   * - '24h' = 24 horas (para tokens de refresh)
   * - '7d' = 7 días (para tokens de larga duración)
   * 
   * @default '1h' - Balance entre seguridad y experiencia de usuario
   * @see https://github.com/vercel/ms para más formatos
   */
  JWT_EXPIRES_IN: z
    .string()
    .default('1h'),

  // ===========================================================================
  // CONFIGURACIÓN DE CLOUDINARY (Almacenamiento de Imágenes)
  // ===========================================================================
  
  /**
   * Nombre de la nube (cloud name) en Cloudinary
   * 
   * Propósito:
   * - Identificar la cuenta de Cloudinary para subir/recuperar imágenes
   * - Formar URLs públicas de recursos almacenados
   * 
   * Validaciones:
   * - Debe ser una cadena no vacía
   * 
   * @example CLOUDINARY_CLOUD_NAME=dwi1lmdmt
   * @see https://cloudinary.com/console
   */
  CLOUDINARY_CLOUD_NAME: z
    .string()
    .min(1, 'CLOUDINARY_CLOUD_NAME es requerida'),
  
  /**
   * API Key pública de Cloudinary
   * 
   * Propósito:
   * - Autenticar peticiones de subida de archivos al API de Cloudinary
   * 
   * Validaciones:
   * - Debe ser una cadena no vacía
   * 
   * @security Esta clave puede usarse en backend; evitar en frontend
   * @example CLOUDINARY_API_KEY=447288961479518
   */
  CLOUDINARY_API_KEY: z
    .string()
    .min(1, 'CLOUDINARY_API_KEY es requerida'),
  
  /**
   * API Secret privada de Cloudinary
   * 
   * Propósito:
   * - Firmar peticiones sensibles (eliminar recursos, cambiar configuraciones)
   * 
   * Validaciones:
   * - Debe ser una cadena no vacía
   * 
   * @security ⚠️  NUNCA exponer esta clave en el frontend
   * @security ⚠️  Solo usar en el backend
   * @example CLOUDINARY_API_SECRET=MXBIQtbg-ripwlESuDoPH15xHgM
   */
  CLOUDINARY_API_SECRET: z
    .string()
    .min(1, 'CLOUDINARY_API_SECRET es requerida'),
  
  /**
   * Carpeta raíz por defecto para organizar recursos en Cloudinary
   * 
   * Propósito:
   * - Estructurar las subidas en carpetas lógicas dentro de Cloudinary
   * - Facilitar la gestión y limpieza de recursos
   * 
   * Estructura recomendada:
   * ```
   * osflsystem/
   * ├── avatars/
   * ├── organizations/logos/
   * ├── projects/
   * └── committees/
   * ```
   * 
   * @default 'osflsystem' - Nombre del proyecto como carpeta raíz
   */
  CLOUDINARY_UPLOAD_FOLDER: z
    .string()
    .default('osflsystem'),

  // ===========================================================================
  // CONFIGURACIÓN DE SERVICIO DE EMAIL (Nodemailer)
  // ===========================================================================
  
  /**
   * Host del servidor SMTP para envío de correos
   * 
   * Propósito:
   * - Configurar el servidor de correo saliente para notificaciones
   * 
   * Valores comunes:
   * - Gmail: 'smtp.gmail.com'
   * - Outlook: 'smtp-mail.outlook.com'
   * - SendGrid: 'smtp.sendgrid.net'
   * 
   * @example EMAIL_HOST=smtp.gmail.com
   */
  EMAIL_HOST: z
    .string()
    .min(1, 'EMAIL_HOST es requerida'),
  
  /**
   * Puerto del servidor SMTP
   * 
   * Puertos comunes:
   * - 587: TLS (recomendado para envío)
   * - 465: SSL (alternativa)
   * - 25: Sin encriptación (no recomendado)
   * 
   * Validaciones:
   * - Debe ser una cadena con solo dígitos
   * - Se transforma automáticamente a número entero
   * 
   * @default '587' - Puerto estándar para SMTP con TLS
   */
  EMAIL_PORT: z
    .string()
    .regex(/^\d+$/, 'EMAIL_PORT debe contener solo números')
    .transform(val => parseInt(val, 10))
    .default('587'),
  
  /**
   * Usuario/cuenta de correo para autenticación SMTP
   * 
   * Validaciones:
   * - Debe ser una dirección de email válida (formato RFC 5322)
   * 
   * @example EMAIL_USER=osflsystem@gmail.com
   */
  EMAIL_USER: z
    .string()
    .email('EMAIL_USER debe ser una dirección de email válida'),
  
  /**
   * Contraseña o App Password para autenticación SMTP
   * 
   * Notas importantes:
   * - Para Gmail: Usar "App Password", NO la contraseña principal
   * - Generar en: https://myaccount.google.com/apppasswords
   * - Requiere verificación en 2 pasos activada en la cuenta
   * 
   * Validaciones:
   * - Debe ser una cadena no vacía
   * 
   * @security ⚠️  Usar App Passwords en lugar de contraseñas principales
   * @security ⚠️  Rotar periódicamente por seguridad
   */
  EMAIL_PASSWORD: z
    .string()
    .min(1, 'EMAIL_PASSWORD es requerida'),
  
  /**
   * Remitente por defecto para correos enviados por el sistema
   * 
   * Formato: "Nombre Mostrado <email@dominio.com>"
   * 
   * Propósito:
   * - Identificar claramente al remitente en la bandeja del usuario
   * - Mejorar la entregabilidad y evitar marcados como spam
   * 
   * @default 'OSFLSystem <no-reply@osflsystem.com>'
   * @example EMAIL_FROM=OSFLSystem <voluntarios@osflsystem.org>
   */
  EMAIL_FROM: z
    .string()
    .default('OSFLSystem <no-reply@osflsystem.com>'),

  // ===========================================================================
  // CONFIGURACIÓN DE CORS (Cross-Origin Resource Sharing)
  // ===========================================================================
  
  /**
   * URL del frontend que tendrá permiso para consumir la API
   * 
   * Propósito:
   * - Restringir el acceso a la API solo desde orígenes autorizados
   * - Prevenir ataques CSRF y uso no autorizado de la API
   * 
   * Validaciones:
   * - Debe ser una URL válida (protocolo + dominio + puerto opcional)
   * 
   * Valores típicos:
   * - Desarrollo: 'http://localhost:5173' (Vite), 'http://localhost:3000' (React)
   * - Producción: 'https://app.osflsystem.org'
   * 
   * @example FRONTEND_URL=http://localhost:5173
   */
  FRONTEND_URL: z
    .string()
    .url('FRONTEND_URL debe ser una URL válida (ej: http://localhost:5173)'),

  // ===========================================================================
  // CONFIGURACIÓN DE RATE LIMITING (Protección contra abuso)
  // ===========================================================================
  
  /**
   * Ventana de tiempo para el límite de peticiones (en milisegundos)
   * 
   * Propósito:
   * - Definir el período durante el cual se cuenta el número de peticiones
   * - Prevenir abuso de la API por parte de un mismo cliente
   * 
   * Valores comunes:
   * - 900000 ms = 15 minutos (balance entre seguridad y usabilidad)
   * - 60000 ms = 1 minuto (más restrictivo)
   * 
   * Validaciones:
   * - Debe ser una cadena con solo dígitos
   * - Se transforma automáticamente a número entero
   * 
   * @default '900000' - 15 minutos
   */
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .regex(/^\d+$/, 'RATE_LIMIT_WINDOW_MS debe contener solo números')
    .transform(val => parseInt(val, 10))
    .default('900000'),
  
  /**
   * Número máximo de peticiones permitidas por ventana de tiempo
   * 
   * Propósito:
   * - Limitar la frecuencia de peticiones desde una misma IP/cliente
   * - Proteger contra ataques de fuerza bruta y scraping
   * 
   * Valores recomendados:
   * - API general: 100 peticiones/15min
   * - Auth endpoints: 5-10 peticiones/15min (más restrictivo)
   * 
   * Validaciones:
   * - Debe ser una cadena con solo dígitos
   * - Se transforma automáticamente a número entero
   * 
   * @default '100' - Balance entre usabilidad y protección
   */
  RATE_LIMIT_MAX_REQUESTS: z
    .string()
    .regex(/^\d+$/, 'RATE_LIMIT_MAX_REQUESTS debe contener solo números')
    .transform(val => parseInt(val, 10))
    .default('100'),
});

// =============================================================================
// VALIDACIÓN Y PROCESAMIENTO DE VARIABLES
// =============================================================================

/**
 * Ejecutar la validación del esquema contra las variables actuales
 * 
 * safeParse() retorna un objeto con:
 * - success: boolean - true si todas las validaciones pasaron
 * - data: Object - Las variables validadas y transformadas (si success=true)
 * - error: ZodError - Detalle de los errores (si success=false)
 * 
 * @type {{ success: boolean, data?: Object, error?: ZodError }}
 */
const validation = envSchema.safeParse(process.env);

/**
 * Manejo de errores de validación
 * 
 * Si alguna variable no cumple con su regla:
 * 1. Se imprime un mensaje de error claro en consola
 * 2. Se listan todas las variables con problemas y sus mensajes específicos
 * 3. Se termina el proceso con código de salida 1 (error)
 * 
 * Esto implementa el patrón "fail-fast": es mejor que la app no inicie
 * que iniciar con configuración incorrecta y fallar silenciosamente después.
 */
if (!validation.success) {
  console.error('❌ ERROR DE VALIDACIÓN DE VARIABLES DE ENTORNO:');
  console.error('─────────────────────────────────────────────────────');
  
  // Iterar sobre cada error de validación y mostrarlo de forma legible
  validation.error.errors.forEach(err => {
    // err.path: Array con la ruta de la variable (ej: ['SUPABASE_URL'])
    // err.message: Mensaje descriptivo del error de validación
    console.error(`  • ${err.path.join('.')}: ${err.message}`);
  });
  
  console.error('─────────────────────────────────────────────────────');
  console.error('📝 Solución:');
  console.error('   1. Revisa tu archivo .env en la raíz del backend');
  console.error('   2. Asegúrate de que todas las variables estén presentes');
  console.error('   3. Verifica que los valores tengan el formato correcto');
  console.error('   4. Usa .env.example como referencia');
  console.error('─────────────────────────────────────────────────────');
  
  // Terminar el proceso con código de error (1 = fallo)
  process.exit(1);
}

// =============================================================================
// EXPORTACIÓN DE VARIABLES VALIDADAS
// =============================================================================

/**
 * Objeto con todas las variables de entorno validadas y tipadas
 * 
 * Uso en otros archivos:
 * ```javascript
 * import { env } from './config/env.js';
 * 
 * console.log(env.PORT);           // número: 3000
 * console.log(env.SUPABASE_URL);   // string: 'https://...'
 * console.log(env.NODE_ENV);       // 'development' | 'production' | 'test'
 * ```
 * 
 * @type {z.infer<typeof envSchema>} - Tipo inferido automáticamente por Zod
 */
export const env = validation.data;

/**
 * Helpers booleanos para verificar el entorno actual
 * 
 * Propósito:
 * - Facilitar condicionales basados en el entorno sin repetir código
 * - Mejorar la legibilidad del código en controllers/services
 * 
 * @example
 * if (isDevelopment) {
 *   // Habilitar logs detallados
 * }
 * 
 * if (isProduction) {
 *   // Habilitar caché, minimizar respuestas, etc.
 * }
 */

/**
 * Indica si la aplicación está corriendo en modo desarrollo
 * @type {boolean}
 */
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * Indica si la aplicación está corriendo en modo producción
 * @type {boolean}
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * Indica si la aplicación está corriendo en modo testing
 * @type {boolean}
 * @note Útil para configurar comportamientos específicos en pruebas
 */
export const isTest = env.NODE_ENV === 'test';

// =============================================================================
// LOG DE CONFIRMACIÓN (Solo en desarrollo)
// =============================================================================

/**
 * Imprimir un resumen de la configuración al iniciar (solo en desarrollo)
 * 
 * Propósito:
 * - Confirmar visualmente que las variables se cargaron correctamente
 * - Ayudar en debugging durante el desarrollo
 * 
 * @note En producción, no se imprime para no exponer información sensible
 */
if (isDevelopment) {
  console.log('✅ Variables de entorno validadas correctamente');
  console.log(`🚀 Entorno: ${env.NODE_ENV}`);
  console.log(`📡 Puerto: ${env.PORT}`);
  console.log(`🗄️  Supabase: ${env.SUPABASE_URL.replace(/\/\/[^.]+\./, '//***.')}`);
  console.log(`🔐 JWT: expira en ${env.JWT_EXPIRES_IN}`);
  console.log(`🖼️  Cloudinary: carpeta "${env.CLOUDINARY_UPLOAD_FOLDER}"`);
  console.log(`📧 Email: ${env.EMAIL_FROM}`);
  console.log(`🌐 Frontend: ${env.FRONTEND_URL}`);
  console.log(`🛡️  Rate Limit: ${env.RATE_LIMIT_MAX_REQUESTS} req/${env.RATE_LIMIT_WINDOW_MS/60000}min`);
  console.log('─────────────────────────────────────────────────────\n');
}