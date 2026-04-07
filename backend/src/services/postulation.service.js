import { ApiError } from '../utils/apiError.js';
import { logger } from '../utils/logger.js';
import { supabaseAdmin } from '../config/supabase.js';

// ---------------------------------------------------------------------------
// CU-14 — Postularse a proyecto
// ---------------------------------------------------------------------------

export const createPostulation = async (supabase, miembroId, proyectoId) => {
  try {
    // a) Buscar proyecto
    const db = supabaseAdmin || supabase;
    const { data: proyecto, error: proyectoError } = await db
      .from('proyecto')
      .select('*')
      .eq('id', proyectoId)
      .single();

    // b) Si no existe o da error
    if (proyectoError || !proyecto) throw ApiError.notFound('Proyecto no encontrado');

    // c) Verificar estado
    const estadoProyecto = String(proyecto.estado || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, '_');

    const openForPostulationStates = [
      'en_ejecucion',
      'ejecucion',
      'planificacion',
      'convocatoria',
    ];

    if (!openForPostulationStates.includes(estadoProyecto)) {
      throw ApiError.badRequest('El proyecto no está habilitado para postulación');
    }

    // d) Contar aceptadas
    const { count, error: countError } = await db
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
    const { data: existing } = await db
      .from('postulacion')
      .select('id')
      .eq('miembroid', miembroId)
      .eq('proyectoid', proyectoId)
      .maybeSingle();

    // g) Si ya existe
    if (existing) throw ApiError.conflict('Ya te has postulado a este proyecto');

    // h) Insertar (estado pendiente por defecto o via db)
    const { data: postulacion, error: insertError } = await db
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
    const db = supabaseAdmin || supabase;
    const { data, error } = await db
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
    const db = supabaseAdmin || supabase;
    const { data, error } = await db
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
    const normalizedEstado = String(estado || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();

    const estadoCanonical = normalizedEstado === 'aceptada'
      ? 'Aceptada'
      : normalizedEstado === 'rechazada'
        ? 'Rechazada'
        : null;

    if (!estadoCanonical) {
      throw ApiError.badRequest('Estado debe ser Aceptada o Rechazada');
    }

    // b) Buscar postulacion
    const db = supabaseAdmin || supabase;
    const { data: postulacion, error: fetchError } = await db
      .from('postulacion')
      .select('id, estado, proyectoid')
      .eq('id', postulacionId)
      .single();

    // c) Si no existe
    if (fetchError || !postulacion) throw ApiError.notFound('Postulación no encontrada');

    // d) Solo se gestionan pendientes
    const estadoActual = String(postulacion.estado || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();

    if (estadoActual !== 'pendiente') {
      throw ApiError.conflict('Solo se pueden gestionar postulaciones Pendientes');
    }

    // e) Si Aceptada, verificar cupos nuevamente
    // c) Buscar proyecto para validar cupos
    const { data: proyecto, error: proyectoError } = await db
      .from('proyecto')
      .select('id, cupos')
      .eq('id', postulacion.proyectoid)
      .single();

    if (proyectoError || !proyecto) {
      throw ApiError.notFound('Proyecto no encontrado para la postulación');
    }

    if (estadoCanonical === 'Aceptada') {
      const { count, error: countError } = await db
        .from('postulacion')
        .select('*', { count: 'exact', head: true })
        .eq('proyectoid', postulacion.proyectoid)
        .eq('estado', 'Aceptada');

      if (countError) throw ApiError.internal('Error al verificar cupos del proyecto');

      if (count >= proyecto.cupos) {
        throw ApiError.conflict('No hay cupos disponibles para aceptar esta postulación');
      }
    }

    // f) Actualizar
    const { data: updated, error: updateError } = await db
      .from('postulacion')
      .update({
        estado: estadoCanonical,
        fechaaprobacion: estadoCanonical === 'Aceptada' ? new Date().toISOString() : null,
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