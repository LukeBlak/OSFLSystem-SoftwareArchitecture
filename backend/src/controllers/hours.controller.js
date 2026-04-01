import * as hoursService from '../services/hours.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { StatusCodes } from 'http-status-codes';

/**
 * -----------------------------------------------------------------------------
 * VALIDAR Y ASIGNAR HORAS SOCIALES (CU-17)
 * -----------------------------------------------------------------------------
 */
export const validateHours = async (req, res, next) => {
  try {
    const { memberId, id: recordId } = req.params;
    const { aprobado, observaciones } = req.body;

    if (aprobado === undefined) {
      throw ApiError.badRequest('Debe especificar si las horas son aprobadas o no.');
    }

    const updatedRecord = await hoursService.validateHours(
      req.supabase,
      memberId,
      recordId,
      { aprobado, observaciones }
    );

    res.status(StatusCodes.OK).json(
      ApiResponse.success('Horas validadas exitosamente', updatedRecord)
    );
  } catch (err) {
    next(err);
  }
};

/**
 * -----------------------------------------------------------------------------
 * GENERAR REPORTE DE HORAS (CU-19)
 * -----------------------------------------------------------------------------
 */
export const getHoursReport = async (req, res, next) => {
  try {
    const { memberId } = req.params;

    // TODO: Si un miembro pide su propio reporte, req.user.id debe coincidir
    // o el usuario debe ser admin/lider_comite.

    const report = await hoursService.getHoursReport(req.supabase, memberId);
    
    res.status(StatusCodes.OK).json(
      ApiResponse.success('Reporte de horas generado exitosamente', report)
    );
  } catch (err) {
    next(err);
  }
};
