/**
 * =============================================================================
 * SERVICIO DE CLOUDINARY - CAPA DE APLICACIÓN
 * =============================================================================
 * 
 * Propósito (ADR-001):
 * - Implementar la lógica de negocio para gestión de imágenes
 * - Coordinar entre controllers y la configuración de Cloudinary
 * - Centralizar operaciones de subida, eliminación y transformación de imágenes
 * - Integrar con la arquitectura en capas del MVP
 * 
 * Arquitectura:
 * - Capa: Aplicación (Services)
 * - Patrón: Service Layer
 * - Integración: Cloudinary API + Multer (middleware de uploads)
 * 
 * Casos de Uso relacionados:
 * - CU-05: Actualizar perfil + Cloudinary (Avatar/Foto de perfil)
 * - Subida de logos de organizaciones
 * - Subida de imágenes de proyectos/comités
 * - Gestión de archivos multimedia del sistema
 * 
 * @module services/cloudinary.service
 * @layer Application
 */

import { v2 as cloudinary } from 'cloudinary';
import { ApiError } from '../utils/apiError.js';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

// =============================================================================
// CONSTANTES Y CONFIGURACIÓN
// =============================================================================

/**
 * Mapeo de tipos de recurso a sus configuraciones específicas
 * @constant {Object}
 */
const RESOURCE_CONFIGS = {
  avatar: {
    folder: 'osflsystem/avatars',
    maxWidth: 400,
    maxHeight: 400,
    maxFileSize: 2 * 1024 * 1024, // 2MB
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
  },
  organizationLogo: {
    folder: 'osflsystem/organizations/logos',
    maxWidth: 300,
    maxHeight: 300,
    maxFileSize: 3 * 1024 * 1024, // 3MB
    allowedFormats: ['jpg', 'jpeg', 'png', 'svg', 'webp'],
  },
  projectImage: {
    folder: 'osflsystem/projects',
    maxWidth: 800,
    maxHeight: 600,
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
  },
  committeeImage: {
    folder: 'osflsystem/committees',
    maxWidth: 400,
    maxHeight: 400,
    maxFileSize: 3 * 1024 * 1024, // 3MB
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
  },
  document: {
    folder: 'osflsystem/documents',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFormats: ['pdf'],
  },
};

/**
 * Configuración de transformación por defecto
 * @constant {Object}
 */
const DEFAULT_TRANSFORMATION = {
  quality: 'auto:good',
  fetch_format: 'auto',
};

// =============================================================================
// FUNCIONES DEL SERVICIO
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * SUBIR IMAGEN A CLOUDINARY
 * -----------------------------------------------------------------------------
 * 
 * Sube una imagen a Cloudinary con la configuración específica del tipo de recurso.
 * 
 * @param {Object} file - Archivo subido (de Multer o similar)
 * @param {string} resourceType - Tipo de recurso (avatar, organizationLogo, etc.)
 * @param {string} [customFolder] - Carpeta personalizada (opcional)
 * @param {string} [publicId] - ID público personalizado (opcional)
 * 
 * @returns {Promise<Object>} Información de la imagen subida
 * @returns {string} return.url - URL de la imagen
 * @returns {string} return.publicId - ID público en Cloudinary
 * @returns {string} return.format - Formato de la imagen
 * @returns {number} return.bytes - Tamaño en bytes
 * 
 * @throws {ApiError} 400 - Si el archivo es inválido
 * @throws {ApiError} 413 - Si el archivo excede el tamaño máximo
 * @throws {ApiError} 500 - Si hay error en la subida
 * 
 * @example
 * const result = await cloudinaryService.uploadImage(file, 'avatar', 'avatars', 'user_123');
 */
export const uploadImage = async (file, resourceType, customFolder = null, publicId = null) => {
  try {
    // =========================================================================
    // 1. VALIDACIONES PREVIAS
    // =========================================================================

    // Verificar que se proporcionó un archivo
    if (!file) {
      throw ApiError.badRequest('No se proporcionó ningún archivo');
    }

    // Verificar que el tipo de recurso es válido
    if (!RESOURCE_CONFIGS[resourceType]) {
      throw ApiError.badRequest(
        `Tipo de recurso '${resourceType}' no válido. Opciones: ${Object.keys(RESOURCE_CONFIGS).join(', ')}`
      );
    }

    // Obtener configuración específica para este tipo de recurso
    const config = RESOURCE_CONFIGS[resourceType];
    const maxFileSizeMB = config.maxFileSize / (1024 * 1024);

    // =========================================================================
    // 2. VALIDAR TAMAÑO DEL ARCHIVO
    // =========================================================================

    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxFileSizeMB) {
      throw ApiError(
        StatusCodes.REQUEST_ENTITY_TOO_LARGE,
        `El archivo excede el tamaño máximo de ${maxFileSizeMB}MB (tamaño actual: ${fileSizeMB.toFixed(2)}MB)`,
        {
          code: 'FILE_TOO_LARGE',
          details: {
            maxSize: maxFileSizeMB,
            actualSize: fileSizeMB.toFixed(2),
          },
        }
      );
    }

    // =========================================================================
    // 3. VALIDAR FORMATO DEL ARCHIVO
    // =========================================================================

    // Extraer extensión del archivo
    const fileExtension = file.originalname.split('.').pop().toLowerCase();
    
    if (!config.allowedFormats.includes(fileExtension)) {
      throw ApiError.badRequest(
        `Formato '${fileExtension}' no permitido. Formatos aceptados: ${config.allowedFormats.join(', ')}`,
        {
          code: 'INVALID_FILE_FORMAT',
          details: {
            provided: fileExtension,
            allowed: config.allowedFormats,
          },
        }
      );
    }

    // =========================================================================
    // 4. CONFIGURAR PARÁMETROS DE SUBIDA
    // =========================================================================

    const uploadOptions = {
      folder: customFolder || config.folder,
      resource_type: resourceType === 'document' ? 'raw' : 'image',
      overwrite: !!publicId,
      unique_filename: !publicId,
      use_filename: true,
      transformation: resourceType !== 'document' ? [
        { width: config.maxWidth || 800, height: config.maxHeight || 800, crop: 'limit' },
        DEFAULT_TRANSFORMATION,
      ] : [],
    };

    // Si se proporciona un publicId, usarlo (para actualizaciones)
    if (publicId) {
      uploadOptions.public_id = publicId;
      uploadOptions.overwrite = true;
    }

    // =========================================================================
    // 5. EJECUTAR SUBIDA A CLOUDINARY
    // =========================================================================

    logger.info(`Iniciando subida de imagen a Cloudinary`, {
      resourceType,
      fileName: file.originalname,
      fileSize: file.size,
      folder: uploadOptions.folder,
    });

    const uploadResult = await uploadToCloudinary(file.buffer, uploadOptions);

    // =========================================================================
    // 6. REGISTRAR ÉXITO Y RETORNAR
    // =========================================================================

    logger.info(`Imagen subida exitosamente a Cloudinary`, {
      publicId: uploadResult.public_id,
      url: uploadResult.secure_url,
    });

    return {
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      format: uploadResult.format,
      bytes: uploadResult.bytes,
      width: uploadResult.width,
      height: uploadResult.height,
      resourceType,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    // Si ya es un ApiError, propagarlo
    if (error instanceof ApiError) {
      throw error;
    }

    // Loggear error y lanzar error genérico
    logger.error('Error al subir imagen a Cloudinary', {
      resourceType,
      fileName: file?.originalname,
      error: error.message,
      stack: error.stack,
    });

    throw ApiError.internal(
      'Error al subir la imagen. Por favor intenta nuevamente.',
      {
        code: 'CLOUDINARY_UPLOAD_ERROR',
        details: error.message,
      }
    );
  }
};

/**
 * -----------------------------------------------------------------------------
 * SUBIR IMAGEN DE PERFIL (AVATAR)
 * -----------------------------------------------------------------------------
 * 
 * Método especializado para subir avatares de usuarios.
 * 
 * @param {Object} file - Archivo del avatar
 * @param {string} userId - ID del usuario (para generar publicId único)
 * 
 * @returns {Promise<Object>} Información de la imagen subida
 */
export const uploadAvatar = async (file, userId) => {
  return await uploadImage(
    file,
    'avatar',
    `osflsystem/avatars/${userId}`,
    `osflsystem/avatars/${userId}`
  );
};

/**
 * -----------------------------------------------------------------------------
 * SUBIR LOGO DE ORGANIZACIÓN
 * -----------------------------------------------------------------------------
 * 
 * Método especializado para subir logos de organizaciones.
 * 
 * @param {Object} file - Archivo del logo
 * @param {string} organizationId - ID de la organización
 * 
 * @returns {Promise<Object>} Información de la imagen subida
 */
export const uploadOrganizationLogo = async (file, organizationId) => {
  return await uploadImage(
    file,
    'organizationLogo',
    `osflsystem/organizations/logos/${organizationId}`,
    `osflsystem/organizations/logos/${organizationId}`
  );
};

/**
 * -----------------------------------------------------------------------------
 * SUBIR IMAGEN DE PROYECTO
 * -----------------------------------------------------------------------------
 * 
 * Método especializado para subir imágenes de proyectos.
 * 
 * @param {Object} file - Archivo de la imagen
 * @param {string} projectId - ID del proyecto
 * @param {string} [imageName] - Nombre opcional para la imagen
 * 
 * @returns {Promise<Object>} Información de la imagen subida
 */
export const uploadProjectImage = async (file, projectId, imageName = null) => {
  const publicId = imageName 
    ? `osflsystem/projects/${projectId}/${imageName}`
    : `osflsystem/projects/${projectId}/${Date.now()}`;

  return await uploadImage(
    file,
    'projectImage',
    `osflsystem/projects/${projectId}`,
    publicId
  );
};

/**
 * -----------------------------------------------------------------------------
 * SUBIR IMAGEN DE COMITÉ
 * -----------------------------------------------------------------------------
 * 
 * Método especializado para subir imágenes de comités.
 * 
 * @param {Object} file - Archivo de la imagen
 * @param {string} committeeId - ID del comité
 * 
 * @returns {Promise<Object>} Información de la imagen subida
 */
export const uploadCommitteeImage = async (file, committeeId) => {
  return await uploadImage(
    file,
    'committeeImage',
    `osflsystem/committees/${committeeId}`,
    `osflsystem/committees/${committeeId}`
  );
};

/**
 * -----------------------------------------------------------------------------
 * SUBIR DOCUMENTO
 * -----------------------------------------------------------------------------
 * 
 * Método especializado para subir documentos (PDF, etc.).
 * 
 * @param {Object} file - Archivo del documento
 * @param {string} documentType - Tipo de documento (receipt, report, etc.)
 * @param {string} [customId] - ID personalizado para el documento
 * 
 * @returns {Promise<Object>} Información del documento subido
 */
export const uploadDocument = async (file, documentType, customId = null) => {
  const publicId = customId 
    ? `osflsystem/documents/${documentType}/${customId}`
    : `osflsystem/documents/${documentType}/${Date.now()}`;

  return await uploadImage(
    file,
    'document',
    `osflsystem/documents/${documentType}`,
    publicId
  );
};

/**
 * -----------------------------------------------------------------------------
 * ELIMINAR IMAGEN DE CLOUDINARY
 * -----------------------------------------------------------------------------
 * 
 * Elimina una imagen de Cloudinary usando su publicId.
 * 
 * @param {string} publicId - ID público de la imagen en Cloudinary
 * 
 * @returns {Promise<Object>} Resultado de la eliminación
 * @returns {boolean} return.success - Si la eliminación fue exitosa
 * 
 * @throws {ApiError} 400 - Si no se proporciona publicId
 * @throws {ApiError} 500 - Si hay error en la eliminación
 * 
 * @example
 * await cloudinaryService.deleteImage('avatars/user_123');
 */
export const deleteImage = async (publicId) => {
  try {
    // Validar que se proporcionó publicId
    if (!publicId) {
      throw ApiError.badRequest('El publicId de la imagen es requerido');
    }

    logger.info(`Eliminando imagen de Cloudinary`, { publicId });

    // Ejecutar eliminación
    const result = await cloudinary.uploader.destroy(publicId);

    // Verificar resultado
    if (result.result !== 'ok' && result.result !== 'not found') {
      logger.warn(`Resultado inusual al eliminar imagen`, {
        publicId,
        result: result.result,
      });
    }

    logger.info(`Imagen eliminada de Cloudinary`, {
      publicId,
      result: result.result,
    });

    return {
      success: result.result === 'ok' || result.result === 'not found',
      publicId,
      result: result.result,
    };
  } catch (error) {
    logger.error('Error al eliminar imagen de Cloudinary', {
      publicId,
      error: error.message,
    });

    throw ApiError.internal(
      'Error al eliminar la imagen. Por favor intenta nuevamente.',
      {
        code: 'CLOUDINARY_DELETE_ERROR',
        details: error.message,
      }
    );
  }
};

/**
 * -----------------------------------------------------------------------------
 * ELIMINAR MÚLTIPLES IMÁGENES
 * -----------------------------------------------------------------------------
 * 
 * Elimina múltiples imágenes de Cloudinary en una sola operación.
 * 
 * @param {Array<string>} publicIds - Array de publicIds a eliminar
 * 
 * @returns {Promise<Object>} Resultados de las eliminaciones
 */
export const deleteMultipleImages = async (publicIds) => {
  try {
    if (!Array.isArray(publicIds) || publicIds.length === 0) {
      return { 
        success: true, 
        deleted: 0, 
        message: 'No hay imágenes para eliminar',
        total: 0,
        failed: 0,
      };
    }

    logger.info(`Eliminando ${publicIds.length} imágenes de Cloudinary`);

    const results = await Promise.allSettled(
      publicIds.map(publicId => deleteImage(publicId))
    );

    const deleted = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected').length;

    logger.info(`Eliminación múltiple completada`, {
      total: publicIds.length,
      deleted,
      failed,
    });

    return {
      success: failed === 0,
      total: publicIds.length,
      deleted,
      failed,
      message: failed === 0 
        ? 'Todas las imágenes eliminadas exitosamente' 
        : `${deleted} imágenes eliminadas, ${failed} fallaron`,
    };
  } catch (error) {
    logger.error('Error en eliminación múltiple de imágenes', {
      error: error.message,
    });

    throw ApiError.internal(
      'Error al eliminar las imágenes. Por favor intenta nuevamente.',
      {
        code: 'CLOUDINARY_BULK_DELETE_ERROR',
        details: error.message,
      }
    );
  }
};

/**
 * -----------------------------------------------------------------------------
 * GENERAR URL OPTIMIZADA
 * -----------------------------------------------------------------------------
 * 
 * Genera una URL optimizada de imagen con transformaciones específicas.
 * 
 * @param {string} publicId - ID público de la imagen
 * @param {Object} transformations - Transformaciones a aplicar
 * 
 * @returns {string} URL optimizada de la imagen
 * 
 * @example
 * const url = cloudinaryService.getOptimizedUrl('avatars/user_123', { width: 150, height: 150 });
 */
export const getOptimizedUrl = (publicId, transformations = {}) => {
  if (!publicId) {
    return null;
  }

  const mergedTransformations = {
    ...DEFAULT_TRANSFORMATION,
    ...transformations,
  };

  return cloudinary.url(publicId, {
    secure: true,
    transformation: mergedTransformations,
  });
};

/**
 * -----------------------------------------------------------------------------
 * GENERAR URL DE AVATAR
 * -----------------------------------------------------------------------------
 * 
 * Genera una URL de avatar con tamaño específico.
 * 
 * @param {string} publicId - ID público del avatar
 * @param {'thumbnail' | 'medium' | 'large'} size - Tamaño deseado
 * 
 * @returns {string} URL del avatar
 */
export const getAvatarUrl = (publicId, size = 'medium') => {
  if (!publicId) {
    return null;
  }

  const sizes = {
    thumbnail: { width: 150, height: 150, crop: 'fill', gravity: 'face' },
    medium: { width: 400, height: 400, crop: 'fill', gravity: 'face' },
    large: { width: 800, height: 800, crop: 'limit' },
  };

  return getOptimizedUrl(publicId, sizes[size]);
};

/**
 * -----------------------------------------------------------------------------
 * EXTRAER PUBLIC_ID DE URL
 * -----------------------------------------------------------------------------
 * 
 * Extrae el publicId de una URL de Cloudinary.
 * Útil cuando solo se tiene la URL almacenada en BD.
 * 
 * @param {string} url - URL de Cloudinary
 * 
 * @returns {string|null} publicId extraído o null si no es URL válida
 * 
 * @example
 * const publicId = cloudinaryService.extractPublicId('https://res.cloudinary.com/.../avatars/user_123.jpg');
 * // Returns: 'avatars/user_123'
 */
export const extractPublicId = (url) => {
  if (!url) {
    return null;
  }

  try {
    // Patrón para extraer publicId de URL de Cloudinary
    const pattern = /\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/i;
    const match = url.match(pattern);
    
    return match ? match[1] : null;
  } catch (error) {
    logger.warn('Error al extraer publicId de URL', { url, error: error.message });
    return null;
  }
};

/**
 * -----------------------------------------------------------------------------
 * ACTUALIZAR IMAGEN (REEMPLAZAR)
 * -----------------------------------------------------------------------------
 * 
 * Reemplaza una imagen existente eliminando la anterior y subiendo la nueva.
 * 
 * @param {Object} newFile - Nuevo archivo a subir
 * @param {string} oldPublicId - publicId de la imagen anterior a eliminar
 * @param {string} resourceType - Tipo de recurso
 * 
 * @returns {Promise<Object>} Información de la nueva imagen subida
 */
export const replaceImage = async (newFile, oldPublicId, resourceType) => {
  try {
    // 1. Subir nueva imagen primero
    const newImage = await uploadImage(newFile, resourceType);

    // 2. Eliminar imagen anterior (si existe)
    if (oldPublicId) {
      try {
        await deleteImage(oldPublicId);
      } catch (deleteError) {
        // Loggear error pero no fallar la operación principal
        logger.warn('Error al eliminar imagen anterior durante reemplazo', {
          oldPublicId,
          error: deleteError.message,
        });
      }
    }

    return newImage;
  } catch (error) {
    // Si falla la subida, no intentar eliminar la anterior
    throw error;
  }
};

/**
 * -----------------------------------------------------------------------------
 * VALIDAR ARCHIVO DE IMAGEN
 * -----------------------------------------------------------------------------
 * 
 * Valida que un archivo sea una imagen válida antes de procesarlo.
 * 
 * @param {Object} file - Archivo a validar
 * @param {string} resourceType - Tipo de recurso para validaciones específicas
 * 
 * @returns {Object} Resultado de validación
 * @returns {boolean} return.isValid - Si el archivo es válido
 * @returns {string[]} return.errors - Array de errores encontrados
 */
export const validateImageFile = (file, resourceType = 'default') => {
  const errors = [];
  const config = RESOURCE_CONFIGS[resourceType] || RESOURCE_CONFIGS.avatar;

  // Verificar existencia del archivo
  if (!file) {
    errors.push('No se proporcionó ningún archivo');
    return { isValid: false, errors };
  }

  // Verificar mimetype
  const validMimeTypes = resourceType === 'document'
    ? ['application/pdf']
    : ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml', 'image/avif'];
    
  if (!validMimeTypes.includes(file.mimetype)) {
    errors.push(`Tipo de archivo '${file.mimetype}' no es válido`);
  }

  // Verificar tamaño
  const fileSizeMB = file.size / (1024 * 1024);
  const maxFileSizeMB = config.maxFileSize / (1024 * 1024);
  if (fileSizeMB > maxFileSizeMB) {
    errors.push(`El archivo excede el tamaño máximo de ${maxFileSizeMB}MB`);
  }

  // Verificar extensión
  const fileExtension = file.originalname.split('.').pop().toLowerCase();
  if (!config.allowedFormats.includes(fileExtension)) {
    errors.push(`Formato '${fileExtension}' no permitido`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * -----------------------------------------------------------------------------
 * OBTENER INFORMACIÓN DE IMAGEN
 * -----------------------------------------------------------------------------
 * 
 * Obtiene información detallada de una imagen almacenada en Cloudinary.
 * 
 * @param {string} publicId - ID público de la imagen
 * 
 * @returns {Promise<Object>} Información de la imagen
 */
export const getImageInfo = async (publicId) => {
  try {
    if (!publicId) {
      throw ApiError.badRequest('El publicId es requerido');
    }

    const result = await cloudinary.api.resource(publicId);

    return {
      publicId: result.public_id,
      url: result.secure_url,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      createdAt: result.created_at,
      tags: result.tags || [],
    };
  } catch (error) {
    logger.error('Error al obtener información de imagen', {
      publicId,
      error: error.message,
    });

    throw ApiError.internal(
      'Error al obtener información de la imagen',
      {
        code: 'CLOUDINARY_INFO_ERROR',
        details: error.message,
      }
    );
  }
};

// =============================================================================
// FUNCIONES INTERNAS (HELPERS)
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * SUBIR BUFFER A CLOUDINARY (Función interna)
 * -----------------------------------------------------------------------------
 * 
 * Maneja la subida real del buffer a Cloudinary.
 * 
 * @private
 * @param {Buffer} buffer - Buffer de la imagen
 * @param {Object} options - Opciones de configuración
 * 
 * @returns {Promise<Object>} Resultado de la subida
 */
const uploadToCloudinary = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    uploadStream.end(buffer);
  });
};

/**
 * -----------------------------------------------------------------------------
 * VERIFICAR CONFIGURACIÓN DE CLOUDINARY
 * -----------------------------------------------------------------------------
 * 
 * Verifica que Cloudinary esté configurado correctamente.
 * 
 * @returns {Object} Resultado de la verificación
 */
export const verifyCloudinaryConfig = () => {
  const config = cloudinary.config();
  
  return {
    isConfigured: !!(config.cloud_name && config.api_key && config.api_secret),
    cloudName: config.cloud_name ? '***' : null,
    apiKey: config.api_key ? '***' : null,
    apiSecret: config.api_secret ? '***' : null,
  };
};

// =============================================================================
// INICIALIZACIÓN DE CLOUDINARY
// =============================================================================

/**
 * Configurar Cloudinary con las credenciales del entorno
 */
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Log de inicialización (solo en desarrollo)
if (env.NODE_ENV === 'development') {
  const config = verifyCloudinaryConfig();
  if (config.isConfigured) {
    logger.info('✅ Cloudinary configurado correctamente');
  } else {
    logger.warn('⚠️  Cloudinary no está configurado correctamente');
  }
}

// =============================================================================
// EXPORTACIÓN POR DEFECTO
// =============================================================================

/**
 * Objeto con todas las funciones del servicio
 * para facilitar la importación en controllers
 */
export default {
  uploadImage,
  uploadAvatar,
  uploadOrganizationLogo,
  uploadProjectImage,
  uploadCommitteeImage,
  uploadDocument,
  deleteImage,
  deleteMultipleImages,
  getOptimizedUrl,
  getAvatarUrl,
  extractPublicId,
  replaceImage,
  validateImageFile,
  getImageInfo,
  verifyCloudinaryConfig,
};