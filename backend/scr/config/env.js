/**
 * =============================================================================
 * CONFIGURACIÓN DE VARIABLES DE ENTORNO
 * =============================================================================
 * 
 * Propósito:
 * - Validar que todas las variables de entorno requeridas existan
 * - Validar que los valores tengan el formato correcto
 * - Centralizar el acceso a las variables de entorno en toda la aplicación
 * 
 * Librería: Zod (validación de esquemas)
 * 
 * @module config/env
 */

import { z } from 'zod';
import dotenv from 'dotenv';

// Cargar variables de entorno desde el archivo .env
dotenv.config();

/**
 * Esquema de validación para las variables de entorno
 * 
 * Cada campo define:
 * - El tipo de dato esperado
 * - Si es requerido o opcional
 * - Valores permitidos (enums)
 * - Patrones específicos (regex)
 */
const envSchema = z.object({
  // ---------------------------------------------------------------------------
  // SERVIDOR
  // ---------------------------------------------------------------------------
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  
  PORT: z
    .string()
    .regex(/^\d+$/, 'PORT debe ser un número')
    .transform(val => parseInt(val, 10))
    .default('3000'),

  // ---------------------------------------------------------------------------
  // BASE DE DATOS
  // ---------------------------------------------------------------------------
  MONGODB_URI: z
    .string()
    .min(1, 'MONGODB_URI es requerida')
    .refine(
      val => val.startsWith('mongodb://') || val.startsWith('mongodb+srv://'),
      'MONGODB_URI debe comenzar con mongodb:// o mongodb+srv://'
    ),

  // ---------------------------------------------------------------------------
  // JWT (Autenticación)
  // ---------------------------------------------------------------------------
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET debe tener al menos 32 caracteres para seguridad'),
  
  JWT_EXPIRES_IN: z
    .string()
    .default('24h'),

  // ---------------------------------------------------------------------------
  // CLOUDINARY (Imágenes)
  // ---------------------------------------------------------------------------
  CLOUDINARY_CLOUD_NAME: z
    .string()
    .min(1, 'CLOUDINARY_CLOUD_NAME es requerida'),
  
  CLOUDINARY_API_KEY: z
    .string()
    .min(1, 'CLOUDINARY_API_KEY es requerida'),
  
  CLOUDINARY_API_SECRET: z
    .string()
    .min(1, 'CLOUDINARY_API_SECRET es requerida'),
  
  CLOUDINARY_UPLOAD_FOLDER: z
    .string()
    .default('osflsystem'),

  // ---------------------------------------------------------------------------
  // EMAIL (Nodemailer)
  // ---------------------------------------------------------------------------
  EMAIL_HOST: z
    .string()
    .min(1, 'EMAIL_HOST es requerida'),
  
  EMAIL_PORT: z
    .string()
    .regex(/^\d+$/, 'EMAIL_PORT debe ser un número')
    .transform(val => parseInt(val, 10))
    .default('587'),
  
  EMAIL_USER: z
    .string()
    .email('EMAIL_USER debe ser un email válido'),
  
  EMAIL_PASSWORD: z
    .string()
    .min(1, 'EMAIL_PASSWORD es requerida'),
  
  EMAIL_FROM: z
    .string()
    .default('OSFLSystem <no-reply@osflsystem.com>'),

  // ---------------------------------------------------------------------------
  // CORS
  // ---------------------------------------------------------------------------
  FRONTEND_URL: z
    .string()
    .url('FRONTEND_URL debe ser una URL válida'),

  // ---------------------------------------------------------------------------
  // RATE LIMITING
  // ---------------------------------------------------------------------------
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .regex(/^\d+$/, 'RATE_LIMIT_WINDOW_MS debe ser un número')
    .transform(val => parseInt(val, 10))
    .default('900000'),
  
  RATE_LIMIT_MAX_REQUESTS: z
    .string()
    .regex(/^\d+$/, 'RATE_LIMIT_MAX_REQUESTS debe ser un número')
    .transform(val => parseInt(val, 10))
    .default('100'),
});

/**
 * Validar las variables de entorno
 * 
 * Si alguna variable falta o tiene un formato inválido, el proceso se detendrá
 * con un mensaje de error claro indicando qué está mal.
 */
const validation = envSchema.safeParse(process.env);

if (!validation.success) {
  console.error('❌ ERROR DE VALIDACIÓN DE VARIABLES DE ENTORNO:');
  console.error('─────────────────────────────────────────────────────');
  
  // Mostrar cada error de validación de forma clara
  validation.error.errors.forEach(err => {
    console.error(`  • ${err.path.join('.')}: ${err.message}`);
  });
  
  console.error('─────────────────────────────────────────────────────');
  console.error('📝 Revisa tu archivo .env y asegúrate de que todas');
  console.error('   las variables estén configuradas correctamente.');
  console.error('📄 Puedes usar .env.example como referencia.');
  console.error('─────────────────────────────────────────────────────');
  
  // Salir del proceso con código de error
  process.exit(1);
}

/**
 * Objeto exportado con las variables de entorno validadas
 * 
 * Uso en otros archivos:
 * import { env } from './config/env.js';
 * console.log(env.PORT);
 */
export const env = validation.data;

/**
 * Helper para verificar si estamos en producción
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * Helper para verificar si estamos en desarrollo
 */
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * Helper para verificar si estamos en testing
 */
export const isTest = env.NODE_ENV === 'test';

// Log de confirmación (solo en desarrollo)
if (isDevelopment) {
  console.log('✅ Variables de entorno validadas correctamente');
  console.log(`🚀 Servidor configurado para: ${env.NODE_ENV}`);
  console.log(`📡 Puerto: ${env.PORT}`);
  console.log(`🗄️  MongoDB: ${env.MONGODB_URI}`);
}