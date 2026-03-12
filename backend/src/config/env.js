import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().regex(/^\d+$/).transform(val => parseInt(val, 10)).default('3000'),
  
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('1h'),
  
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  CLOUDINARY_UPLOAD_FOLDER: z.string().default('osflsystem'),
  
  EMAIL_HOST: z.string().min(1),
  EMAIL_PORT: z.string().regex(/^\d+$/).transform(val => parseInt(val, 10)),
  EMAIL_USER: z.string().email(),
  EMAIL_PASSWORD: z.string().min(1),
  EMAIL_FROM: z.string().default('OSFLSystem <no-reply@osflsystem.com>'),
  
  FRONTEND_URL: z.string().url(),
  
  RATE_LIMIT_WINDOW_MS: z.string().regex(/^\d+$/).transform(val => parseInt(val, 10)).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().regex(/^\d+$/).transform(val => parseInt(val, 10)).default('100'),
});

const validation = envSchema.safeParse(process.env);

if (!validation.success) {
  console.error('❌ ERROR DE VALIDACIÓN DE VARIABLES DE ENTORNO:');
  validation.error.errors.forEach(err => {
    console.error(`  • ${err.path.join('.')}: ${err.message}`);
  });
  process.exit(1);
}

export const env = validation.data;
export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';