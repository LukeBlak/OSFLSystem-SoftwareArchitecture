/**
 * =============================================================================
 * CONFIGURACIÓN DE CLOUDINARY
 * =============================================================================
 * 
 * Propósit:
 * - Configurar el cliente de Cloudinary para almacenamiento de imágenes
 * - Centralizar la configuración de subida de archivos multimedia
 * - Proveer instancia única para reutilización en toda la aplicación
 * 
 * Casos de Uso relacionados:
 * - Actualizar perfil + Cloudinary (Avatar/Foto de perfil)
 * - Subida de imágenes de organizaciones
 * - Subida de imágenes de proyectos/comités
 * 
 * @module config/cloudinary
 * @layer Infrastructure
 */

import { v2 as cloudinary } from 'cloudinary';
import { env } from './env.js';

/**
 * =============================================================================
 * CONFIGURACIÓN DEL CLIENTE CLOUDINARY
 * =============================================================================
 * 
 * Se configura con las credenciales desde variables de entorno validadas.
 * Esta configuración se ejecuta una sola vez al iniciar la aplicación.
 */
cloudinary.config({
  /**
   * Nombre de la nube (cloud name)
   * Identificador único de tu cuenta en Cloudinary
   */
  cloud_name: env.CLOUDINARY_CLOUD_NAME,

  /**
   * API Key
   * Clave pública para autenticación con Cloudinary
   */
  api_key: env.CLOUDINARY_API_KEY,

  /**
   * API Secret
   * Clave privada para autenticación con Cloudinary
   * ⚠️ NUNCA exponer esta clave en el frontend
   */
  api_secret: env.CLOUDINARY_API_SECRET,

  /**
   * Configuración adicional opcional
   */
  secure: true, // Usar HTTPS para todas las URLs
});

/**
 * =============================================================================
 * CONFIGURACIONES POR DEFECTO PARA SUBIDAS
 * =============================================================================
 * 
 * Estas opciones se usarán como base para todas las subidas de imágenes.
 * Pueden ser sobrescritas por configuraciones específicas en los services.
 */
export const uploadConfig = {
  /**
   * Carpeta raíz donde se almacenarán todas las imágenes
   * Estructura: osflsystem/[resource_type]/[organization_id]/...
   */
  folder: env.CLOUDINARY_UPLOAD_FOLDER || 'osflsystem',

  /**
   * Tipos de recursos permitidos
   * 'image' para fotos, 'video' para videos, 'raw' para archivos
   */
  resource_type: 'image',

  /**
   * Transformaciones automáticas aplicadas a todas las imágenes
   */
  transformation: [
    { quality: 'auto:good' }, // Compresión inteligente
    { fetch_format: 'auto' }, // Formato óptimo según navegador
  ],

  /**
   * Validación de tipos de archivo permitidos
   */
  allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'],

  /**
   * Tamaño máximo de archivo (en bytes)
   * 5MB = 5 * 1024 * 1024
   */
  max_file_size: 5 * 1024 * 1024,

  /**
   * Invalidar caché de CDN después de subir
   * Útil para actualizaciones de perfil/avatar
   */
  invalidate: true,

  /**
   * Overwrite de archivos con mismo nombre público
   * false = genera nombre único, true = reemplaza
   */
  overwrite: false,

  /**
   * Accesibilidad: generar versiones para diferentes necesidades
   */
  eager: [
    { width: 150, height: 150, crop: 'fill', gravity: 'face' }, // Avatar thumbnail
    { width: 400, height: 400, crop: 'fill' }, // Perfil mediano
    { width: 800, height: 800, crop: 'limit' }, // Perfil grande
  ],

  /**
   * Esperar a que las transformaciones eager se completen
   */
  eager_async: false,
};

/**
 * =============================================================================
 * CONFIGURACIONES ESPECÍFICAS POR TIPO DE RECURSO
 * =============================================================================
 * 
 * Diferentes tipos de imágenes requieren diferentes configuraciones
 * de transformación y validación.
 */

/**
 * Configuración para Avatares/Fotos de Perfil de Usuarios
 */
export const avatarConfig = {
  ...uploadConfig,
  folder: `${uploadConfig.folder}/avatars`,
  transformation: [
    { width: 400, height: 400, crop: 'fill', gravity: 'face' },
    { quality: 'auto:good' },
    { fetch_format: 'auto' },
  ],
  allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  max_file_size: 2 * 1024 * 1024, // 2MB para avatares
};

/**
 * Configuración para Logos de Organizaciones
 */
export const organizationLogoConfig = {
  ...uploadConfig,
  folder: `${uploadConfig.folder}/organizations/logos`,
  transformation: [
    { width: 300, height: 300, crop: 'fit' },
    { quality: 'auto:good' },
    { fetch_format: 'auto' },
  ],
  allowed_formats: ['jpg', 'jpeg', 'png', 'svg', 'webp'],
  max_file_size: 3 * 1024 * 1024, // 3MB para logos
};

/**
 * Configuración para Imágenes de Proyectos
 */
export const projectImageConfig = {
  ...uploadConfig,
  folder: `${uploadConfig.folder}/projects`,
  transformation: [
    { width: 800, height: 600, crop: 'limit' },
    { quality: 'auto:good' },
    { fetch_format: 'auto' },
  ],
  allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
  max_file_size: 5 * 1024 * 1024, // 5MB para proyectos
};

/**
 * Configuración para Imágenes de Comités
 */
export const committeeImageConfig = {
  ...uploadConfig,
  folder: `${uploadConfig.folder}/committees`,
  transformation: [
    { width: 400, height: 400, crop: 'fill' },
    { quality: 'auto:good' },
    { fetch_format: 'auto' },
  ],
  allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  max_file_size: 3 * 1024 * 1024, // 3MB para comités
};

/**
 * =============================================================================
 * FUNCIONES DE UTILIDAD
 * =============================================================================
 */

/**
 * Generar URL optimizada de imagen con transformaciones
 * 
 * @param {string} publicId - ID público de la imagen en Cloudinary
 * @param {Object} transformations - Transformaciones a aplicar
 * @returns {string} URL optimizada de la imagen
 * 
 * @example
 * const url = getOptimizedImageUrl('avatars/user123', { width: 150, height: 150 });
 */
export const getOptimizedImageUrl = (publicId, transformations = {}) => {
  const defaultTransformations = {
    quality: 'auto:good',
    fetch_format: 'auto',
  };

  const mergedTransformations = {
    ...defaultTransformations,
    ...transformations,
  };

  return cloudinary.url(publicId, {
    secure: true,
    transformation: mergedTransformations,
  });
};

/**
 * Generar URL de avatar con tamaño específico
 * 
 * @param {string} publicId - ID público del avatar
 * @param {'thumbnail' | 'medium' | 'large'} size - Tamaño deseado
 * @returns {string} URL del avatar
 */
export const getAvatarUrl = (publicId, size = 'medium') => {
  const sizes = {
    thumbnail: { width: 150, height: 150, crop: 'fill', gravity: 'face' },
    medium: { width: 400, height: 400, crop: 'fill', gravity: 'face' },
    large: { width: 800, height: 800, crop: 'limit' },
  };

  return getOptimizedImageUrl(publicId, sizes[size]);
};

/**
 * Verificar si la configuración de Cloudinary es válida
 * 
 * @returns {Object} Resultado de la validación
 * 
 * @example
 * const validation = validateCloudinaryConfig();
 * if (!validation.isValid) {
 *   console.error(validation.errors);
 * }
 */
export const validateCloudinaryConfig = () => {
  const errors = [];

  if (!env.CLOUDINARY_CLOUD_NAME) {
    errors.push('CLOUDINARY_CLOUD_NAME no está configurada');
  }

  if (!env.CLOUDINARY_API_KEY) {
    errors.push('CLOUDINARY_API_KEY no está configurada');
  }

  if (!env.CLOUDINARY_API_SECRET) {
    errors.push('CLOUDINARY_API_SECRET no está configurada');
  }

  return {
    isValid: errors.length === 0,
    errors,
    config: {
      cloud_name: env.CLOUDINARY_CLOUD_NAME ? '***' : undefined,
      api_key: env.CLOUDINARY_API_KEY ? '***' : undefined,
      api_secret: env.CLOUDINARY_API_SECRET ? '***' : undefined,
      secure: true,
    },
  };
};

/**
 * =============================================================================
 * EXPORTACIÓN POR DEFECTO
 * =============================================================================
 * 
 * Exporta la instancia configurada de cloudinary para uso en services
 */
export default cloudinary;

/**
 * =============================================================================
 * LOG DE INICIALIZACIÓN (Solo en desarrollo)
 * =============================================================================
 */
if (env.NODE_ENV === 'development') {
  const validation = validateCloudinaryConfig();
  
  if (validation.isValid) {
    console.log('✅ Cloudinary configurado correctamente');
    console.log(`📁 Carpeta base: ${uploadConfig.folder}`);
    console.log(`🔒 Conexión segura: ${cloudinary.config().secure}`);
  } else {
    console.warn('⚠️  Cloudinary no está configurado correctamente:');
    validation.errors.forEach(error => console.warn(`   - ${error}`));
    console.warn('   Las subidas de imágenes no funcionarán hasta configurar las credenciales');
  }
}