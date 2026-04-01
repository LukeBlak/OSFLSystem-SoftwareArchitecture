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

    // Mapear los datos al esquema de la base de datos
    const newProject = {
      nombre: projectData.nombre,
      descripcion: projectData.descripcion,
      cupos: projectData.cupos,
      fechainicio: projectData.fechainicio,
      fechafin: projectData.fechafin,
      presupuestoasignado: projectData.presupuestoasignado || 0,
      recomendacionhoras: projectData.recomendacionhoras,
      comiteid: projectData.comiteid,
      organizacionid: organizationId
    };

    const { data: project, error } = await supabase
      .from('proyecto')
      .insert([newProject])
      .select()
      .single();

    if (error) {
      logger.error('Error al crear proyecto', { error, projectData });
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
