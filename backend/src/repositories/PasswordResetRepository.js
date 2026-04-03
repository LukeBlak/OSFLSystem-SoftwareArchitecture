import bcrypt from 'bcryptjs';
import { supabase } from '../config/supabase.js';
import { getRequestSupabaseClient } from '../utils/requestContext.js';

const TABLE = 'password_reset';
const getDb = () => getRequestSupabaseClient() || supabase;

const wrapEntity = (row) => (row ? { ...row, data: row, error: null } : null);

const isNotExpired = (row) => {
  if (!row?.expiresAt) {
    return true;
  }

  return new Date(row.expiresAt).getTime() > Date.now();
};

export const PasswordResetRepository = {
  async findActiveByUserId(userId) {
    const { data, error } = await getDb()
      .from(TABLE)
      .select('*')
      .eq('userId', userId)
      .eq('used', false)
      .order('fecha_creacion', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data || !isNotExpired(data)) {
      return null;
    }

    return wrapEntity(data);
  },

  async upsert(payload) {
    const active = await this.findActiveByUserId(payload.userId);

    if (active?.id) {
      const { data, error } = await getDb()
        .from(TABLE)
        .update({
          token: payload.token,
          expiresAt: payload.expiresAt,
          used: false,
          modificadoPor: payload.userId,
        })
        .eq('id', active.id)
        .select('*')
        .single();

      return { data, error };
    }

    const { data, error } = await getDb()
      .from(TABLE)
      .insert(payload)
      .select('*')
      .single();

    return { data, error };
  },

  async findValid(rawToken) {
    const { data, error } = await getDb()
      .from(TABLE)
      .select('*')
      .eq('used', false)
      .order('fecha_creacion', { ascending: false })
      .limit(20);

    if (error) {
      return { resetRecord: null, error };
    }

    for (const row of data || []) {
      if (!isNotExpired(row)) {
        continue;
      }

      const isMatch = await bcrypt.compare(rawToken, row.token);
      if (isMatch) {
        return { resetRecord: row, error: null };
      }
    }

    return { resetRecord: null, error: null };
  },

  async markAsUsed(resetId) {
    return getDb()
      .from(TABLE)
      .update({
        used: true,
        usedAt: new Date().toISOString(),
      })
      .eq('id', resetId);
  },
};
