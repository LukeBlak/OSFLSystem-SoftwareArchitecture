import { supabase } from '../config/database.js';

export const createCommittee = async (data) => {
  const { data: committee, error } = await supabase
    .from('comites')
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return committee;
};

export const getCommittees = async (filters = {}) => {
  let query = supabase.from('comites').select('*, organizaciones(nombre)');

  if (filters.organizacion_id) query = query.eq('organizacion_id', filters.organizacion_id);

  const { data, error } = await query.order('nombre');
  if (error) throw new Error(error.message);
  return data;
};

export const getCommitteeById = async (id) => {
  const { data, error } = await supabase
    .from('comites')
    .select('*, organizaciones(nombre)')
    .eq('id', id)
    .single();
  if (error) return null;
  return data;
};

export const updateCommittee = async (id, data) => {
  const committee = await getCommitteeById(id);
  if (!committee) throw new Error('Comité no encontrado');

  const { data: updated, error } = await supabase
    .from('comites')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return updated;
};

export const deleteCommittee = async (id) => {
  const committee = await getCommitteeById(id);
  if (!committee) throw new Error('Comité no encontrado');

  const { error } = await supabase.from('comites').delete().eq('id', id);
  if (error) throw new Error(error.message);
};
