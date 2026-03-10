import { supabase } from '../config/database.js';

// ---------------------------------------------------------------------------
// CU-12 — Planificar Proyecto
// ---------------------------------------------------------------------------

export const createProject = async (data, organizacionId) => {
  const { nombre, descripcion, cupos, fecha_inicio, fecha_fin, presupuesto_asignado, recomendacion_horas } = data;

  const { data: proyecto, error } = await supabase
    .from('proyectos')
    .insert({
      nombre,
      descripcion,
      cupos,
      fecha_inicio,
      fecha_fin,
      presupuesto_asignado,
      recomendacion_horas,
      organizacion_id: organizacionId,
      estado: 'PLANIFICACION',
      presupuesto_ejecutado: 0,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return proyecto;
};

export const getProjects = async (filters = {}) => {
  let query = supabase.from('proyectos').select('*');

  if (filters.estado) {
    query = query.eq('estado', filters.estado);
  }

  if (filters.organizacion_id) {
    query = query.eq('organizacion_id', filters.organizacion_id);
  }

  const { data: proyectos, error } = await query;

  if (error) throw new Error(error.message);

  return proyectos;
};

export const getProjectById = async (id) => {
  const { data: proyecto, error } = await supabase
    .from('proyectos')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;

  return proyecto;
};

export const updateProject = async (id, data) => {
  const proyecto = await getProjectById(id);

  if (!proyecto) throw new Error('Proyecto no encontrado');

  if (!['PLANIFICACION', 'CONVOCATORIA'].includes(proyecto.estado)) {
    throw new Error(`No se puede editar un proyecto en estado ${proyecto.estado}`);
  }

  const { data: actualizado, error } = await supabase
    .from('proyectos')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  return actualizado;
};

// ---------------------------------------------------------------------------
// CU-13 — Vincular Comité
// ---------------------------------------------------------------------------

export const assignCommittee = async (projectId, comiteId) => {
  const proyecto = await getProjectById(projectId);

  if (!proyecto) throw new Error('Proyecto no encontrado');

  if (proyecto.estado !== 'PLANIFICACION') {
    throw new Error('Solo se puede vincular en estado PLANIFICACION');
  }

  const { data: comite, error: comiteError } = await supabase
    .from('comites')
    .select('id')
    .eq('id', comiteId)
    .single();

  if (comiteError || !comite) throw new Error('Comité no encontrado');

  const { data: actualizado, error } = await supabase
    .from('proyectos')
    .update({ comite_id: comiteId, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  return actualizado;
};
