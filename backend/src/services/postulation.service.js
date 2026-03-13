import { supabase } from '../config/database.js';

// ---------------------------------------------------------------------------
// CU-14 — Postularse a proyecto
// ---------------------------------------------------------------------------

export const createPostulation = async (miembroId, proyectoId) => {
  // a) Buscar proyecto
  const { data: proyecto, error: proyectoError } = await supabase
    .from('proyectos')
    .select('*')
    .eq('id', proyectoId)
    .single();

  // b) Si no existe
  if (proyectoError || !proyecto) throw new Error('Proyecto no encontrado');

  // c) Verificar estado
  if (proyecto.estado !== 'CONVOCATORIA') {
    throw new Error('El proyecto no esta en convocatoria');
  }

  // d) Contar aceptadas
  const { count, error: countError } = await supabase
    .from('postulaciones')
    .select('*', { count: 'exact', head: true })
    .eq('proyecto_id', proyectoId)
    .eq('estado', 'ACEPTADA');

  if (countError) throw new Error(countError.message);

  // e) Verificar cupos
  if (count >= proyecto.cupos) {
    throw new Error('No hay cupos disponibles');
  }

  // f) Verificar postulacion duplicada
  const { data: existing } = await supabase
    .from('postulaciones')
    .select('id')
    .eq('miembro_id', miembroId)
    .eq('proyecto_id', proyectoId)
    .maybeSingle();

  // g) Si ya existe
  if (existing) throw new Error('Ya tienes una postulacion para este proyecto');

  // h) Insertar
  const { data: postulacion, error: insertError } = await supabase
    .from('postulaciones')
    .insert({ miembro_id: miembroId, proyecto_id: proyectoId, estado: 'PENDIENTE' })
    .select()
    .single();

  if (insertError) throw new Error(insertError.message);

  // i) Retornar
  return postulacion;
};

export const getMyPostulations = async (miembroId) => {
  const { data, error } = await supabase
    .from('postulaciones')
    .select('id, estado, fecha_postulacion, proyectos(nombre, estado, fecha_inicio, fecha_fin)')
    .eq('miembro_id', miembroId)
    .order('fecha_postulacion', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
};

export const getPostulationsByProject = async (proyectoId) => {
  const { data, error } = await supabase
    .from('postulaciones')
    .select('id, estado, fecha_postulacion, observaciones, perfiles(nombre)')
    .eq('proyecto_id', proyectoId)
    .order('fecha_postulacion', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
};

// ---------------------------------------------------------------------------
// CU-15 — Aprobar / Rechazar postulacion
// ---------------------------------------------------------------------------

export const updatePostulationStatus = async (postulacionId, { estado, observaciones }) => {
  // a) Validar estado permitido
  if (!['ACEPTADA', 'RECHAZADA'].includes(estado)) {
    throw new Error('Estado debe ser ACEPTADA o RECHAZADA');
  }

  // b) Buscar postulacion
  const { data: postulacion, error: fetchError } = await supabase
    .from('postulaciones')
    .select('*, proyectos(cupos)')
    .eq('id', postulacionId)
    .single();

  // c) Si no existe
  if (fetchError || !postulacion) throw new Error('Postulacion no encontrada');

  // d) Solo se gestionan pendientes
  if (postulacion.estado !== 'PENDIENTE') {
    throw new Error('Solo se gestionan postulaciones PENDIENTES');
  }

  // e) Si ACEPTADA, verificar cupos nuevamente
  if (estado === 'ACEPTADA') {
    const { count, error: countError } = await supabase
      .from('postulaciones')
      .select('*', { count: 'exact', head: true })
      .eq('proyecto_id', postulacion.proyecto_id)
      .eq('estado', 'ACEPTADA');

    if (countError) throw new Error(countError.message);

    if (count >= postulacion.proyectos.cupos) {
      throw new Error('No hay cupos disponibles para aceptar esta postulacion');
    }
  }

  // f) Actualizar
  const { data: updated, error: updateError } = await supabase
    .from('postulaciones')
    .update({
      estado,
      observaciones: observaciones ?? null,
      fecha_aprobacion: new Date().toISOString(),
    })
    .eq('id', postulacionId)
    .select()
    .single();

  if (updateError) throw new Error(updateError.message);

  // g) Retornar
  return updated;
};