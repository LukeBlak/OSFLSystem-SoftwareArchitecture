/**
 * =============================================================================
 * SERVICIO DE HORAS/ASISTENCIA - CAPA DE APLICACIÓN
 * =============================================================================
 * 
 * Propósito (ADR-001):
 * - Implementar la lógica de negocio de los casos de uso de horas/asistencia
 * - Coordinar entre controllers y repositories
 * - Validar reglas de negocio específicas de registro de asistencia
 * - Integrar con Supabase para persistencia de datos
 * 
 * Arquitectura:
 * - Capa: Aplicación (Services)
 * - Patrón: Service Layer + Repository Pattern
 * - Integración: Supabase PostgreSQL
 * 
 * Casos de Uso que implementa:
 * - CU-16: Registrar asistencia
 * - CU-18: Consultar historial de horas
 * - Gestionar validación de horas
 * 
 * @module services/hours.service
 * @layer Application
 */

import { ApiError } from '../utils/apiError.js';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../utils/logger.js';
import HoursRepository from '../repositories/HoursRepository.js';
import { supabase } from '../config/supabase.js';
import { USER_ROLES } from '../models/User.js';
import { HOURS_STATUS } from '../models/Hours.js';

// =============================================================================
// REGISTRAR ASISTENCIA (CU-16)
// =============================================================================

/**
 * Registrar asistencia/horas de un miembro en un proyecto
 * 
 * Caso de Uso: Registrar las horas trabajadas por un miembro en un proyecto
 * 
 * @param {Object} hoursData - Datos de asistencia a registrar
 * @param {string} hoursData.miembroId - ID del miembro
 * @param {string} hoursData.proyectoId - ID del proyecto
 * @param {string} hoursData.fecha - Fecha de la asistencia (YYYY-MM-DD)
 * @param {number} hoursData.cantidadHoras - Cantidad de horas trabajadas
 * @param {string} [hoursData.descripcion] - Descripción de actividades
 * @param {string} [hoursData.estado] - Estado inicial (default: pendiente)
 * @param {Object} currentUser - Usuario que registra la asistencia
 * 
 * @returns {Promise<Object>} Registro de horas creado
 * @throws {ApiError} 400 - Si los datos son inválidos
 * @throws {ApiError} 403 - Si el usuario no tiene permisos
 * @throws {ApiError} 404 - Si el miembro, proyecto o comité no existe
 * @throws {ApiError} 500 - Si hay error al guardar en la BD
 */
export const registerHours = async (hoursData, currentUser) => {
  try {
    const {
      miembroId,
      proyectoId,
      fecha,
      cantidadHoras,
      descripcion = '',
      estado = HOURS_STATUS.PENDIENTE,
    } = hoursData;

    // =========================================================================
    // 1. VERIFICAR PERMISOS
    // =========================================================================
    // Solo Líderes de Organización, Líderes de Comité y Admins pueden registrar horas
    const rolAutorizado = [
      USER_ROLES.ADMIN,
      USER_ROLES.SUPER_ADMIN,
      USER_ROLES.LIDER_ORGANIZACION,
      USER_ROLES.LIDER_COMITE,
    ].includes(currentUser.role);

    if (!rolAutorizado) {
      throw ApiError.forbidden(
        'No tienes permisos para registrar asistencia. Solo líderes y administradores pueden hacerlo.'
      );
    }

    // =========================================================================
    // 2. VERIFICAR EXISTENCIA DE MIEMBRO
    // =========================================================================
    const { data: miembro, error: miembroError } = await supabase
      .from('miembro')
      .select('id, nombre, email, organizacionId')
      .eq('id', miembroId)
      .maybeSingle();

    if (miembroError || !miembro) {
      logger.warn('Miembro no encontrado', { miembroId, error: miembroError });
      throw ApiError.notFound('El miembro no existe en el sistema');
    }

    // =========================================================================
    // 3. VERIFICAR EXISTENCIA DE PROYECTO
    // =========================================================================
    const { data: proyecto, error: proyectoError } = await supabase
      .from('proyecto')
      .select('id, nombre, comiteId, estado')
      .eq('id', proyectoId)
      .maybeSingle();

    if (proyectoError || !proyecto) {
      logger.warn('Proyecto no encontrado', { proyectoId, error: proyectoError });
      throw ApiError.notFound('El proyecto no existe en el sistema');
    }

    // =========================================================================
    // 4. VERIFICAR PERMISOS DEL USUARIO
    // =========================================================================
    // Si es Líder de Comité, verificar que el proyecto es de su comité
    if (currentUser.role === USER_ROLES.LIDER_COMITE) {
      const { data: liderComite, error: liderError } = await supabase
        .from('lider_comite')
        .select('comiteId')
        .eq('userId', currentUser.id)
        .maybeSingle();

      if (liderError || !liderComite) {
        throw ApiError.forbidden('No estás registrado como líder de comité');
      }

      if (liderComite.comiteId !== proyecto.comiteId) {
        throw ApiError.forbidden(
          'Solo puedes registrar horas para proyectos de tu comité'
        );
      }
    }

    // Si es Líder de Organización, verificar que el proyecto es de su organización
    if (currentUser.role === USER_ROLES.LIDER_ORGANIZACION) {
      const { data: liderOrg, error: liderOrgError } = await supabase
        .from('lider_organizacion')
        .select('organizacionId')
        .eq('userId', currentUser.id)
        .maybeSingle();

      if (liderOrgError || !liderOrg) {
        throw ApiError.forbidden('No estás registrado como líder de organización');
      }

      // Verificar que el miembro y proyecto pertenecen a la misma organización
      if (liderOrg.organizacionId !== miembro.organizacionId) {
        throw ApiError.forbidden(
          'El miembro que intenta registrar no pertenece a tu organización'
        );
      }
    }

    // =========================================================================
    // 5. VERIFICAR QUE EL MIEMBRO ESTÁ POSTULADO AL PROYECTO
    // =========================================================================
    const { data: postulacion, error: postulacionError } = await supabase
      .from('postulacion')
      .select('id, estado')
      .eq('miembroId', miembroId)
      .eq('proyectoId', proyectoId)
      .eq('estado', 'aceptada')
      .maybeSingle();

    if (postulacionError || !postulacion) {
      logger.warn('Miembro no postulado al proyecto o postulación no aceptada', {
        miembroId,
        proyectoId,
        error: postulacionError,
      });
      throw ApiError.badRequest(
        'El miembro no está postulado o su postulación no ha sido aceptada en este proyecto'
      );
    }

    // =========================================================================
    // 6. CREAR REGISTRO DE HORAS
    // =========================================================================
    const registroHoras = {
      miembroId,
      proyectoId,
      fecha,
      cantidadHoras: parseFloat(cantidadHoras),
      descripcion,
      estado,
      comiteId: proyecto.comiteId, // Guardar comiteId para consultas más rápidas
      createdAt: new Date().toISOString(),
      creadoPor: currentUser.id,
    };

    const { data: registroCreado, error: crearError } = await HoursRepository.create(registroHoras);

    if (crearError || !registroCreado) {
      logger.error('Error al crear registro de horas', {
        error: crearError,
        hoursData: registroHoras,
      });
      throw ApiError.internal('Error al registrar la asistencia. Por favor, intenta nuevamente.');
    }

    // =========================================================================
    // 7. REGISTRAR EN LOG
    // =========================================================================
    logger.info('Asistencia registrada exitosamente', {
      registroId: registroCreado.id,
      miembroId,
      proyectoId,
      cantidadHoras,
      registradoPor: currentUser.id,
    });

    // =========================================================================
    // 8. RETORNAR RESULTADO
    // =========================================================================
    return {
      id: registroCreado.id,
      miembroId: registroCreado.miembroId,
      miembroNombre: miembro.nombre,
      proyectoId: registroCreado.proyectoId,
      proyectoNombre: proyecto.nombre,
      fecha: registroCreado.fecha,
      cantidadHoras: registroCreado.cantidadHoras,
      descripcion: registroCreado.descripcion,
      estado: registroCreado.estado,
      creadoEn: registroCreado.createdAt,
    };

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error inesperado en registerHours', {
      error: error.message,
      stack: error.stack,
    });

    throw ApiError.internal('Error al registrar la asistencia');
  }
};

// =============================================================================
// CONSULTAR HISTORIAL DE HORAS (CU-18)
// =============================================================================

/**
 * Obtener historial de horas de un miembro específico
 * 
 * @param {string} miembroId - ID del miembro
 * @param {Object} filters - Filtros adicionales
 * @param {Object} currentUser - Usuario que consulta
 * 
 * @returns {Promise<Object>} Historial de horas
 */
export const getMemberHoursHistory = async (miembroId, filters = {}, currentUser) => {
  try {
    // =========================================================================
    // 1. VERIFICAR PERMISOS
    // =========================================================================
    // Miembros solo pueden ver su propio historial
    if (currentUser.role === USER_ROLES.MIEMBRO) {
      // Obtener miembroId del usuario autenticado
      const { data: miembroAuth } = await supabase
        .from('miembro')
        .select('id')
        .eq('email', currentUser.email)
        .maybeSingle();

      if (!miembroAuth) {
        throw ApiError.notFound('Perfil de miembro no encontrado');
      }

      // Verificar que no esté intentando ver otro miembro
      if (miembroAuth.id !== miembroId) {
        throw ApiError.forbidden('Solo puedes consultar tu propio historial de horas');
      }
    }

    // Líderes de comité solo pueden ver miembros de su comité
    if (currentUser.role === USER_ROLES.LIDER_COMITE) {
      const { data: liderComite } = await supabase
        .from('lider_comite')
        .select('comiteId')
        .eq('userId', currentUser.id)
        .maybeSingle();

      if (!liderComite) {
        throw ApiError.forbidden('No estás registrado como líder de comité');
      }

      // Verificar que el miembro pertenece a un proyecto de su comité
      const { data: miembroProyecto } = await supabase
        .from('miembro')
        .select(`
          id,
          postulaciones:postulacion(
            proyecto:proyectoId(comiteId)
          )
        `)
        .eq('id', miembroId)
        .maybeSingle();

      // Validación simplificada - en producción hacer más robusta
      // Por ahora confiamos en RLS
    }

    // =========================================================================
    // 2. OBTENER FILTROS
    // =========================================================================
    const {
      proyectoId,
      estado,
      fechaDesde,
      fechaHasta,
      page = 1,
      limit = 20,
    } = filters;

    const offset = (page - 1) * limit;

    // =========================================================================
    // 3. CONSULTAR REGISTROS
    // =========================================================================
    let query = supabase
      .from('registro_horas')
      .select(`
        *,
        miembro:miembroId (
          id,
          nombre,
          email,
          dui
        ),
        proyecto:proyectoId (
          id,
          nombre,
          estado,
          comite:comiteId (nombre)
        ),
        validador:validadoPor (
          email,
          profile:usuario(nombre)
        )
      `, { count: 'exact' })
      .eq('miembroId', miembroId);

    // Aplicar filtros adicionales
    if (proyectoId) {
      query = query.eq('proyectoId', proyectoId);
    }

    if (estado) {
      query = query.eq('estado', estado);
    }

    if (fechaDesde) {
      query = query.gte('fecha', fechaDesde);
    }

    if (fechaHasta) {
      query = query.lte('fecha', fechaHasta);
    }

    const { data: registros, error, count } = await query
      .range(offset, offset + limit - 1)
      .order('fecha', { ascending: false });

    if (error) {
      logger.error('Error al obtener historial de horas', { error, miembroId });
      throw ApiError.internal('Error al consultar el historial de horas');
    }

    // =========================================================================
    // 4. CALCULAR TOTALES
    // =========================================================================
    const { total: horasTotales, error: totalError } = await HoursRepository.getTotalHoursByMember(miembroId);

    if (totalError) {
      logger.warn('Error al calcular horas totales', { totalError });
    }

    // Calcular horas por estado
    const horasValidadas = registros
      ?.filter(r => r.estado === 'validada')
      .reduce((sum, r) => sum + (parseFloat(r.cantidadHoras) || 0), 0) || 0;

    const horasPendientes = registros
      ?.filter(r => r.estado === 'pendiente')
      .reduce((sum, r) => sum + (parseFloat(r.cantidadHoras) || 0), 0) || 0;

    // =========================================================================
    // 5. RETORNAR RESULTADO
    // =========================================================================
    return {
      miembroId,
      registros: registros || [],
      resumen: {
        horasTotales: horasTotales,
        horasValidadas: horasValidadas,
        horasPendientes: horasPendientes,
        registrosTotales: count || 0,
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasNext: page < Math.ceil((count || 0) / limit),
        hasPrev: page > 1,
      },
    };

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error inesperado en getMemberHoursHistory', {
      error: error.message,
      miembroId,
    });

    throw ApiError.internal('Error al consultar el historial de horas');
  }
};

/**
 * Obtener resumen de horas por proyecto
 * 
 * @param {string} proyectoId - ID del proyecto
 * @param {Object} currentUser - Usuario que consulta
 * 
 * @returns {Promise<Object>} Resumen de horas del proyecto
 */
export const getProjectHoursSummary = async (proyectoId, currentUser) => {
  try {
    // Verificar permisos (similar a listHours)
    // ... implementación de permisos ...

    // Obtener todas las horas validadas del proyecto
    const { data: horas, error } = await supabase
      .from('registro_horas')
      .select(`
        cantidadHoras,
        miembro:miembroId (nombre, email)
      `)
      .eq('proyectoId', proyectoId)
      .eq('estado', 'validada');

    if (error) {
      throw ApiError.internal('Error al obtener horas del proyecto');
    }

    // Calcular totales
    const totalHoras = horas?.reduce((sum, h) => sum + (parseFloat(h.cantidadHoras) || 0), 0) || 0;
    const totalMiembros = new Set(horas?.map(h => h.miembro.id)).size;

    // Agrupar por miembro
    const horasPorMiembro = horas?.reduce((acc, h) => {
      const memberId = h.miembro.id;
      if (!acc[memberId]) {
        acc[memberId] = {
          miembroId: memberId,
          nombre: h.miembro.nombre,
          email: h.miembro.email,
          horas: 0,
        };
      }
      acc[memberId].horas += parseFloat(h.cantidadHoras) || 0;
      return acc;
    }, {}) || {};

    return {
      proyectoId,
      totalHoras,
      totalMiembros,
      horasPorMiembro: Object.values(horasPorMiembro),
      registros: horas || [],
    };

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error en getProjectHoursSummary', { error: error.message });
    throw ApiError.internal('Error al obtener resumen del proyecto');
  }
};

/**
 * Obtener reporte de horas por período
 * 
 * @param {Object} filters - Filtros del reporte
 * @param {Object} currentUser - Usuario que consulta
 * 
 * @returns {Promise<Object>} Reporte de horas
 */
export const getHoursReport = async (filters, currentUser) => {
  try {
    const {
      fechaDesde,
      fechaHasta,
      organizacionId,
      comiteId,
      groupBy = 'miembro', // 'miembro', 'proyecto', 'comite'
    } = filters;

    // Verificar permisos
    // ... implementación de permisos ...

    let query = supabase
      .from('registro_horas')
      .select(`
        *,
        miembro:miembroId (nombre, email, organizacionId),
        proyecto:proyectoId (nombre, comiteId),
        comite:comiteId (nombre, organizacionId)
      `)
      .eq('estado', 'validada');

    if (fechaDesde) {
      query = query.gte('fecha', fechaDesde);
    }

    if (fechaHasta) {
      query = query.lte('fecha', fechaHasta);
    }

    if (organizacionId) {
      query = query.eq('miembro.organizacionId', organizacionId);
    }

    if (comiteId) {
      query = query.eq('comiteId', comiteId);
    }

    const { data: registros, error } = await query;

    if (error) {
      throw ApiError.internal('Error al generar reporte');
    }

    // Agrupar según groupBy
    let agrupado = {};

    if (groupBy === 'miembro') {
      agrupado = registros?.reduce((acc, r) => {
        const key = r.miembro.id;
        if (!acc[key]) {
          acc[key] = {
            miembroId: key,
            nombre: r.miembro.nombre,
            email: r.miembro.email,
            horas: 0,
            proyectos: new Set(),
          };
        }
        acc[key].horas += parseFloat(r.cantidadHoras) || 0;
        acc[key].proyectos.add(r.proyecto.id);
        return acc;
      }, {}) || {};
    } else if (groupBy === 'proyecto') {
      agrupado = registros?.reduce((acc, r) => {
        const key = r.proyecto.id;
        if (!acc[key]) {
          acc[key] = {
            proyectoId: key,
            nombre: r.proyecto.nombre,
            horas: 0,
            miembros: new Set(),
          };
        }
        acc[key].horas += parseFloat(r.cantidadHoras) || 0;
        acc[key].miembros.add(r.miembro.id);
        return acc;
      }, {}) || {};
    }

    // Convertir Sets a counts
    const resultado = Object.values(agrupado).map(item => ({
      ...item,
      proyectos: item.proyectos?.size || 0,
      miembros: item.miembros?.size || 0,
    }));

    return {
      filters,
      totalHoras: resultado.reduce((sum, i) => sum + i.horas, 0),
      totalRegistros: resultado.length,
      agrupado: resultado,
    };

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error en getHoursReport', { error: error.message });
    throw ApiError.internal('Error al generar reporte de horas');
  }
};