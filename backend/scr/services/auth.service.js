import { supabase } from '../config/database.js';

export const register = async ({ email, password, nombre, apellido, role = 'VOLUNTARIO' }) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nombre, apellido, role } },
  });
  if (error) throw new Error(error.message);
  return data;
};

export const login = async ({ email, password }) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
};

export const forgotPassword = async (email, redirectTo) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw new Error(error.message);
};

export const updatePassword = async (newPassword) => {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
  return data;
};
