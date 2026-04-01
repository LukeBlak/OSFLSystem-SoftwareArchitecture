import { ApiError } from '../utils/apiError.js';
import { logger } from '../utils/logger.js';

/**
 * -----------------------------------------------------------------------------
 * VALIDAR Y ASIGNAR HORAS SOCIALES (CU-17)
 * -----------------------------------------------------------------------------
 * Actualiza el registro de horas del miembro y opcionalmente añade razones
 */
export const validateHours = async (supabase, memberId, recordId, validationData) => {
  try {
    const { aprobado, observaciones } = validationData;
    // Si ya me envían respuesta, `validado` siempre pasa a ser true.
    const validado = true;
    const isAprovadoBoolean = aprobado === true;

    // 1. Verificar existencia del registro_horas
    const { data: record, error: recordErr } = await supabase
      .from('registro_horas')
      .select('*')
      .eq('id', recordId)
      .eq('miembroid', memberId)
      .single();

    if (recordErr || !record) {
      throw ApiError.notFound('Registro de horas no encontrado para este miembro');
    }

    if (record.validado === true) {
      throw ApiError.conflict('El registro de horas ya ha sido procesado previamente');
    }

    // 2. Actualizar el estado en registro_horas
    const { data: updatedRecord, error: updateErr } = await supabase
      .from('registro_horas')
      .update({
        validado,
        aprobado: isAprovadoBoolean,
        // (Ojo: validacion_horas usa observaciones, pero la tabla de registro no tiene. 
        // Si no hay observaciones en `registro_horas`, omitimos ese campo y nos apegamos al Schema).
      })
      .eq('id', recordId)
      .select()
      .single();

    if (updateErr) {
      logger.error('Error al validar las horas', { updateErr, recordId });
      throw ApiError.internal('Error al actualizar el registro de horas');
    }
    
    // (Opcional): Si hay una tabla validacion_horas para trazabilidad, 
    // podríamos insertar la relacion, pero el trigger funcion_auditoria se encarga del 'modificado_por'.

    return updatedRecord;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error inesperado en validateHours', { error: error.message });
    throw ApiError.internal('Error al validar registro de horas');
  }
};

/**
 * -----------------------------------------------------------------------------
 * GENERAR REPORTE DE HORAS (CU-19)
 * -----------------------------------------------------------------------------
 * Agrega y estructura las horas de un miembro como lo espera el Frontend. 
 */
export const getHoursReport = async (supabase, memberId) => {
  try {
    // 1. Traer información del miembro para el reporte
    const { data: member, error: memberErr } = await supabase
      .from('miembro')
      .select(`
        id,
        usuario:id(email, perfil:perfil(nombre, apellido)),
        lider_comite(id)
      `)
      .eq('id', memberId)
      .single();

    if (memberErr || !member) throw ApiError.notFound('Miembro no encontrado');

    // 2. Traer todos los registros de horas aprobadas
    const { data: records, error: recordsErr } = await supabase
      .from('registro_horas')
      .select(`
        id,
        fecha,
        cantidadhoras,
        descripcion,
        validado,
        aprobado,
        proyecto!inner(id, nombre)
      `)
      .eq('miembroid', memberId)
      .eq('validado', true)
      .eq('aprobado', true) // Sólo horas válidas
      .order('fecha', { ascending: false });

    if (recordsErr) {
      logger.error('Error consultando registro de horas', { recordsErr });
      throw ApiError.internal('Error al calcular el reporte de horas');
    }

    // 3. Procesar datos de acuerdo al formato exigido por HistorialHoras.jsx (Frontend)
    let totalHours = 0;
    const projectAggregations = {};

    const activities = records.map(r => {
      totalHours += Number(r.cantidadhoras) || 0;
      
      const pId = r.proyecto.id;
      if (!projectAggregations[pId]) {
        projectAggregations[pId] = {
          id: pId,
          name: r.proyecto.nombre,
          hours: 0,
          color: `#${Math.floor(Math.random()*16777215).toString(16)}` // Random color temporal
        };
      }
      projectAggregations[pId].hours += Number(r.cantidadhoras);

      return {
        id: r.id,
        projectName: r.proyecto.nombre,
        date: r.fecha,
        hours: r.cantidadhoras,
        description: r.descripcion,
        validated: r.validado && r.aprobado
      };
    });

    // 4. Formatear la respuesta
    const memberName = member.usuario?.perfil?.nombre 
      ? `${member.usuario.perfil.nombre} ${member.usuario.perfil.apellido || ''}`.trim()
      : 'Miembro Desconocido';

    const report = {
      member: {
        name: memberName,
        email: member.usuario?.email || 'N/A',
        committee: 'Por Mapear', 
        joinDate: new Date().toISOString() // Fallback o extraer de member.fecha_creacion
      },
      totalHours,
      projects: Object.values(projectAggregations),
      activities
    };

    return report;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error inesperado en getHoursReport', { error: error.message });
    throw ApiError.internal('Error generando el reporte de horas');
  }
};
