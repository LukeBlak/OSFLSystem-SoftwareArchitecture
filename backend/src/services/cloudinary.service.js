/**
 * =============================================================================
 * SERVICIO DE CLOUDINARY 
 * =============================================================================
 * 
 * Propósito:
 * - Implementar la lógica de negocio para gestión de imágenes
 * - Coordinar entre controllers y la configuración de Cloudinary
 * - Centralizar operaciones de subida, eliminación y transformación de imágenes
 * 
 * Casos de Uso relacionados:
 * - CU-05: Actualizar perfil + Cloudinary (Avatar/Foto de perfil)
 * - Subida de logos de organizaciones
 * - Subida de imágenes de proyectos/comités
 * 
 * @module services/cloudinary.service
 * @layer Application
 */

import cloudinary, {
    avatarConfig,
    organizationLogoConfig,
    projectImageConfig,
    committeeImageConfig,
    getOptimizedImageUrl,
    getAvatarUrl,
} from '../config/cloudinary.js';
import { ApiError } from '../utils/apiError.js';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../utils/logger.js';

// =============================================================================
// CONSTANTES Y CONFIGURACIÓN
// =============================================================================

/**
 * Mapeo de tipos de recurso a sus configuraciones específicas
 * @constant {Object}
 */

const RESOURCE_CONFIGS = {
    avatar: avatarConfig,
    organizationLogo: organizationLogoConfig,
    projectImage: projectImageConfig,
    committeeImage: committeeImageConfig,
};

/**
 * Límites de tamaño de archivo por tipo (en MB)
 * @constant {Object}
 */

const FILE_SIZE_LIMITS = {
    avatar: 2,
    organizationLogo: 3,
    projectImage: 5,
    committeeImage: 3,
    default: 5,
};

/**
 * Formatos de archivo permitidos por tipo
 * @constant {Object}
 */
const ALLOWED_FORMATS = {
    avatar: ['jpg', 'jpeg', 'png', 'webp'],
    organizationLogo: ['jpg', 'jpeg', 'png', 'svg', 'webp'],
    projectImage: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
    committeeImage: ['jpg', 'jpeg', 'png', 'webp'],
    default: ['jpg', 'jpeg', 'png', 'webp'],
};

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
            throw new ApiError(
                StatusCodes.BAD_REQUEST,
                'No se proporcionó ningún archivo'
            );
        }

        // Verificar que el tipo de recurso es válido
        if (!RESOURCE_CONFIGS[resourceType]) {
            throw new ApiError(
                StatusCodes.BAD_REQUEST,
                `Tipo de recurso '${resourceType}' no válido. Opciones: ${Object.keys(RESOURCE_CONFIGS).join(', ')}`
            );
        }

        // Obtener configuración específica para este tipo de recurso
        const config = RESOURCE_CONFIGS[resourceType];
        const maxFileSizeMB = FILE_SIZE_LIMITS[resourceType] || FILE_SIZE_LIMITS.default;
        const allowedFormats = ALLOWED_FORMATS[resourceType] || ALLOWED_FORMATS.default;

        // =========================================================================
        // 2. VALIDAR TAMAÑO DEL ARCHIVO
        // =========================================================================

        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > maxFileSizeMB) {
            throw new ApiError(
                StatusCodes.REQUEST_ENTITY_TOO_LARGE,
                `El archivo excede el tamaño máximo de ${maxFileSizeMB}MB (tamaño actual: ${fileSizeMB.toFixed(2)}MB)`
            );
        }

        // =========================================================================
        // 3. VALIDAR FORMATO DEL ARCHIVO
        // =========================================================================

        // Extraer extensión del archivo
        const fileExtension = file.originalname.split('.').pop().toLowerCase();

        if (!allowedFormats.includes(fileExtension)) {
            throw new ApiError(
                StatusCodes.BAD_REQUEST,
                `Formato '${fileExtension}' no permitido. Formatos aceptados: ${allowedFormats.join(', ')}`
            );
        }

        // =========================================================================
        // 4. CONFIGURAR PARÁMETROS DE SUBIDA
        // =========================================================================

        const uploadOptions = {
            ...config,
            folder: customFolder || config.folder,
            resource_type: 'image',
            overwrite: !!publicId, // Solo sobrescribir si se proporciona publicId
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

        throw new ApiError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            'Error al subir la imagen. Por favor intenta nuevamente.'
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
        `avatars/${userId}`,
        `avatars/${userId}` // publicId consistente para permitir overwrite
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
        `organizations/logos/${organizationId}`,
        `organizations/logos/${organizationId}`
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
        ? `projects/${projectId}/${imageName}`
        : `projects/${projectId}/${Date.now()}`;

    return await uploadImage(
        file,
        'projectImage',
        `projects/${projectId}`,
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
        `committees/${committeeId}`,
        `committees/${committeeId}`
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
            throw new ApiError(
                StatusCodes.BAD_REQUEST,
                'El publicId de la imagen es requerido'
            );
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

        throw new ApiError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            'Error al eliminar la imagen. Por favor intenta nuevamente.'
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
            return { success: true, deleted: 0, message: 'No hay imágenes para eliminar' };
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
        };
    } catch (error) {
        logger.error('Error en eliminación múltiple de imágenes', {
            error: error.message,
        });

        throw new ApiError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            'Error al eliminar las imágenes. Por favor intenta nuevamente.'
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

    return getOptimizedImageUrl(publicId, transformations);
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

export const getAvatarUrlWrapper = (publicId, size = 'medium') => {
    if (!publicId) {
        return null;
    }

    return getAvatarUrl(publicId, size);
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
 * ACTUALIZAR IMAGEN
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
            await deleteImage(oldPublicId);
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
    const allowedFormats = ALLOWED_FORMATS[resourceType] || ALLOWED_FORMATS.default;
    const maxFileSizeMB = FILE_SIZE_LIMITS[resourceType] || FILE_SIZE_LIMITS.default;

    // Verificar existencia del archivo
    if (!file) {
        errors.push('No se proporcionó ningún archivo');
        return { isValid: false, errors };
    }

    // Verificar mimetype
    const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml', 'image/avif'];
    if (!validMimeTypes.includes(file.mimetype)) {
        errors.push(`Tipo de archivo '${file.mimetype}' no es una imagen válida`);
    }

    // Verificar tamaño
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxFileSizeMB) {
        errors.push(`El archivo excede el tamaño máximo de ${maxFileSizeMB}MB`);
    }

    // Verificar extensión
    const fileExtension = file.originalname.split('.').pop().toLowerCase();
    if (!allowedFormats.includes(fileExtension)) {
        errors.push(`Formato '${fileExtension}' no permitido`);
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
};

// =============================================================================
// FUNCIONES INTERNAS
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

// =============================================================================
// EXPORTACIÓN POR DEFECTO
// =============================================================================

export default {
    uploadImage,
    uploadAvatar,
    uploadOrganizationLogo,
    uploadProjectImage,
    uploadCommitteeImage,
    deleteImage,
    deleteMultipleImages,
    getOptimizedUrl,
    getAvatarUrl: getAvatarUrlWrapper,
    extractPublicId,
    replaceImage,
    validateImageFile,
};
