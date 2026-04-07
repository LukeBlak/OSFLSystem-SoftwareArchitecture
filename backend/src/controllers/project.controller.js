import * as projectService from '../services/project.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { supabaseAdmin } from '../config/supabase.js';

const resolveOrganizationIdForUser = async (user) => {
  const direct = user?.organizationId
    || user?.organizacionId
    || user?.organization_id
    || user?.organizacion_id
    || null;

  if (direct) return direct;

  if (user?.id) {
    const { data, error } = await supabaseAdmin
      .from('lider_organizacion')
      .select('organizacionid')
      .eq('id', user.id)
      .limit(1)
      .maybeSingle();

    if (!error && data?.organizacionid) {
      return data.organizacionid;
    }

    const { data: committeeAsLeader, error: committeeAsLeaderError } = await supabaseAdmin
      .from('comite')
      .select('organizacionid')
      .eq('lidercomiteid', user.id)
      .limit(1)
      .maybeSingle();

    if (!committeeAsLeaderError && committeeAsLeader?.organizacionid) {
      return committeeAsLeader.organizacionid;
    }

    const { data: memberCommittee, error: memberCommitteeError } = await supabaseAdmin
      .from('miembro_comite')
      .select('comiteid')
      .eq('miembroid', user.id)
      .limit(1)
      .maybeSingle();

    if (!memberCommitteeError && memberCommittee?.comiteid) {
      const { data: committeeByMembership, error: committeeByMembershipError } = await supabaseAdmin
        .from('comite')
        .select('organizacionid')
        .eq('id', memberCommittee.comiteid)
        .limit(1)
        .maybeSingle();

      if (!committeeByMembershipError && committeeByMembership?.organizacionid) {
        return committeeByMembership.organizacionid;
      }
    }
  }

  return null;
};

export const createProject = async (req, res, next) => {
  try {
    const organizationId = await resolveOrganizationIdForUser(req.user);
    if (!organizationId) {
      return next(new ApiError(400, 'No se pudo resolver la organización del usuario autenticado'));
    }

    const project = await projectService.createProject(supabaseAdmin, req.body, organizationId);
    res.status(201).json(ApiResponse.created(project, 'Proyecto creado'));
  } catch (err) {
    next(err);
  }
};

export const getProjects = async (req, res, next) => {
  try {
    const queryOrganizationId = req.query?.organizacionid || req.query?.organizacionId || null;
    const userOrganizationId = req.user?.organizationId || await resolveOrganizationIdForUser(req.user);

    if (!userOrganizationId) {
      const projects = await projectService.getProjects(req.supabase, { ...req.query });

      return res.json(ApiResponse.ok(projects, 'Proyectos obtenidos'));
      
    }

    if (queryOrganizationId && queryOrganizationId !== userOrganizationId) {
      return next(new ApiError(403, 'No tienes permisos para consultar proyectos de otra asociación'));
    }

    const projects = await projectService.getProjects(req.supabase, {
      ...req.query,
      organizacionid: userOrganizationId,
    });
    res.json(ApiResponse.ok(projects, 'Proyectos obtenidos'));
  } catch (err) {
    next(err);
  }
};

export const getProjectById = async (req, res, next) => {
  try {
    const project = await projectService.getProjectById(req.supabase, req.params.id);
    if (!project) return next(new ApiError(404, 'Proyecto no encontrado'));
    res.json(ApiResponse.ok(project, 'Proyecto'));
  } catch (err) {
    next(err);
  }
};

export const updateProject = async (req, res, next) => {
  try {
    const project = await projectService.updateProject(req.supabase, req.params.id, req.body);
    res.json(ApiResponse.ok(project, 'Proyecto actualizado'));
  } catch (err) {
    next(err);
  }
};

export const assignCommittee = async (req, res, next) => {
  try {
    const { comiteId } = req.body;
    if (!comiteId) return next(new ApiError(400, 'comiteId es requerido'));
    const project = await projectService.assignCommittee(req.supabase, req.params.id, comiteId);
    res.json(ApiResponse.ok(project, 'Comité vinculado'));
  } catch (err) {
    next(err);
  }
};

export const updateProjectStatus = async (req, res, next) => {
  try {
    const { estado } = req.body;

    if (!estado) {
      return next(new ApiError(400, 'estado es requerido'));
    }

    const userOrganizationId = req.user?.organizationId || await resolveOrganizationIdForUser(req.user);
    if (!userOrganizationId) {
      return next(new ApiError(400, 'No se pudo resolver la organización del usuario autenticado'));
    }

    const { data: existingProject, error: projectLookupError } = await supabaseAdmin
      .from('proyecto')
      .select('id, organizacionid')
      .eq('id', req.params.id)
      .maybeSingle();

    if (projectLookupError || !existingProject) {
      return next(new ApiError(404, 'Proyecto no encontrado'));
    }

    if (existingProject.organizacionid && existingProject.organizacionid !== userOrganizationId) {
      return next(new ApiError(403, 'No tienes permisos para actualizar este proyecto'));
    }

    const project = await projectService.updateProjectStatus(supabaseAdmin, req.params.id, estado);
    res.json(ApiResponse.ok(project, 'Estado del proyecto actualizado'));
  } catch (err) {
    next(err);
  }
};