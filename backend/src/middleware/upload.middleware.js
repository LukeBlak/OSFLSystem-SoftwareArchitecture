/**
 * =============================================================================
 * MIDDLEWARE DE SUBIDA DE ARCHIVOS - CAPA DE PRESENTACIÓN
 * =============================================================================
 * 
 * Propósito (ADR-001):
 * - Manejar la recepción de archivos multipart/form-data en las peticiones HTTP
 * - Validar tipos de archivo, tamaños y restricciones antes de procesar
 * - Integrar con Cloudinary para almacenamiento de imágenes
 * - Proveer configuración reutilizable para diferentes tipos de subida
 * 
 * Arquitectura:
 * - Capa: Presentación (Middleware de Express)
 * - Patrón: Middleware Chain + Strategy Pattern (por tipo de archivo)
 * - Integración: Multer + Cloudinary
 * 
 * Librerías utilizadas:
 * - multer: Middleware para manejar multipart/form-data
 * - cloudinary: Servicio de almacenamiento de imágenes
 * 
 * Casos de Uso relacionados:
 * - CU-05: Actualizar perfil + Cloudinary (Avatar/Foto de perfil)
 * - Subida de logos de organizaciones
 * - Subida de imágenes de proyectos/comités
 * 
 * @module middleware/upload.middleware
 * @layer Presentation
 */

import multer from 'multer';
import { ApiError } from '../utils/apiError.js';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../utils/logger.js';

// =============================================================================
// CONFIGURACIÓN DE ALMACENAMIENTO
// =============================================================================

/**
 * Configuración de almacenamiento en memoria
 * 
 * Usamos memoryStorage() en lugar de diskStorage() porque:
 * 1. Las imágenes se subirán directamente a Cloudinary
 * 2. No necesitamos guardar archivos temporales en el servidor
 * 3. Reduce la complejidad de limpieza de archivos temporales
 * 4. Mejor para entornos containerizados (Docker)
 * 
 * @type {StorageEngine}
 */
const storage = multer.memoryStorage();

// =============================================================================
// FILTROS DE VALIDACIÓN DE ARCHIVOS
// =============================================================================

/**
 * Mapeo de tipos MIME aceptados por categoría de archivo
 * 
 * @constant {Object}
 */
const FILE_TYPE_MAP = {
  /**
   * Imágenes para avatares/perfiles
   * Formatos: JPEG, PNG, WebP, GIF
   */
  image: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
  ],
  
  /**
   * Documentos para comprobantes
   * Formatos: PDF, PNG, JPEG
   */
  document: [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
  ],
  
  /**
   * Archivos de audio (opcional, para futuras funcionalidades)
   */
  audio: [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
  ],
  
  /**
   * Archivos de video (opcional, para futuras funcionalidades)
   */
  video: [
    'video/mp4',
    'video/webm',
    'video/ogg',
  ],
};

/**
 * Límites de tamaño por tipo de archivo (en bytes)
 * 
 * @constant {Object}
 */
const FILE_SIZE_LIMITS = {
  /** Avatar: 2MB máximo */
  avatar: 2 * 1024 * 1024,
  
  /** Logo de organización: 3MB máximo */
  logo: 3 * 1024 * 1024,
  
  /** Imagen de proyecto: 5MB máximo */
  projectImage: 5 * 1024 * 1024,
  
  /** Documento/comprobante: 10MB máximo */
  document: 10 * 1024 * 1024,
  
  /** Por defecto: 5MB máximo */
  default: 5 * 1024 * 1024,
};

/**
 * Filtro de archivos para validación de tipo MIME
 * 
 * Este filtro se ejecuta antes de que Multer procese el archivo.
 * Rechaza archivos que no cumplan con los tipos MIME permitidos.
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} file - Información del archivo subido
 * @param {Function} cb - Callback de Multer (error, accept)
 * 
 * @example
 * // Acepta el archivo
 * cb(null, true);
 * 
 * @example
 * // Rechaza el archivo con error
 * cb(new ApiError(400, 'Tipo de archivo no permitido'), false);
 */
const fileFilter = (req, file, cb) => {
  try {
    // =========================================================================
    // 1. OBTENER TIPO DE ARCHIVO DESDE EL CONTEXTO DE LA PETICIÓN
    // =========================================================================
    /**
     * El tipo de archivo se puede especificar de varias formas:
     * 1. req.fileType (configurado en la ruta)
     * 2. req.body.fileType (enviado en el form data)
     * 3. 'image' por defecto
     */
    const fileType = req.fileType || req.body.fileType || 'image';
    
    // =========================================================================
    // 2. OBTENER TIPOS MIME PERMITIDOS
    // =========================================================================
    const allowedMimeTypes = FILE_TYPE_MAP[fileType] || FILE_TYPE_MAP.image;
    
    // =========================================================================
    // 3. VALIDAR TIPO MIME
    // =========================================================================
    if (allowedMimeTypes.includes(file.mimetype)) {
      // Tipo de archivo válido - aceptar archivo
      cb(null, true);
    } else {
      // Tipo de archivo inválido - rechazar con error descriptivo
      logger.warn('Intento de subida de archivo con tipo MIME no permitido', {
        fileType,
        mimetype: file.mimetype,
        allowedTypes: allowedMimeTypes,
        originalName: file.originalname,
      });
      
      cb(
        new ApiError(
          StatusCodes.BAD_REQUEST,
          `Tipo de archivo no permitido. Tipos aceptados: ${allowedMimeTypes.join(', ')}`,
          {
            code: 'INVALID_FILE_TYPE',
            details: {
              provided: file.mimetype,
              allowed: allowedMimeTypes,
            },
          }
        ),
        false
      );
    }
  } catch (error) {
    // Error inesperado en el filtro
    logger.error('Error en fileFilter de Multer', {
      error: error.message,
      file: file.originalname,
    });
    
    cb(
      new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Error al validar el archivo',
        { isOperational: false }
      ),
      false
    );
  }
};

// =============================================================================
// CONFIGURACIONES PREDEFINIDAS DE MULTER
// =============================================================================

/**
 * Configuración base para subida de imágenes
 * 
 * @type {Object}
 */
const baseImageConfig = {
  storage,
  fileFilter,
  limits: {
    /** Tamaño máximo del archivo (se sobrescribe por tipo específico) */
    fileSize: FILE_SIZE_LIMITS.default,
    
    /** Número máximo de archivos (para uploads múltiples) */
    fileCount: 1,
    
    /** Tamaño máximo del campo de texto en el form */
    fieldNameSize: 100,
    
    /** Tamaño máximo de cada campo de texto */
    fieldSize: 100,
    
    /** Número máximo de campos de texto */
    fields: 10,
    
    /** Número máximo de partes en el form multipart */
    parts: 10,
    
    /** Número máximo de campos de archivo */
    files: 1,
  },
};

/**
 * Configuración específica para avatares de usuarios
 * 
 * @type {Object}
 */
const avatarConfig = {
  ...baseImageConfig,
  limits: {
    ...baseImageConfig.limits,
    fileSize: FILE_SIZE_LIMITS.avatar,
  },
};

/**
 * Configuración específica para logos de organizaciones
 * 
 * @type {Object}
 */
const logoConfig = {
  ...baseImageConfig,
  limits: {
    ...baseImageConfig.limits,
    fileSize: FILE_SIZE_LIMITS.logo,
  },
};

/**
 * Configuración específica para imágenes de proyectos
 * 
 * @type {Object}
 */
const projectImageConfig = {
  ...baseImageConfig,
  limits: {
    ...baseImageConfig.limits,
    fileSize: FILE_SIZE_LIMITS.projectImage,
  },
};

/**
 * Configuración específica para documentos/comprobantes
 * 
 * @type {Object}
 */
const documentConfig = {
  ...baseImageConfig,
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = FILE_TYPE_MAP.document;
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new ApiError(
          StatusCodes.BAD_REQUEST,
          `Tipo de documento no permitido. Tipos aceptados: PDF, JPEG, PNG`,
          {
            code: 'INVALID_DOCUMENT_TYPE',
            details: {
              provided: file.mimetype,
              allowed: allowedMimeTypes,
            },
          }
        ),
        false
      );
    }
  },
  limits: {
    ...baseImageConfig.limits,
    fileSize: FILE_SIZE_LIMITS.document,
  },
};

// =============================================================================
// INSTANCIAS DE MULTER POR TIPO DE ARCHIVO
// =============================================================================

/**
 * Instancia de Multer para subida de avatares
 * 
 * @example
 * // En routes/profile.routes.js
 * router.post('/avatar', uploadAvatar.single('avatar'), profileController.uploadAvatar);
 */
export const uploadAvatar = multer(avatarConfig);

/**
 * Instancia de Multer para subida de logos de organizaciones
 * 
 * @example
 * // En routes/organization.routes.js
 * router.post('/logo', uploadLogo.single('logo'), organizationController.uploadLogo);
 */
export const uploadLogo = multer(logoConfig);

/**
 * Instancia de Multer para subida de imágenes de proyectos
 * 
 * @example
 * // En routes/project.routes.js
 * router.post('/images', uploadProjectImage.array('images', 5), projectController.uploadImages);
 */
export const uploadProjectImage = multer(projectImageConfig);

/**
 * Instancia de Multer para subida de documentos/comprobantes
 * 
 * @example
 * // En routes/finance.routes.js
 * router.post('/receipt', uploadDocument.single('receipt'), financeController.uploadReceipt);
 */
export const uploadDocument = multer(documentConfig);

/**
 * Instancia de Multer genérica para imágenes (uso general)
 * 
 * @example
 * // En rutas que necesitan subida de imágenes sin configuración específica
 * router.post('/upload', uploadImage.single('file'), genericController.upload);
 */
export const uploadImage = multer(baseImageConfig);

// =============================================================================
// MIDDLEWARE DE VALIDACIÓN POST-UPLOAD
// =============================================================================

/**
 * Middleware para validar que se haya subido un archivo
 * 
 * Se usa después del middleware de Multer para asegurar que
 * el archivo fue procesado correctamente.
 * 
 * @param {string} [fieldName='file'] - Nombre del campo del archivo
 * @returns {Function} Middleware de Express
 * 
 * @throws {ApiError} 400 - Si no se proporcionó ningún archivo
 * 
 * @example
 * // En routes/profile.routes.js
 * router.post('/avatar', 
 *   uploadAvatar.single('avatar'), 
 *   ensureFileUploaded('avatar'),
 *   profileController.uploadAvatar
 * );
 */
export const ensureFileUploaded = (fieldName = 'file') => {
  return (req, res, next) => {
    try {
      // =========================================================================
      // 1. VERIFICAR QUE EXISTE EL ARCHIVO EN EL REQUEST
      // =========================================================================
      if (!req.file && !req.files) {
        throw ApiError.badRequest(
          `No se proporcionó ningún archivo en el campo '${fieldName}'`,
          {
            code: 'FILE_REQUIRED',
            details: {
              fieldName,
              acceptedTypes: FILE_TYPE_MAP.image,
              maxSize: FILE_SIZE_LIMITS.default,
            },
          }
        );
      }

      // =========================================================================
      // 2. VERIFICAR QUE EL ARCHIVO TIENE DATOS VÁLIDOS
      // =========================================================================
      const file = req.file || (req.files && req.files[0]);

      if (!file || !file.buffer || file.buffer.length === 0) {
        throw ApiError.badRequest(
          'El archivo subido está vacío o es inválido',
          {
            code: 'EMPTY_FILE',
          }
        );
      }

      // =========================================================================
      // 3. AGREGAR METADATOS DEL ARCHIVO AL REQUEST
      // =========================================================================
      req.fileMetadata = {
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        fieldName: file.fieldname,
        uploadedAt: new Date().toISOString(),
      };

      // =========================================================================
      // 4. LOGUEAR LA SUBIDA EXITOSA
      // =========================================================================
      logger.info('Archivo subido exitosamente', {
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        fieldName: file.fieldname,
      });

      // =========================================================================
      // 5. CONTINUAR CON LA CADENA DE MIDDLEWARE
      // =========================================================================
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware para validar múltiples archivos
 * 
 * @param {Object} options - Opciones de validación
 * @param {number} [options.minFiles=1] - Número mínimo de archivos
 * @param {number} [options.maxFiles=5] - Número máximo de archivos
 * @param {string} [options.fieldName='files'] - Nombre del campo
 * @returns {Function} Middleware de Express
 * 
 * @throws {ApiError} 400 - Si el número de archivos no cumple con los límites
 * 
 * @example
 * // En routes/project.routes.js
 * router.post('/images', 
 *   uploadProjectImage.array('images', 5),
 *   validateMultipleFiles({ minFiles: 1, maxFiles: 5, fieldName: 'images' }),
 *   projectController.uploadImages
 * );
 */
export const validateMultipleFiles = (options = {}) => {
  const {
    minFiles = 1,
    maxFiles = 5,
    fieldName = 'files',
  } = options;

  return (req, res, next) => {
    try {
      // =========================================================================
      // 1. VERIFICAR QUE EXISTEN ARCHIVOS
      // =========================================================================
      if (!req.files || !Array.isArray(req.files)) {
        throw ApiError.badRequest(
          `No se proporcionaron archivos en el campo '${fieldName}'`,
          {
            code: 'FILES_REQUIRED',
          }
        );
      }

      // =========================================================================
      // 2. VALIDAR NÚMERO DE ARCHIVOS
      // =========================================================================
      const fileCount = req.files.length;

      if (fileCount < minFiles) {
        throw ApiError.badRequest(
          `Se requieren al menos ${minFiles} archivo(s)`,
          {
            code: 'MIN_FILES_NOT_MET',
            details: {
              required: minFiles,
              received: fileCount,
            },
          }
        );
      }

      if (fileCount > maxFiles) {
        throw ApiError.badRequest(
          `Se permiten máximo ${maxFiles} archivo(s)`,
          {
            code: 'MAX_FILES_EXCEEDED',
            details: {
              allowed: maxFiles,
              received: fileCount,
            },
          }
        );
      }

      // =========================================================================
      // 3. AGREGAR METADATOS DE LOS ARCHIVOS AL REQUEST
      // =========================================================================
      req.filesMetadata = req.files.map((file) => ({
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        fieldName: file.fieldname,
      }));

      // =========================================================================
      // 4. LOGUEAR LA SUBIDA EXITOSA
      // =========================================================================
      logger.info('Múltiples archivos subidos exitosamente', {
        count: fileCount,
        fieldName,
        files: req.filesMetadata.map((f) => f.originalName),
      });

      // =========================================================================
      // 5. CONTINUAR CON LA CADENA DE MIDDLEWARE
      // =========================================================================
      next();
    } catch (error) {
      next(error);
    }
  };
};

// =============================================================================
// MIDDLEWARE DE MANEJO DE ERRORES DE MULTER
// =============================================================================

/**
 * Middleware para manejar errores específicos de Multer
 * 
 * Se debe usar DESPUÉS de los middleware de upload para capturar
 * cualquier error que ocurra durante el procesamiento de archivos.
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express
 * 
 * @example
 * // En app.js o en rutas específicas
 * router.post('/upload', 
 *   uploadAvatar.single('avatar'),
 *   handleMulterError,
 *   profileController.uploadAvatar
 * );
 */
export const handleMulterError = (req, res, next) => {
  // Multer ya maneja sus propios errores y los pasa a next()
  // Este middleware es para logging adicional si se necesita
  next();
};

/**
 * Handler de errores de Multer para usar con errorHandler.middleware.js
 * 
 * @param {Error} error - Error capturado
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función next de Express
 * 
 * @returns {Object} Respuesta de error estandarizada
 */
export const multerErrorHandler = (error, req, res, next) => {
  // =========================================================================
  // 1. VERIFICAR SI ES ERROR DE MULTER
  // =========================================================================
  if (error instanceof multer.MulterError) {
    // =========================================================================
    // 2. MAPEAR CÓDIGOS DE ERROR DE MULTER A RESPUESTAS AMIGABLES
    // =========================================================================
    const multerErrorMap = {
      'LIMIT_FILE_SIZE': {
        message: 'El archivo excede el tamaño máximo permitido',
        code: 'FILE_TOO_LARGE',
        statusCode: StatusCodes.PAYLOAD_TOO_LARGE,
      },
      'LIMIT_FILE_COUNT': {
        message: 'Se excedió el número máximo de archivos',
        code: 'TOO_MANY_FILES',
        statusCode: StatusCodes.BAD_REQUEST,
      },
      'LIMIT_UNEXPECTED_FILE': {
        message: 'Campo de archivo inesperado',
        code: 'UNEXPECTED_FIELD',
        statusCode: StatusCodes.BAD_REQUEST,
      },
      'LIMIT_FIELD_KEY': {
        message: 'Nombre de campo demasiado largo',
        code: 'FIELD_NAME_TOO_LONG',
        statusCode: StatusCodes.BAD_REQUEST,
      },
      'LIMIT_FIELD_VALUE': {
        message: 'Valor de campo demasiado largo',
        code: 'FIELD_VALUE_TOO_LONG',
        statusCode: StatusCodes.BAD_REQUEST,
      },
      'LIMIT_FIELD_COUNT': {
        message: 'Demasiados campos en el formulario',
        code: 'TOO_MANY_FIELDS',
        statusCode: StatusCodes.BAD_REQUEST,
      },
      'LIMIT_PART_COUNT': {
        message: 'Demasiadas partes en el formulario multipart',
        code: 'TOO_MANY_PARTS',
        statusCode: StatusCodes.BAD_REQUEST,
      },
    };

    const errorConfig = multerErrorMap[error.code] || {
      message: 'Error al procesar el archivo',
      code: 'UPLOAD_ERROR',
      statusCode: StatusCodes.BAD_REQUEST,
    };

    // =========================================================================
    // 3. LOGUEAR EL ERROR
    // =========================================================================
    logger.warn('Error de Multer', {
      code: error.code,
      message: error.message,
      field: error.field,
      statusCode: errorConfig.statusCode,
    });

    // =========================================================================
    // 4. RETORNAR ERROR ESTANDARIZADO
    // =========================================================================
    return res.status(errorConfig.statusCode).json({
      success: false,
      error: {
        code: errorConfig.code,
        message: errorConfig.message,
        details: {
          multerCode: error.code,
          field: error.field,
          maxSize: FILE_SIZE_LIMITS.default,
        },
      },
    });
  }

  // =========================================================================
  // 5. SI NO ES ERROR DE MULTER, PASAR AL SIGUIENTE MIDDLEWARE
  // =========================================================================
  next(error);
};

// =============================================================================
// UTILIDADES DE VALIDACIÓN
// =============================================================================

/**
 * Verifica si un tipo MIME es una imagen válida
 * 
 * @param {string} mimeType - Tipo MIME del archivo
 * @returns {boolean} True si es una imagen válida
 * 
 * @example
 * if (isValidImage(file.mimetype)) {
 *   // Procesar imagen
 * }
 */
export const isValidImage = (mimeType) => {
  return FILE_TYPE_MAP.image.includes(mimeType);
};

/**
 * Verifica si un tipo MIME es un documento válido
 * 
 * @param {string} mimeType - Tipo MIME del archivo
 * @returns {boolean} True si es un documento válido
 */
export const isValidDocument = (mimeType) => {
  return FILE_TYPE_MAP.document.includes(mimeType);
};

/**
 * Obtiene el límite de tamaño para un tipo de archivo
 * 
 * @param {string} fileType - Tipo de archivo (avatar, logo, projectImage, document)
 * @returns {number} Límite de tamaño en bytes
 * 
 * @example
 * const maxSize = getFileSizeLimit('avatar'); // 2097152 bytes (2MB)
 */
export const getFileSizeLimit = (fileType) => {
  return FILE_SIZE_LIMITS[fileType] || FILE_SIZE_LIMITS.default;
};

/**
 * Formatea el tamaño de archivo para mostrar al usuario
 * 
 * @param {number} bytes - Tamaño en bytes
 * @returns {string} Tamaño formateado (ej: "2.5 MB")
 * 
 * @example
 * formatFileSize(2097152); // "2 MB"
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// =============================================================================
// EXPORTACIÓN POR DEFECTO
// =============================================================================

/**
 * Exporta todas las configuraciones y utilidades del módulo
 * 
 * @example
 * // Importación named (recomendado)
 * import { 
 *   uploadAvatar, 
 *   uploadLogo, 
 *   ensureFileUploaded,
 *   FILE_TYPE_MAP
 * } from './middleware/upload.middleware.js';
 * 
 * @example
 * // Importación por defecto
 * import uploadMiddleware from './middleware/upload.middleware.js';
 * uploadMiddleware.uploadAvatar.single('avatar');
 */
export default {
  // Instancias de Multer
  uploadAvatar,
  uploadLogo,
  uploadProjectImage,
  uploadDocument,
  uploadImage,
  
  // Middlewares de validación
  ensureFileUploaded,
  validateMultipleFiles,
  handleMulterError,
  multerErrorHandler,
  
  // Utilidades
  isValidImage,
  isValidDocument,
  getFileSizeLimit,
  formatFileSize,
  
  // Configuraciones
  FILE_TYPE_MAP,
  FILE_SIZE_LIMITS,
  storage,
};