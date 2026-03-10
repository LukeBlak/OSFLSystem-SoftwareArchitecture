// Con Supabase Auth los JWTs son emitidos y verificados por Supabase.
// Este módulo expone constantes de configuración utilizadas por el middleware.
import { env } from './env.js';

export const JWT_EXPIRES_IN = env.JWT_EXPIRES_IN;
