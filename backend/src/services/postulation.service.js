import { ApiError } from '../utils/apiError.js';
import { logger } from '../utils/logger.js';

// ---------------------------------------------------------------------------
// CU-14 — Postularse a proyecto
// ---------------------------------------------------------------------------

export const createPostulation = async (supabase, miembroId, proyectoId) => {
  try {
    // a) Buscar proyecto
    const { data: proyecto, error: proyectoError } = await supabase
      .from('proyecto')
      .select('*')
      .eq('id', proyectoId)
      .single();

    // b) Si no existe o da error
    if (proyectoError || !proyecto) throw ApiError.notFound('Proyecto no encontrado');

    // c) Verificar estado
    if (proyecto.estado !== 'Convocatoria') {
      throw ApiError.badRequest('El proyecto no está en fase de convocatoria');
    }

    // d) Contar aceptadas
    const { count, error: countError } = await supabase
      .from('postulacion')
      .select('*', { count: 'exact', head: true })
      .eq('proyectoid', proyectoId)
      .eq('estado', 'Aceptada');

    if (countError) throw ApiError.internal('Error al validar cupos del proyecto');

    // e) Verificar cupos
    if (count >= proyecto.cupos) {
      throw ApiError.conflict('No hay cupos disponibles en este proyecto');
    }

    // f) Verificar postulacion duplicada
    const { data: existing } = await supabase
      .from('postulacion')
      .select('id')
      .eq('miembroid', miembroId)
      .eq('proyectoid', proyectoId)
      .maybeSingle();

    // g) Si ya existe
    if (existing) throw ApiError.conflict('Ya te has postulado a este proyecto');

    // h) Insertar (estado pendiente por defecto o via db)
    const { data: postulacion, error: insertError } = await supabase
      .from('postulacion')
      .insert({ miembroid: miembroId, proyectoid: proyectoId, estado: 'Pendiente' })
      .select()
      .single();

    if (insertError) {
      logger.error('Error insertando postulación', { insertError });
      throw ApiError.internal('Error al crear la postulación');
    }

    // i) Retornar
    return postulacion;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.internal('Error inesperado al crear postulación');
  }
};

export const getMyPostulations = async (supabase, miembroId) => {
  try {
    const { data, error } = await supabase
      .from('postulacion')
      .select('id, estado, fechapostulacion, proyecto(nombre, estado, fechainicio, fechafin)')
      .eq('miembroid', miembroId)
      .order('fechapostulacion', { ascending: false });

    if (error) {
      logger.error('Error trayendo mis postulaciones', { error });
      throw ApiError.internal('Error al obtener tus postulaciones');
    }
    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.internal('Error inesperado al obtener postulaciones');
  }
};

export const getPostulationsByProject = async (supabase, proyectoId) => {
  try {
    const { data, error } = await supabase
      .from('postulacion')
      .select('id, estado, fechapostulacion, observaciones, miembro(*)')
      .eq('proyectoid', proyectoId)
      .order('fechapostulacion', { ascending: false });

    if (error) {
      logger.error('Error trayendo postulaciones del proyecto', { error });
      throw ApiError.internal('Error al obtener postulaciones del proyecto');
    }
    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.internal('Error inesperado al obtener postulaciones del proyecto');
  }
};

// ---------------------------------------------------------------------------
// CU-15 — Aprobar / Rechazar postulacion
// ---------------------------------------------------------------------------

export const updatePostulationStatus = async (supabase, postulacionId, { estado, observaciones }) => {
  try {
    // a) Validar estado permitido
    if (!['Aceptada', 'Rechazada'].includes(estado)) {
      throw ApiError.badRequest('Estado debe ser Aceptada o Rechazada');
    }

    // b) Buscar postulacion y cupos de su proyecto
    const { data: postulacion, error: fetchError } = await supabase
      .from('postulacion')
      .select('*, proyecto!inner(cupos)')
      .eq('id', postulacionId)
      .single();

    // c) Si no existe
    if (fetchError || !postulacion) throw ApiError.notFound('Postulación no encontrada');

    // d) Solo se gestionan pendientes
    if (postulacion.estado !== 'Pendiente') {
      throw ApiError.conflict('Solo se pueden gestionar postulaciones Pendientes');
    }

    // e) Si Aceptada, verificar cupos nuevamente
    if (estado === 'Aceptada') {
      const { count, error: countError } = await supabase
        .from('postulacion')
        .select('*', { count: 'exact', head: true })
        .eq('proyectoid', postulacion.proyectoid)
        .eq('estado', 'Aceptada');

      if (countError) throw ApiError.internal('Error al verificar cupos del proyecto');

      if (count >= postulacion.proyecto.cupos) {
        throw ApiError.conflict('No hay cupos disponibles para aceptar esta postulación');
      }
    }

    // f) Actualizar
    const { data: updated, error: updateError } = await supabase
      .from('postulacion')
      .update({
        estado,
        observaciones: observaciones ?? null,
      })
      .eq('id', postulacionId)
      .select()
      .single();

    if (updateError) {
      logger.error('Error actualizando postulación', { updateError });
      throw ApiError.internal('Error al actualizar el estado de la postulación');
    }

    // g) Retornar
    return updated;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.internal('Error inesperado al actualizar postulación');
  }
};