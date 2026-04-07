import { ApiError } from '../utils/apiError.js';
import { logger } from '../utils/logger.js';

/**
 * -----------------------------------------------------------------------------
 * CREAR PROYECTO (CU-12)
 * -----------------------------------------------------------------------------
 */
export const createProject = async (supabase, projectData, organizationId) => {
  try {
    if (!projectData.nombre) throw ApiError.badRequest('El nombre del proyecto es requerido');
    if (!organizationId) throw ApiError.badRequest('La organización del proyecto es requerida');

    const fechaInicio = projectData.fechainicio ?? projectData.fecha_inicio ?? null;
    const fechaFin = projectData.fechafin ?? projectData.fecha_fin ?? null;
    const presupuestoAsignado = projectData.presupuestoasignado ?? projectData.presupuesto_asignado ?? 0;
    const recomendacionHoras = projectData.recomendacionhoras ?? projectData.recomendacion_horas ?? 0;
    const comiteId = projectData.comiteid ?? projectData.comiteId ?? null;

    if (!fechaInicio) throw ApiError.badRequest('La fecha de inicio es requerida');
    if (!fechaFin) throw ApiError.badRequest('La fecha de fin es requerida');

    // Mapear los datos al esquema de la base de datos
    const newProject = {
      nombre: projectData.nombre,
      descripcion: projectData.descripcion ?? null,
      cupos: projectData.cupos,
      fechainicio: fechaInicio,
      fechafin: fechaFin,
      presupuestoasignado: presupuestoAsignado,
      recomendacionhoras: recomendacionHoras,
      comiteid: comiteId,
      organizacionid: organizationId
    };

    const { data: project, error } = await supabase
      .from('proyecto')
      .insert([newProject])
      .select()
      .single();

    if (error) {
      logger.error('Error al crear proyecto', {
        error,
        errorMessage: error?.message,
        errorCode: error?.code,
        errorDetails: error?.details,
        errorHint: error?.hint,
        projectData,
        newProject,
      });
      throw ApiError.internal('Error al crear el proyecto en Supabase');
    }

    return project;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error inesperado en createProject', { error: error.message });
    throw ApiError.internal('Error al crear proyecto');
  }
};

/**
 * -----------------------------------------------------------------------------
 * OBTENER TODOS LOS PROYECTOS
 * -----------------------------------------------------------------------------
 */
export const getProjects = async (supabase, filters = {}) => {
  try {
    let query = supabase.from('proyecto').select('*');

    if (filters.organizacionid) {
      query = query.eq('organizacionid', filters.organizacionid);
    }
    if (filters.comiteid) {
      query = query.eq('comiteid', filters.comiteid);
    }
    if (filters.estado) {
      query = query.eq('estado', filters.estado);
    }

    // Paginación super basica (opcional)
    if (filters.limit) {
      query = query.limit(parseInt(filters.limit));
    }

    const { data: projects, error } = await query;

    if (error) {
      logger.error('Error al obtener proyectos', { error, filters });
      throw ApiError.internal('Error al obtener proyectos');
    }

    return projects;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.internal('Error al obtener proyectos');
  }
};

/**
 * -----------------------------------------------------------------------------
 * OBTENER PROYECTO POR ID
 * -----------------------------------------------------------------------------
 */
export const getProjectById = async (supabase, projectId) => {
  try {
    const { data: project, error } = await supabase
      .from('proyecto')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is not found
      logger.error('Error al obtener proyecto', { error, projectId });
      throw ApiError.internal('Error obteniendo detalles del proyecto');
    }

    return project;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.internal('Error al obtener proyecto');
  }
};

/**
 * -----------------------------------------------------------------------------
 * ACTUALIZAR PROYECTO
 * -----------------------------------------------------------------------------
 */
export const updateProject = async (supabase, projectId, updateData) => {
  try {
    const { data: project, error } = await supabase
      .from('proyecto')
      .update(updateData)
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      logger.error('Error al actualizar proyecto', { error, projectId, updateData });
      throw ApiError.internal('Error al actualizar el proyecto');
    }

    return project;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.internal('Error al actualizar proyecto');
  }
};

/**
 * -----------------------------------------------------------------------------
 * ACTUALIZAR ESTADO DE PROYECTO
 * -----------------------------------------------------------------------------
 */
export const updateProjectStatus = async (supabase, projectId, estado) => {
  try {
    if (!estado) throw ApiError.badRequest('El estado del proyecto es requerido');

    const normalizedEstado = String(estado).trim().toLowerCase();
    const estadoToPersist = ['convocatoria', 'activo', 'en_ejecucion', 'en ejecucion', 'ejecucion'].includes(normalizedEstado)
      ? 'En_Ejecucion'
      : estado;

    const { data: project, error } = await supabase
      .from('proyecto')
      .update({ estado: estadoToPersist })
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      logger.error('Error al actualizar estado del proyecto', { error, projectId, estado });
      const errorMessage = String(error?.message || '').toLowerCase();

      if (error?.code === '22P02' || errorMessage.includes('invalid input value for enum')) {
        throw ApiError.badRequest('El estado proporcionado no es válido para este proyecto');
      }

      if (error?.code === '42501') {
        throw ApiError.forbidden('No tienes permisos para actualizar el estado de este proyecto');
      }

      throw ApiError.internal('Error al actualizar el estado del proyecto');
    }

    return project;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.internal('Error al actualizar estado del proyecto');
  }
};

/**
 * -----------------------------------------------------------------------------
 * ASIGNAR A COMITÉ (CU-13)
 * -----------------------------------------------------------------------------
 */
export const assignCommittee = async (supabase, projectId, comiteId) => {
  try {
    if (!comiteId) throw ApiError.badRequest('El ID del comité es requerido');

    // Verificar si comité existe
    const { data: comite, error: comError } = await supabase
      .from('comite')
      .select('id')
      .eq('id', comiteId)
      .single();

    if (comError || !comite) {
      throw ApiError.notFound('El comité especificado no existe');
    }

    // Actualizar proyecto en Supabase
    const { data: project, error } = await supabase
      .from('proyecto')
      .update({ comiteid: comiteId })
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      logger.error('Error al asignar comité al proyecto', { error, projectId, comiteId });
      throw ApiError.internal('Error al vincular el proyecto al comité');
    }

    return project;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.internal('Error al asignar comité al proyecto');
  }
};
