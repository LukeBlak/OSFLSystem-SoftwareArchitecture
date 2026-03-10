import { supabase } from '../config/database.js';

export const createOrganization = async (data) => {
  const { data: org, error } = await supabase
    .from('organizaciones')
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return org;
};

export const getOrganizations = async () => {
  const { data, error } = await supabase
    .from('organizaciones')
    .select('*')
    .order('nombre');
  if (error) throw new Error(error.message);
  return data;
};

export const getOrganizationById = async (id) => {
  const { data, error } = await supabase
    .from('organizaciones')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data;
};

export const updateOrganization = async (id, data) => {
  const org = await getOrganizationById(id);
  if (!org) throw new Error('Organización no encontrada');

  const { data: updated, error } = await supabase
    .from('organizaciones')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return updated;
};

export const deleteOrganization = async (id) => {
  const org = await getOrganizationById(id);
  if (!org) throw new Error('Organización no encontrada');

  const { error } = await supabase.from('organizaciones').delete().eq('id', id);
  if (error) throw new Error(error.message);
};
