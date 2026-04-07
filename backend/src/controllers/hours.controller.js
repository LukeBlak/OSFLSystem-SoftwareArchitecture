/**
 * =============================================================================
 * CONTROLADOR DE HORAS/ASISTENCIA - CAPA DE PRESENTACIÓN
 * =============================================================================
 * 
 * Propósito (ADR-001):
 * - Manejar todas las peticiones HTTP relacionadas con horas/asistencia
 * - Coordinar con la capa de aplicación (services) para implementar casos de uso
 * - Validar datos de entrada y formatear respuestas estandarizadas
 * - Implementar control de acceso basado en roles para operaciones de horas
 * 
 * Arquitectura:
 * - Capa: Presentación (Controladores)
 * - Patrón: MVC Controller
 * - Integración: Supabase (PostgreSQL + Auth)
 * 
 * Casos de Uso que implementa:
 * - CU-16: Registrar asistencia
 * - CU-18: Consultar historial de horas
 * 
 * @module controllers/hours.controller
 * @layer Presentation
 */

import { StatusCodes } from 'http-status-codes';
import * as hoursService from '../services/hours.service.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { supabase, supabaseAdmin } from '../config/supabase.js';

// =============================================================================
// REGISTRAR ASISTENCIA (CU-16)
// =============================================================================

/**
 * Registrar asistencia de un miembro en un proyecto
 * 
 * Permite registrar las horas trabajadas por un miembro en un proyecto específico.
 * Solo usuarios con rol de líder de organización, líder de comité o administrador 
 * pueden registrar asistencia.
 * 
 * @route POST /api/hours
 * @access Privado (requiere autenticación + rol: admin, lider_organizacion, lider_comite)
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} req.body - Datos de asistencia a registrar
 * @param {string} req.body.miembroId - ID del miembro (requerido)
 * @param {string} req.body.proyectoId - ID del proyecto (requerido)
 * @param {string} req.body.fecha - Fecha de asistencia en formato YYYY-MM-DD (requerido)
 * @param {number} req.body.cantidadHoras - Cantidad de horas trabajadas (requerido)
 * @param {string} [req.body.descripcion] - Descripción de las actividades realizadas
 * @param {string} [req.body.estado] - Estado inicial del registro (default: pendiente)
 * @param {Object} req.user - Usuario autenticado (inyectado por middleware)
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express para manejo de errores
 * 
 * @returns {Object} Respuesta con datos del registro de horas creado
 * 
 * @throws {ApiError} 400 - Si los datos son inválidos o faltan campos requeridos
 * @throws {ApiError} 403 - Si el usuario no tiene permisos para registrar asistencia
 * @throws {ApiError} 404 - Si el miembro, proyecto o comité no existe
 * 
 * @example
 * // Request
 * POST /api/hours
 * Authorization: Bearer <token>
 * {
 *   "miembroId": "uuid-miembro",
 *   "proyectoId": "uuid-proyecto",
 *   "fecha": "2026-04-06",
 *   "cantidadHoras": 4.5,
 *   "descripcion": "Asistencia en actividades de voluntariado"
 * }
 * 
 * // Response 201
 * {
 *   "statusCode": 201,
 *   "data": {
 *     "id": "uuid-registro",
 *     "miembroId": "uuid-miembro",
 *     "miembroNombre": "Juan Pérez",
 *     "proyectoId": "uuid-proyecto",
 *     "proyectoNombre": "Proyecto Comunitario",
 *     "fecha": "2026-04-06",
 *     "cantidadHoras": 4.5,
 *     "descripcion": "Asistencia en actividades de voluntariado",
 *     "estado": "pendiente",
 *     "creadoEn": "2026-04-06T10:30:00.000Z"
 *   },
 *   "message": "Asistencia registrada exitosamente"
 * }
 */
export const registerHours = async (req, res, next) => {
  try {
    const { miembroId, proyectoId, fecha, cantidadHoras, descripcion } = req.body;

    // Validaciones simples, como te dijeron
    if (!miembroId || !proyectoId || !fecha || cantidadHoras === undefined || cantidadHoras === null) {
      throw ApiError.badRequest(
        'miembroId, proyectoId, fecha y cantidadHoras son requeridos'
      );
    }

    const registroCreado = await hoursService.registerHours(
      req.supabase,
      {
        miembroId,
        proyectoId,
        fecha,
        cantidadHoras,
        descripcion
      },
      req.user
    );

    return res.status(StatusCodes.CREATED).json(
      new ApiResponse(
        StatusCodes.CREATED,
        registroCreado,
        'Asistencia registrada exitosamente'
      )
    );
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// CONSULTAR HISTORIAL DE HORAS (CU-18)
// =============================================================================

/**
 * Consultar historial de horas de un miembro específico
 * 
 * @route GET /api/hours/member/:miembroId/history
 * @access Privado (Miembro propio, Líderes, Admins)
 */
export const getMemberHoursHistory = async (req, res, next) => {
  try {
    const { miembroId } = req.params;
    const history = await hoursService.getMemberHoursHistory(
      miembroId,
      req.query,
      req.user
    );

    return res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        {
          miembroId,
          registros: history.registros,
          resumen: history.resumen,
        },
        'Historial obtenido exitosamente',
        { pagination: history.pagination }
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener resumen de horas por proyecto
 * 
 * @route GET /api/hours/project/:proyectoId/summary
 * @access Privado (Líderes, Admins)
 */
export const getProjectHoursSummary = async (req, res, next) => {
  try {
    const { proyectoId } = req.params;
    const summary = await hoursService.getProjectHoursSummary(proyectoId, req.user);

    return res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        {
          proyectoId,
          ...summary,
        },
        'Resumen obtenido exitosamente'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Generar reporte de horas
 * 
 * @route GET /api/hours/report
 * @access Privado (Líderes, Admins)
 */
export const getHoursReport = async (req, res, next) => {
  try {
    const report = await hoursService.getHoursReport(req.query, req.user);

    return res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        report,
        'Reporte generado exitosamente'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener historial de horas del usuario autenticado
 * 
 * @route GET /api/hours/my-history
 * @access Privado (Miembros)
 */
export const getMyHoursHistory = async (req, res, next) => {
  try {
    const currentUserId = req.user?.id;
    const currentUserEmail = req.user?.email;

    const memberLookups = [];

    if (currentUserId) {
      memberLookups.push(
        supabaseAdmin.from('miembro').select('id').eq('id', currentUserId).maybeSingle()
      );
    }

    if (currentUserEmail) {
      memberLookups.push(
        supabaseAdmin.from('miembro').select('id').eq('email', currentUserEmail).maybeSingle()
      );

      const { data: usuarioByEmail } = await supabaseAdmin
        .from('usuario')
        .select('id, email')
        .eq('email', currentUserEmail)
        .maybeSingle();

      if (usuarioByEmail?.id) {
        memberLookups.push(
          supabaseAdmin.from('miembro').select('id').eq('id', usuarioByEmail.id).maybeSingle()
        );
      }
    }

    const resolvedMember = (await Promise.all(memberLookups))
      .map((result) => result?.data)
      .find((member) => member?.id);

    if (!resolvedMember?.id) {
      throw ApiError.notFound('Perfil de miembro no encontrado');
    }

    const history = await hoursService.getMemberHoursHistory(
      resolvedMember.id,
      req.query,
      req.user
    );

    return res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        {
          miembroId: resolvedMember.id,
          registros: history.registros,
          resumen: history.resumen,
        },
        'Historial obtenido exitosamente',
        { pagination: history.pagination }
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener historial de horas de un usuario
 * 
 * @route GET /api/hours/history/:userId
 * @access Privado
 */
export const getHoursHistory = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      throw ApiError.badRequest('userId es requerido');
    }

    const history = await hoursService.getHoursHistory(
      supabaseAdmin,
      userId
    );

    return res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        history,
        'Historial de horas obtenido exitosamente'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Listar registros de horas con filtros
 * 
 * @route GET /api/hours
 * @access Privado
 * @note Método en desarrollo
 */
export const listHours = async (req, res, next) => {
  try {
    // TODO: Implementar listHours en servicio
    throw ApiError.notImplemented('Método listHours en desarrollo');
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener un registro de horas por ID
 * 
 * @route GET /api/hours/:id
 * @access Privado
 * @note Método en desarrollo
 */
export const getHoursById = async (req, res, next) => {
  try {
    // TODO: Implementar getHoursById en servicio
    throw ApiError.notImplemented('Método getHoursById en desarrollo');
  } catch (error) {
    next(error);
  }
};

/**
 * Validar horas registradas (aprobar o rechazar)
 * 
 * @route PUT /api/hours/:id/validate
 * @access Privado (Líderes, Admins)
 * @note Método en desarrollo
 */
export const validateHours = async (req, res, next) => {
  try {
    // TODO: Implementar validateHours en servicio
    throw ApiError.notImplemented('Método validateHours en desarrollo');
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener total de horas de un miembro
 * 
 * @route GET /api/hours/member/:miembroId/total
 * @access Privado
 * @note Método en desarrollo
 */
export const getMemberTotalHours = async (req, res, next) => {
  try {
    // TODO: Implementar getMemberTotalHours en servicio
    throw ApiError.notImplemented('Método getMemberTotalHours en desarrollo');
  } catch (error) {
    next(error);
  }
};

// Exportar controlador como objeto por defecto
export default {
  registerHours,
  getMemberHoursHistory,
  getHoursHistory,
  getProjectHoursSummary,
  getHoursReport,
  getMyHoursHistory,
  listHours,
  getHoursById,
  validateHours,
  getMemberTotalHours,
};
