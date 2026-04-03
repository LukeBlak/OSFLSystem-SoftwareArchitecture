import { supabase } from '../config/supabase.js';
import { getRequestSupabaseClient } from '../utils/requestContext.js';

const TABLE = 'usuario';
const getDb = () => getRequestSupabaseClient() || supabase;

const wrapEntity = (row) => (row ? { ...row, data: row, error: null } : null);

export const UserRepository = {
  async findByEmail(email) {
    const { data, error } = await getDb()
      .from(TABLE)
      .select('*')
      .eq('email', email?.toLowerCase())
      .limit(1)
      .maybeSingle();

    if (error) {
      return null;
    }

    return wrapEntity(data);
  },

  async create(payload) {
    const { data, error } = await getDb()
      .from(TABLE)
      .insert(payload)
      .select('*')
      .single();

    return { data, error };
  },

  async findById(userId) {
    const { data, error } = await getDb()
      .from(TABLE)
      .select('*')
      .eq('id', userId)
      .limit(1)
      .maybeSingle();

    if (error) {
      return null;
    }

    return wrapEntity(data);
  },

  async updateLastSignIn(userId) {
    return getDb()
      .from(TABLE)
      .update({
        ultimoAcceso: new Date().toISOString(),
        modificadoPor: userId,
      })
      .eq('id', userId);
  },

  async updatePasswordChangedAt(userId) {
    return getDb()
      .from(TABLE)
      .update({
        passwordChangedAt: new Date().toISOString(),
        modificadoPor: userId,
      })
      .eq('id', userId);
  },

  async updateEmailVerified(userId, isVerified = true) {
    return getDb()
      .from(TABLE)
      .update({
        emailVerificado: Boolean(isVerified),
        modificadoPor: userId,
      })
      .eq('id', userId);
  },
};
