/**
 * =============================================================================
 * CONTROLADOR DE PERFIL DE USUARIO - CAPA DE PRESENTACIÓN
 * =============================================================================
 * 
 * Propósito (ADR-001):
 * - Manejar todas las peticiones HTTP relacionadas con la gestión del perfil de usuario
 * - Coordinar con la capa de aplicación (services) para implementar casos de uso
 * - Validar datos de entrada y formatear respuestas estandarizadas
 * - Integrar con Cloudinary para gestión de imágenes de perfil (avatar)
 * 
 * Arquitectura:
 * - Capa: Presentación (Controladores)
 * - Patrón: MVC Controller
 * - Integración: Supabase (PostgreSQL + Auth) + Cloudinary (Imágenes)
 * 
 * Casos de Uso que implementa:
 * - CU-05: Actualizar perfil + Cloudinary
 * - Consultar perfil de usuario autenticado
 * - Subir/cambiar avatar o foto de perfil
 * - Eliminar avatar
 * - Cambiar contraseña de usuario autenticado
 * 
 * @module controllers/profile.controller
 * @layer Presentation
 */

import { StatusCodes } from 'http-status-codes';
import { profileService } from '../services/profile.service.js';
import { cloudinaryService } from '../services/cloudinary.service.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';

// =============================================================================
// FUNCIONES DEL CONTROLADOR
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * OBTENER PERFIL DEL USUARIO AUTENTICADO
 * -----------------------------------------------------------------------------
 * 
 * Obtiene la información completa del perfil del usuario actualmente autenticado.
 * 
 * @route GET /api/profile
 * @access Privado (requiere autenticación)
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} req.user - Datos del usuario autenticado (inyectado por middleware)
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express para manejo de errores
 * 
 * @returns {Object} Respuesta con datos completos del perfil del usuario
 * 
 * @throws {ApiError} 404 - Si el perfil no existe
 * 
 * @example
 * // Request
 * GET /api/profile
 * Authorization: Bearer <token>
 * 
 * @example
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": {
 *     "profile": {
 *       "id": "uuid-usuario",
 *       "email": "usuario@ejemplo.com",
 *       "role": "miembro",
 *       "profile": {
 *         "nombre": "Juan",
 *         "apellido": "Pérez",
 *         "telefono": "7000-0000",
 *         "avatar": "https://res.cloudinary.com/...",
 *         "direccion": "Calle Principal #123"
 *       },
 *       "organizationId": "uuid-organizacion",
 *       "isActive": true,
 *       "createdAt": "2026-01-01T10:00:00.000Z",
 *       "updatedAt": "2026-02-03T10:00:00.000Z"
 *     }
 *   },
 *   "message": "Perfil obtenido exitosamente"
 * }
 */
export const getProfile = async (req, res, next) => {
  try {
    // =========================================================================
    // 1. OBTENER ID DEL USUARIO AUTENTICADO
    // =========================================================================
    // El middleware de autenticación ya verificó el token y adjuntó
    // los datos del usuario en req.user
    const userId = req.user.id;

    // =========================================================================
    // 2. LLAMAR AL SERVICIO DE OBTENCIÓN DE PERFIL
    // =========================================================================
    // El servicio se encarga de:
    // - Buscar el perfil en la base de datos
    // - Incluir información relacionada (organización, comités, etc.)
    // - Formatear los datos para la respuesta
    const profile = await profileService.getProfileByUserId(userId);

    // =========================================================================
    // 3. RETORNAR RESPUESTA EXITOSA
    // =========================================================================
    return res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        {
          profile: {
            id: profile.id,
            email: profile.email,
            role: profile.role,
            profile: profile.profile,
            organizationId: profile.organizationId,
            isActive: profile.isActive,
            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt,
          },
        },
        'Perfil obtenido exitosamente'
      )
    );
  } catch (error) {
    // Pasar errores al middleware de manejo de errores
    next(error);
  }
};

/**
 * -----------------------------------------------------------------------------
 * ACTUALIZAR PERFIL DE USUARIO
 * -----------------------------------------------------------------------------
 * 
 * Actualiza la información del perfil del usuario autenticado.
 * Solo se pueden modificar campos del perfil, no el email o rol (eso requiere admin).
 * 
 * @route PUT /api/profile
 * @access Privado (requiere autenticación)
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} req.user - Datos del usuario autenticado
 * @param {Object} req.body - Datos a actualizar
 * @param {string} [req.body.profile.nombre] - Nombre del usuario
 * @param {string} [req.body.profile.apellido] - Apellido del usuario
 * @param {string} [req.body.profile.telefono] - Teléfono de contacto
 * @param {string} [req.body.profile.direccion] - Dirección de residencia
 * @param {string} [req.body.profile.biografia] - Biografía o descripción personal
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express para manejo de errores
 * 
 * @returns {Object} Respuesta con datos del perfil actualizado
 * 
 * @throws {ApiError} 400 - Si los datos son inválidos
 * @throws {ApiError} 404 - Si el perfil no existe
 * 
 * @example
 * // Request
 * PUT /api/profile
 * Authorization: Bearer <token>
 * {
 *   "profile": {
 *     "nombre": "Juan Carlos",
 *     "apellido": "Pérez García",
 *     "telefono": "7000-1111",
 *     "direccion": "Calle Principal #456, San Salvador"
 *   }
 * }
 * 
 * @example
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": {
 *     "profile": {
 *       "id": "uuid-usuario",
 *       "email": "usuario@ejemplo.com",
 *       "profile": {
 *         "nombre": "Juan Carlos",
 *         "apellido": "Pérez García",
 *         "telefono": "7000-1111",
 *         "direccion": "Calle Principal #456, San Salvador"
 *       },
 *       "updatedAt": "2026-02-03T11:00:00.000Z"
 *     }
 *   },
 *   "message": "Perfil actualizado exitosamente"
 * }
 */
export const updateProfile = async (req, res, next) => {
  try {
    // =========================================================================
    // 1. OBTENER ID DEL USUARIO AUTENTICADO
    // =========================================================================
    const userId = req.user.id;

    // =========================================================================
    // 2. EXTRAER DATOS DEL BODY
    // =========================================================================
    const { profile } = req.body;

    // =========================================================================
    // 3. VALIDAR QUE HAY DATOS PARA ACTUALIZAR
    // =========================================================================
    if (!profile || Object.keys(profile).length === 0) {
      throw ApiError.badRequest('Debes proporcionar al menos un campo para actualizar');
    }

    // =========================================================================
    // 4. VALIDAR CAMPOS DEL PERFIL (OPCIONAL - SE PUEDE MOVER AL VALIDATOR)
    // =========================================================================
    const allowedFields = ['nombre', 'apellido', 'telefono', 'direccion', 'biografia', 'fechaNacimiento'];
    const updateData = {};

    for (const field of allowedFields) {
      if (profile[field] !== undefined) {
        updateData[field] = profile[field];
      }
    }

    // =========================================================================
    // 5. LLAMAR AL SERVICIO DE ACTUALIZACIÓN
    // =========================================================================
    // El servicio se encarga de:
    // - Validar que el usuario existe
    // - Validar formato de datos (teléfono, fecha, etc.)
    // - Actualizar el registro en la base de datos
    const updatedProfile = await profileService.updateProfile(userId, updateData);

    // =========================================================================
    // 6. RETORNAR RESPUESTA EXITOSA
    // =========================================================================
    return res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        {
          profile: {
            id: updatedProfile.id,
            email: updatedProfile.email,
            profile: updatedProfile.profile,
            updatedAt: updatedProfile.updatedAt,
          },
        },
        'Perfil actualizado exitosamente'
      )
    );
  } catch (error) {
    // Pasar errores al middleware de manejo de errores
    next(error);
  }
};

/**
 * -----------------------------------------------------------------------------
 * SUBIR AVATAR / FOTO DE PERFIL (CU-05)
 * -----------------------------------------------------------------------------
 * 
 * Permite al usuario subir o cambiar su foto de perfil (avatar).
 * La imagen se almacena en Cloudinary y la URL se guarda en el perfil del usuario.
 * 
 * @route POST /api/profile/avatar
 * @access Privado (requiere autenticación)
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} req.user - Datos del usuario autenticado
 * @param {Object} req.file - Archivo subido (procesado por multer middleware)
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express para manejo de errores
 * 
 * @returns {Object} Respuesta con URL de la imagen subida
 * 
 * @throws {ApiError} 400 - Si no se proporciona archivo o es inválido
 * @throws {ApiError} 413 - Si el archivo excede el tamaño máximo
 * @throws {ApiError} 500 - Si hay error en la subida a Cloudinary
 * 
 * @example
 * // Request (multipart/form-data)
 * POST /api/profile/avatar
 * Authorization: Bearer <token>
 * Content-Type: multipart/form-data
 * 
 * Form Data:
 * - avatar: [file]
 * 
 * @example
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": {
 *     "avatar": {
 *       "url": "https://res.cloudinary.com/dwi1lmdmt/image/upload/v1234567890/osflsystem/avatars/uuid-usuario.jpg",
 *       "publicId": "osflsystem/avatars/uuid-usuario",
 *       "format": "jpg",
 *       "bytes": 102400
 *     }
 *   },
 *   "message": "Avatar subido exitosamente"
 * }
 */
export const uploadAvatar = async (req, res, next) => {
  try {
    // =========================================================================
    // 1. OBTENER ID DEL USUARIO AUTENTICADO
    // =========================================================================
    const userId = req.user.id;

    // =========================================================================
    // 2. VERIFICAR QUE SE PROPORCIONÓ UN ARCHIVO
    // =========================================================================
    if (!req.file) {
      throw ApiError.badRequest('No se proporcionó ningún archivo. Usa multipart/form-data');
    }

    // =========================================================================
    // 3. OBTENER AVATAR ACTUAL (PARA ELIMINARLO DESPUÉS)
    // =========================================================================
    // Obtener el perfil actual para recuperar el publicId del avatar anterior
    const currentProfile = await profileService.getProfileByUserId(userId);
    const oldAvatarPublicId = currentProfile?.profile?.avatarPublicId || null;

    // =========================================================================
    // 4. SUBIR IMAGEN A CLOUDINARY
    // =========================================================================
    // El servicio de Cloudinary se encarga de:
    // - Validar tipo y tamaño del archivo
    // - Subir la imagen a Cloudinary
    // - Aplicar transformaciones automáticas (calidad, formato, etc.)
    // - Retornar URL pública y publicId
    const uploadResult = await cloudinaryService.uploadAvatar(req.file, userId);

    // =========================================================================
    // 5. ACTUALIZAR PERFIL CON NUEVA URL DE AVATAR
    // =========================================================================
    // Guardar la URL y publicId en el perfil del usuario
    await profileService.updateAvatar(userId, {
      avatarUrl: uploadResult.url,
      avatarPublicId: uploadResult.publicId,
    });

    // =========================================================================
    // 6. ELIMINAR AVATAR ANTERIOR DE CLOUDINARY (SI EXISTE)
    // =========================================================================
    // Eliminar la imagen anterior para no acumular archivos innecesarios
    if (oldAvatarPublicId && oldAvatarPublicId !== uploadResult.publicId) {
      try {
        await cloudinaryService.deleteImage(oldAvatarPublicId);
      } catch (deleteError) {
        // Loggear error pero no fallar la operación principal
        console.warn('Error al eliminar avatar anterior:', deleteError.message);
      }
    }

    // =========================================================================
    // 7. RETORNAR RESPUESTA EXITOSA
    // =========================================================================
    return res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        {
          avatar: {
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            format: uploadResult.format,
            bytes: uploadResult.bytes,
            width: uploadResult.width,
            height: uploadResult.height,
          },
        },
        'Avatar subido exitosamente'
      )
    );
  } catch (error) {
    // Pasar errores al middleware de manejo de errores
    next(error);
  }
};

/**
 * -----------------------------------------------------------------------------
 * ELIMINAR AVATAR
 * -----------------------------------------------------------------------------
 * 
 * Elimina la foto de perfil del usuario autenticado.
 * La imagen se elimina de Cloudinary y se limpia el campo en la base de datos.
 * 
 * @route DELETE /api/profile/avatar
 * @access Privado (requiere autenticación)
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} req.user - Datos del usuario autenticado
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express para manejo de errores
 * 
 * @returns {Object} Respuesta de confirmación
 * 
 * @throws {ApiError} 404 - Si el usuario no tiene avatar
 * @throws {ApiError} 500 - Si hay error al eliminar de Cloudinary
 * 
 * @example
 * // Request
 * DELETE /api/profile/avatar
 * Authorization: Bearer <token>
 * 
 * @example
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": {},
 *   "message": "Avatar eliminado exitosamente"
 * }
 */
export const deleteAvatar = async (req, res, next) => {
  try {
    // =========================================================================
    // 1. OBTENER ID DEL USUARIO AUTENTICADO
    // =========================================================================
    const userId = req.user.id;

    // =========================================================================
    // 2. OBTENER PERFIL ACTUAL PARA VERIFICAR SI TIENE AVATAR
    // =========================================================================
    const currentProfile = await profileService.getProfileByUserId(userId);

    if (!currentProfile?.profile?.avatarPublicId) {
      throw ApiError.notFound('El usuario no tiene un avatar para eliminar');
    }

    const avatarPublicId = currentProfile.profile.avatarPublicId;

    // =========================================================================
    // 3. ELIMINAR IMAGEN DE CLOUDINARY
    // =========================================================================
    await cloudinaryService.deleteImage(avatarPublicId);

    // =========================================================================
    // 4. LIMPIAR CAMPO DE AVATAR EN LA BASE DE DATOS
    // =========================================================================
    await profileService.updateAvatar(userId, {
      avatarUrl: null,
      avatarPublicId: null,
    });

    // =========================================================================
    // 5. RETORNAR RESPUESTA EXITOSA
    // =========================================================================
    return res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        {},
        'Avatar eliminado exitosamente'
      )
    );
  } catch (error) {
    // Pasar errores al middleware de manejo de errores
    next(error);
  }
};

/**
 * -----------------------------------------------------------------------------
 * CAMBIAR CONTRASEÑA
 * -----------------------------------------------------------------------------
 * 
 * Permite al usuario autenticado cambiar su contraseña.
 * Requiere conocer la contraseña actual por seguridad.
 * 
 * @route PUT /api/profile/password
 * @access Privado (requiere autenticación)
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} req.user - Datos del usuario autenticado
 * @param {Object} req.body - Datos para cambio de contraseña
 * @param {string} req.body.currentPassword - Contraseña actual
 * @param {string} req.body.newPassword - Nueva contraseña
 * @param {string} req.body.newPasswordConfirm - Confirmación de nueva contraseña
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express para manejo de errores
 * 
 * @returns {Object} Respuesta de confirmación
 * 
 * @throws {ApiError} 400 - Si las contraseñas no coinciden o son inválidas
 * @throws {ApiError} 401 - Si la contraseña actual es incorrecta
 * 
 * @example
 * // Request
 * PUT /api/profile/password
 * Authorization: Bearer <token>
 * {
 *   "currentPassword": "contraseñaActual123",
 *   "newPassword": "nuevaContraseña456",
 *   "newPasswordConfirm": "nuevaContraseña456"
 * }
 * 
 * @example
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": {},
 *   "message": "Contraseña actualizada exitosamente"
 * }
 */
export const changePassword = async (req, res, next) => {
  try {
    // =========================================================================
    // 1. OBTENER ID DEL USUARIO AUTENTICADO
    // =========================================================================
    const userId = req.user.id;

    // =========================================================================
    // 2. EXTRAER DATOS DEL BODY
    // =========================================================================
    const { currentPassword, newPassword, newPasswordConfirm } = req.body;

    // =========================================================================
    // 3. VALIDAR QUE SE PROPORCIONARON TODOS LOS DATOS
    // =========================================================================
    if (!currentPassword || !newPassword || !newPasswordConfirm) {
      throw ApiError.badRequest(
        'Contraseña actual, nueva contraseña y confirmación son requeridos'
      );
    }

    // =========================================================================
    // 4. VALIDAR QUE LAS NUEVAS CONTRASEÑAS COINCIDAN
    // =========================================================================
    if (newPassword !== newPasswordConfirm) {
      throw ApiError.badRequest('Las nuevas contraseñas no coinciden');
    }

    // =========================================================================
    // 5. VALIDAR FORTALEZA DE LA NUEVA CONTRASEÑA
    // =========================================================================
    // Requisitos mínimos:
    // - Mínimo 8 caracteres
    // - Al menos 1 letra mayúscula
    // - Al menos 1 letra minúscula
    // - Al menos 1 número
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    
    if (!passwordRegex.test(newPassword)) {
      throw ApiError.badRequest(
        'La contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas y números'
      );
    }

    // =========================================================================
    // 6. LLAMAR AL SERVICIO DE CAMBIO DE CONTRASEÑA
    // =========================================================================
    // El servicio se encarga de:
    // - Validar contraseña actual (comparar hash)
    // - Hashear nueva contraseña
    // - Actualizar en Supabase Auth
    await profileService.changePassword(userId, currentPassword, newPassword);

    // =========================================================================
    // 7. RETORNAR RESPUESTA EXITOSA
    // =========================================================================
    return res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        {},
        'Contraseña actualizada exitosamente'
      )
    );
  } catch (error) {
    // Pasar errores al middleware de manejo de errores
    next(error);
  }
};

/**
 * -----------------------------------------------------------------------------
 * OBTENER ESTADÍSTICAS DE USUARIO
 * -----------------------------------------------------------------------------
 * 
 * Obtiene estadísticas y métricas del usuario autenticado.
 * Incluye horas sociales, proyectos participados, etc.
 * 
 * @route GET /api/profile/stats
 * @access Privado (requiere autenticación)
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} req.user - Datos del usuario autenticado
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express para manejo de errores
 * 
 * @returns {Object} Respuesta con estadísticas del usuario
 * 
 * @example
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": {
 *     "stats": {
 *       "horasTotales": 120,
 *       "horasValidadas": 100,
 *       "horasPendientes": 20,
 *       "proyectosParticipados": 5,
 *       "proyectosActivos": 2,
 *       "sugerenciasEnviadas": 3,
 *       "anunciosLeidos": 15
 *     }
 *   },
 *   "message": "Estadísticas obtenidas exitosamente"
 * }
 */
export const getUserStats = async (req, res, next) => {
  try {
    // =========================================================================
    // 1. OBTENER ID DEL USUARIO AUTENTICADO
    // =========================================================================
    const userId = req.user.id;

    // =========================================================================
    // 2. LLAMAR AL SERVICIO DE ESTADÍSTICAS
    // =========================================================================
    const stats = await profileService.getUserStats(userId);

    // =========================================================================
    // 3. RETORNAR RESPUESTA EXITOSA
    // =========================================================================
    return res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        {
          stats: {
            horasTotales: stats.horasTotales,
            horasValidadas: stats.horasValidadas,
            horasPendientes: stats.horasPendientes,
            proyectosParticipados: stats.proyectosParticipados,
            proyectosActivos: stats.proyectosActivos,
            sugerenciasEnviadas: stats.sugerenciasEnviadas,
            anunciosLeidos: stats.anunciosLeidos,
          },
        },
        'Estadísticas obtenidas exitosamente'
      )
    );
  } catch (error) {
    // Pasar errores al middleware de manejo de errores
    next(error);
  }
};

/**
 * -----------------------------------------------------------------------------
 * DESACTIVAR CUENTA (SOFT DELETE)
 * -----------------------------------------------------------------------------
 * 
 * Permite al usuario desactivar su propia cuenta.
 * No elimina los datos, solo marca la cuenta como inactiva.
 * 
 * @route DELETE /api/profile
 * @access Privado (requiere autenticación)
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} req.user - Datos del usuario autenticado
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express para manejo de errores
 * 
 * @returns {Object} Respuesta de confirmación
 * 
 * @throws {ApiError} 409 - Si el usuario tiene responsabilidades activas
 * 
 * @example
 * // Request
 * DELETE /api/profile
 * Authorization: Bearer <token>
 * 
 * @example
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": {},
 *   "message": "Cuenta desactivada exitosamente. Lamentamos que te vayas."
 * }
 */
export const deactivateAccount = async (req, res, next) => {
  try {
    // =========================================================================
    // 1. OBTENER ID DEL USUARIO AUTENTICADO
    // =========================================================================
    const userId = req.user.id;

    // =========================================================================
    // 2. LLAMAR AL SERVICIO DE DESACTIVACIÓN
    // =========================================================================
    // El servicio se encarga de:
    // - Verificar que no tenga responsabilidades activas (líder de comité, etc.)
    // - Marcar la cuenta como inactiva
    // - Invalidar tokens activos (opcional)
    await profileService.deactivateAccount(userId);

    // =========================================================================
    // 3. LIMPIAR COOKIE DE AUTENTICACIÓN (SI SE USA)
    // =========================================================================
    res.clearCookie('token', {
      httpOnly: true,
      secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
      sameSite: 'strict',
    });

    // =========================================================================
    // 4. RETORNAR RESPUESTA EXITOSA
    // =========================================================================
    return res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        {},
        'Cuenta desactivada exitosamente. Lamentamos que te vayas.'
      )
    );
  } catch (error) {
    // Pasar errores al middleware de manejo de errores
    next(error);
  }
};

// =============================================================================
// EXPORTACIÓN POR DEFECTO
// =============================================================================

/**
 * Objeto con todas las funciones del controlador
 * para facilitar la importación en las rutas
 * 
 * @example
 * // En profile.routes.js
 * import profileController from '../controllers/profile.controller.js';
 * 
 * router.get('/', profileController.getProfile);
 * router.put('/', profileController.updateProfile);
 * router.post('/avatar', upload.single('avatar'), profileController.uploadAvatar);
 * router.delete('/avatar', profileController.deleteAvatar);
 * router.put('/password', profileController.changePassword);
 * router.get('/stats', profileController.getUserStats);
 * router.delete('/', profileController.deactivateAccount);
 */
export default {
  getProfile,
  updateProfile,
  uploadAvatar,
  deleteAvatar,
  changePassword,
  getUserStats,
  deactivateAccount,
};