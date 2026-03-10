import { supabase } from '../config/database.js';

export const getMembers = async (filters = {}) => {
  let query = supabase.from('miembros').select('*, organizaciones(nombre)');

  if (filters.organizacion_id) query = query.eq('organizacion_id', filters.organizacion_id);
  if (filters.estado) query = query.eq('estado', filters.estado);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

export const getMemberById = async (id) => {
  const { data, error } = await supabase
    .from('miembros')
    .select('*, organizaciones(nombre)')
    .eq('id', id)
    .single();
  if (error) return null;
  return data;
};

export const getMemberByUserId = async (userId) => {
  const { data, error } = await supabase
    .from('miembros')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error) return null;
  return data;
};

export const registerMember = async (data) => {
  const { data: member, error } = await supabase
    .from('miembros')
    .insert({ ...data, estado: 'ACTIVO' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return member;
};

export const deactivateMember = async (id, motivo) => {
  const member = await getMemberById(id);
  if (!member) throw new Error('Miembro no encontrado');
  if (member.estado === 'INACTIVO') throw new Error('El miembro ya está inactivo');

  const { data: updated, error } = await supabase
    .from('miembros')
    .update({ estado: 'INACTIVO', motivo_baja: motivo, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return updated;
};
