import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
    },
    global: {
      headers: {
        'X-Client-Info': 'osflsystem-backend',
      },
    },
  }
);

export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export const checkSupabaseConnection = async () => {
  try {
    const { error } = await supabase.from('usuario').select('id').limit(1);
    return {
      isConnected: !error,
      error: error ? {
        message: error.message,
        details: error.details,
      } : null,
    };
  } catch (error) {
    return {
      isConnected: false,
      error: {
        message: error.message,
        details: error.toString(),
      },
    };
  }
};