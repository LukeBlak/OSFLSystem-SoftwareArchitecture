/**
 * =============================================================================
 * SERVICIO DE EMAIL - CAPA DE APLICACIÓN
 * =============================================================================
 * 
 * Propósito (ADR-001):
 * - Implementar la lógica de negocio para envío de correos electrónicos
 * - Centralizar todas las operaciones de email en un solo servicio
 * - Proveer plantillas reutilizables para diferentes tipos de correos
 * - Integrar con Nodemailer para envío de emails
 * 
 * Arquitectura:
 * - Capa: Aplicación (Services)
 * - Patrón: Service Layer + Template Pattern
 * - Integración: Nodemailer + SMTP
 * 
 * Casos de Uso relacionados:
 * - Reestablecimiento de contraseña
 * - Verificación de email
 * - Bienvenida a nuevos usuarios
 * - Notificaciones de proyectos
 * - Anuncios de organización
 * 
 * @module services/email.service
 * @layer Application
 */

import nodemailer from 'nodemailer';
import { ApiError } from '../utils/apiError.js';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

// =============================================================================
// CONFIGURACIÓN DEL TRANSPORTE DE EMAIL
// =============================================================================

/**
 * Configuración del transporte SMTP para Nodemailer
 * 
 * @constant {Object}
 */
const smtpConfig = {
  host: env.EMAIL_HOST,
  port: env.EMAIL_PORT,
  secure: env.EMAIL_PORT === 465, // true para 465, false para otros puertos
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: env.NODE_ENV === 'production',
  },
};

/**
 * Configuración por defecto para todos los emails
 * 
 * @constant {Object}
 */
const emailDefaults = {
  from: env.EMAIL_FROM,
  replyTo: env.EMAIL_USER,
};

/**
 * Instancia del transporter de Nodemailer
 * 
 * @type {import('nodemailer').Transporter}
 */
let transporter = null;

// =============================================================================
// INICIALIZACIÓN DEL TRANSPORTER
// =============================================================================

/**
 * Inicializa el transporter de Nodemailer
 * 
 * @returns {Promise<import('nodemailer').Transporter>} Transporter configurado
 */
export const initializeTransporter = async () => {
  try {
    transporter = nodemailer.createTransport(smtpConfig);

    // Verificar conexión con el servidor SMTP
    await transporter.verify();

    logger.info('✅ Servicio de email inicializado correctamente', {
      host: env.EMAIL_HOST,
      port: env.EMAIL_PORT,
      from: env.EMAIL_FROM,
    });

    return transporter;
  } catch (error) {
    logger.error('❌ Error al inicializar el servicio de email', {
      error: error.message,
      host: env.EMAIL_HOST,
      port: env.EMAIL_PORT,
    });

    // En desarrollo, continuar sin email (no bloquear)
    if (env.NODE_ENV === 'development') {
      logger.warn('⚠️  El servicio de email no está disponible. Los emails se loggearán en consola.');
      return null;
    }

    // En producción, lanzar error
    throw ApiError.internal(
      'Error al configurar el servicio de email',
      {
        code: 'EMAIL_SERVICE_ERROR',
        details: error.message,
      }
    );
  }
};

/**
 * Obtiene el transporter (lo inicializa si es necesario)
 * 
 * @returns {Promise<import('nodemailer').Transporter|null>} Transporter o null
 */
export const getTransporter = async () => {
  if (!transporter) {
    return await initializeTransporter();
  }
  return transporter;
};

// =============================================================================
// PLANTILLAS DE EMAIL
// =============================================================================

/**
 * Plantilla para email de reestablecimiento de contraseña
 * 
 * @param {Object} data - Datos para la plantilla
 * @param {string} data.userName - Nombre del usuario
 * @param {string} data.resetUrl - URL de reestablecimiento
 * @param {string} data.email - Email del usuario
 * 
 * @returns {Object} Email configurado
 */
export const getPasswordResetTemplate = ({ userName, resetUrl, email }) => {
  const expirationHours = 1;

  return {
    subject: 'Reestablecimiento de Contraseña - OSFLSystem',
    to: email,
    html: `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            text-align: center;
            margin: -30px -30px 20px -30px;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .content {
            margin-bottom: 20px;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 20px 0;
          }
          .warning {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
          .code {
            background-color: #f8f9fa;
            padding: 10px;
            border-radius: 4px;
            font-family: monospace;
            word-break: break-all;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 OSFLSystem</h1>
            <p>Reestablecimiento de Contraseña</p>
          </div>
          
          <div class="content">
            <p>Hola <strong>${userName}</strong>,</p>
            
            <p>Hemos recibido una solicitud para reestablecer tu contraseña en OSFLSystem.</p>
            
            <p>Para reestablecer tu contraseña, haz clic en el siguiente botón:</p>
            
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reestablecer Contraseña</a>
            </p>
            
            <p>O copia y pega el siguiente enlace en tu navegador:</p>
            <p class="code">${resetUrl}</p>
            
            <div class="warning">
              <strong>⚠️ Importante:</strong>
              <ul>
                <li>Este enlace expirará en <strong>${expirationHours} hora(s)</strong></li>
                <li>Si no solicitaste este cambio, puedes ignorar este email</li>
                <li>Tu contraseña actual seguirá activa hasta que uses este enlace</li>
              </ul>
            </div>
            
            <p>Si tienes problemas con el enlace, contacta a soporte técnico.</p>
          </div>
          
          <div class="footer">
            <p>Este email fue enviado a <strong>${email}</strong></p>
            <p>© ${new Date().getFullYear()} OSFLSystem - Sistema de Gestión de Voluntariados</p>
            <p>Si no reconoces este email, por favor repórtalo como phishing.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Hola ${userName},

      Hemos recibido una solicitud para reestablecer tu contraseña en OSFLSystem.

      Para reestablecer tu contraseña, visita el siguiente enlace:
      ${resetUrl}

      IMPORTANTE:
      - Este enlace expirará en ${expirationHours} hora(s)
      - Si no solicitaste este cambio, puedes ignorar este email
      - Tu contraseña actual seguirá activa hasta que uses este enlace

      Si tienes problemas con el enlace, contacta a soporte técnico.

      ---
      Este email fue enviado a ${email}
      © ${new Date().getFullYear()} OSFLSystem - Sistema de Gestión de Voluntariados
    `,
  };
};

/**
 * Plantilla para email de verificación de cuenta
 * 
 * @param {Object} data - Datos para la plantilla
 * @param {string} data.userName - Nombre del usuario
 * @param {string} data.verificationUrl - URL de verificación
 * @param {string} data.email - Email del usuario
 * 
 * @returns {Object} Email configurado
 */
export const getEmailVerificationTemplate = ({ userName, verificationUrl, email }) => {
  return {
    subject: 'Verifica tu Email - OSFLSystem',
    to: email,
    html: `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            text-align: center;
            margin: -30px -30px 20px -30px;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .content {
            margin-bottom: 20px;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 20px 0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ OSFLSystem</h1>
            <p>Verificación de Email</p>
          </div>
          
          <div class="content">
            <p>¡Bienvenido <strong>${userName}</strong>!</p>
            
            <p>Gracias por registrarte en OSFLSystem. Para completar tu registro, necesitamos verificar tu dirección de email.</p>
            
            <p>Por favor, haz clic en el siguiente botón para verificar tu email:</p>
            
            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verificar Email</a>
            </p>
            
            <p>Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:</p>
            <p style="background-color: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; word-break: break-all;">${verificationUrl}</p>
          </div>
          
          <div class="footer">
            <p>Este email fue enviado a <strong>${email}</strong></p>
            <p>© ${new Date().getFullYear()} OSFLSystem - Sistema de Gestión de Voluntariados</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      ¡Bienvenido ${userName}!

      Gracias por registrarte en OSFLSystem. Para completar tu registro, necesitamos verificar tu dirección de email.

      Por favor, visita el siguiente enlace para verificar tu email:
      ${verificationUrl}

      ---
      Este email fue enviado a ${email}
      © ${new Date().getFullYear()} OSFLSystem - Sistema de Gestión de Voluntariados
    `,
  };
};

/**
 * Plantilla para email de bienvenida
 * 
 * @param {Object} data - Datos para la plantilla
 * @param {string} data.userName - Nombre del usuario
 * @param {string} data.organizationName - Nombre de la organización
 * @param {string} data.email - Email del usuario
 * 
 * @returns {Object} Email configurado
 */
export const getWelcomeTemplate = ({ userName, organizationName, email }) => {
  return {
    subject: `¡Bienvenido a ${organizationName}! - OSFLSystem`,
    to: email,
    html: `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            text-align: center;
            margin: -30px -30px 20px -30px;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .content {
            margin-bottom: 20px;
          }
          .info-box {
            background-color: #e7f3ff;
            border-left: 4px solid #2196F3;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 ¡Bienvenido!</h1>
            <p>${organizationName}</p>
          </div>
          
          <div class="content">
            <p>Hola <strong>${userName}</strong>,</p>
            
            <p>¡Nos complace darte la bienvenida a <strong>${organizationName}</strong>!</p>
            
            <p>Ahora formas parte de nuestra comunidad de voluntarios. Desde tu panel de control podrás:</p>
            
            <ul>
              <li>📋 Ver y postularte a proyectos de voluntariado</li>
              <li>⏱️ Registrar tus horas sociales</li>
              <li>📢 Recibir anuncios y notificaciones</li>
              <li>💬 Enviar sugerencias y mensajes</li>
            </ul>
            
            <div class="info-box">
              <strong>💡 Primeros pasos:</strong>
              <ol>
                <li>Completa tu perfil de usuario</li>
                <li>Explora los proyectos disponibles</li>
                <li>Postúlate a las actividades de tu interés</li>
              </ol>
            </div>
            
            <p>Si tienes alguna pregunta, no dudes en contactar a tu líder de organización.</p>
            
            <p>¡Gracias por ser parte del cambio!</p>
          </div>
          
          <div class="footer">
            <p>Este email fue enviado a <strong>${email}</strong></p>
            <p>© ${new Date().getFullYear()} OSFLSystem - Sistema de Gestión de Voluntariados</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      ¡Bienvenido ${userName}!

      Nos complace darte la bienvenida a ${organizationName}!

      Ahora formas parte de nuestra comunidad de voluntarios. Desde tu panel de control podrás:
      - Ver y postularte a proyectos de voluntariado
      - Registrar tus horas sociales
      - Recibir anuncios y notificaciones
      - Enviar sugerencias y mensajes

      Primeros pasos:
      1. Completa tu perfil de usuario
      2. Explora los proyectos disponibles
      3. Postúlate a las actividades de tu interés

      Si tienes alguna pregunta, no dudes en contactar a tu líder de organización.

      ¡Gracias por ser parte del cambio!

      ---
      Este email fue enviado a ${email}
      © ${new Date().getFullYear()} OSFLSystem - Sistema de Gestión de Voluntariados
    `,
  };
};

/**
 * Plantilla para email de notificación de proyecto
 * 
 * @param {Object} data - Datos para la plantilla
 * @param {string} data.userName - Nombre del usuario
 * @param {string} data.projectName - Nombre del proyecto
 * @param {string} data.action - Acción realizada (creado, actualizado, etc.)
 * @param {string} data.email - Email del usuario
 * 
 * @returns {Object} Email configurado
 */
export const getProjectNotificationTemplate = ({ userName, projectName, action, email }) => {
  const actionMessages = {
    creado: 'Se ha creado un nuevo proyecto de voluntariado',
    actualizado: 'Se ha actualizado un proyecto de voluntariado',
    eliminado: 'Se ha eliminado un proyecto de voluntariado',
    postulado: 'Te has postulado a un proyecto de voluntariado',
    aceptado: 'Tu postulación ha sido aceptada',
    rechazado: 'Tu postulación ha sido rechazada',
  };

  return {
    subject: `Notificación de Proyecto - ${projectName}`,
    to: email,
    html: `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 30px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            text-align: center;
            margin: -30px -30px 20px -30px;
          }
          .content {
            margin-bottom: 20px;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 OSFLSystem</h1>
            <p>Notificación de Proyecto</p>
          </div>
          <div class="content">
            <p>Hola <strong>${userName}</strong>,</p>
            <p>${actionMessages[action] || 'Hay una actualización en un proyecto'}:</p>
            <p><strong>${projectName}</strong></p>
            <p>Ingresa a tu panel de control para más detalles.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} OSFLSystem</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Hola ${userName},

      ${actionMessages[action] || 'Hay una actualización en un proyecto'}:
      ${projectName}

      Ingresa a tu panel de control para más detalles.

      ---
      © ${new Date().getFullYear()} OSFLSystem
    `,
  };
};

// =============================================================================
// FUNCIONES DEL SERVICIO
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * ENVIAR EMAIL
 * -----------------------------------------------------------------------------
 * 
 * Envía un email usando el transporter configurado.
 * 
 * @param {Object} emailOptions - Opciones del email
 * @param {string} emailOptions.to - Email del destinatario
 * @param {string} emailOptions.subject - Asunto del email
 * @param {string} emailOptions.html - Contenido HTML del email
 * @param {string} [emailOptions.text] - Contenido en texto plano (opcional)
 * @param {string} [emailOptions.from] - Remitente (usa el default si no se proporciona)
 * @param {Array} [emailOptions.cc] - Copia carbono (opcional)
 * @param {Array} [emailOptions.bcc] - Copia carbono oculta (opcional)
 * @param {Array} [emailOptions.attachments] - Adjuntos (opcional)
 * 
 * @returns {Promise<Object>} Resultado del envío
 * @returns {boolean} return.success - Si el envío fue exitoso
 * @returns {string} return.messageId - ID del mensaje enviado
 * 
 * @throws {ApiError} 503 - Si el servicio de email no está disponible
 * @throws {ApiError} 500 - Si hay error en el envío
 * 
 * @example
 * await emailService.sendEmail({
 *   to: 'usuario@ejemplo.com',
 *   subject: 'Bienvenido',
 *   html: '<h1>Hola!</h1>'
 * });
 */
export const sendEmail = async (emailOptions) => {
  try {
    // =========================================================================
    // 1. OBTENER TRANSPORTER
    // =========================================================================
    const mailer = await getTransporter();

    // =========================================================================
    // 2. PREPARAR OPCIONES DEL EMAIL
    // =========================================================================
    const mailConfig = {
      from: emailOptions.from || emailDefaults.from,
      to: emailOptions.to,
      subject: emailOptions.subject,
      html: emailOptions.html,
      text: emailOptions.text,
      cc: emailOptions.cc,
      bcc: emailOptions.bcc,
      attachments: emailOptions.attachments,
      priority: emailOptions.priority || 'normal',
    };

    // =========================================================================
    // 3. MODO DESARROLLO - LOGUEAR EN CONSOLA
    // =========================================================================
    if (env.NODE_ENV === 'development' && !mailer) {
      logger.info('📧 Email (Development Mode)', {
        to: mailConfig.to,
        subject: mailConfig.subject,
        from: mailConfig.from,
      });
      logger.debug('Contenido del email:', {
        html: mailConfig.html?.substring(0, 500) + '...',
        text: mailConfig.text?.substring(0, 500) + '...',
      });

      return {
        success: true,
        messageId: 'dev-mode-' + Date.now(),
        message: 'Email logueado en consola (modo desarrollo)',
      };
    }

    // =========================================================================
    // 4. VERIFICAR QUE EL TRANSPORTER ESTÉ DISPONIBLE
    // =========================================================================
    if (!mailer) {
      throw ApiError.serviceUnavailable(
        'El servicio de email no está disponible',
        {
          code: 'EMAIL_SERVICE_UNAVAILABLE',
        }
      );
    }

    // =========================================================================
    // 5. ENVIAR EMAIL
    // =========================================================================
    logger.info('Enviando email', {
      to: mailConfig.to,
      subject: mailConfig.subject,
      from: mailConfig.from,
    });

    const info = await mailer.sendMail(mailConfig);

    // =========================================================================
    // 6. REGISTRAR ÉXITO
    // =========================================================================
    logger.info('Email enviado exitosamente', {
      messageId: info.messageId,
      to: mailConfig.to,
      subject: mailConfig.subject,
    });

    return {
      success: true,
      messageId: info.messageId,
      message: 'Email enviado exitosamente',
    };

  } catch (error) {
    // Si ya es ApiError, propagarlo
    if (error instanceof ApiError) {
      throw error;
    }

    // Loggear error
    logger.error('Error al enviar email', {
      error: error.message,
      to: emailOptions.to,
      subject: emailOptions.subject,
    });

    throw ApiError.serviceUnavailable(
      'Error al enviar el email. Por favor intenta más tarde.',
      {
        code: 'EMAIL_SEND_ERROR',
        details: error.message,
      }
    );
  }
};

/**
 * -----------------------------------------------------------------------------
 * ENVIAR EMAIL DE REESTABLECIMIENTO DE CONTRASEÑA
 * -----------------------------------------------------------------------------
 * 
 * @param {Object} options - Opciones del email
 * @param {string} options.to - Email del destinatario
 * @param {string} options.userName - Nombre del usuario
 * @param {string} options.resetUrl - URL de reestablecimiento
 * 
 * @returns {Promise<Object>} Resultado del envío
 */
export const sendPasswordResetEmail = async ({ to, userName, resetUrl }) => {
  const emailTemplate = getPasswordResetTemplate({
    userName: userName || to.split('@')[0],
    resetUrl,
    email: to,
  });

  return await sendEmail({
    to,
    ...emailTemplate,
  });
};

/**
 * -----------------------------------------------------------------------------
 * ENVIAR EMAIL DE VERIFICACIÓN DE CUENTA
 * -----------------------------------------------------------------------------
 * 
 * @param {Object} options - Opciones del email
 * @param {string} options.to - Email del destinatario
 * @param {string} options.userName - Nombre del usuario
 * @param {string} options.verificationUrl - URL de verificación
 * 
 * @returns {Promise<Object>} Resultado del envío
 */
export const sendEmailVerification = async ({ to, userName, verificationUrl }) => {
  const emailTemplate = getEmailVerificationTemplate({
    userName: userName || to.split('@')[0],
    verificationUrl,
    email: to,
  });

  return await sendEmail({
    to,
    ...emailTemplate,
  });
};

/**
 * -----------------------------------------------------------------------------
 * ENVIAR EMAIL DE BIENVENIDA
 * -----------------------------------------------------------------------------
 * 
 * @param {Object} options - Opciones del email
 * @param {string} options.to - Email del destinatario
 * @param {string} options.userName - Nombre del usuario
 * @param {string} options.organizationName - Nombre de la organización
 * 
 * @returns {Promise<Object>} Resultado del envío
 */
export const sendWelcomeEmail = async ({ to, userName, organizationName }) => {
  const emailTemplate = getWelcomeTemplate({
    userName: userName || to.split('@')[0],
    organizationName,
    email: to,
  });

  return await sendEmail({
    to,
    ...emailTemplate,
  });
};

/**
 * -----------------------------------------------------------------------------
 * ENVIAR NOTIFICACIÓN DE PROYECTO
 * -----------------------------------------------------------------------------
 * 
 * @param {Object} options - Opciones del email
 * @param {string} options.to - Email del destinatario
 * @param {string} options.userName - Nombre del usuario
 * @param {string} options.projectName - Nombre del proyecto
 * @param {string} options.action - Acción realizada
 * 
 * @returns {Promise<Object>} Resultado del envío
 */
export const sendProjectNotification = async ({ to, userName, projectName, action }) => {
  const emailTemplate = getProjectNotificationTemplate({
    userName: userName || to.split('@')[0],
    projectName,
    action,
    email: to,
  });

  return await sendEmail({
    to,
    ...emailTemplate,
  });
};

/**
 * -----------------------------------------------------------------------------
 * ENVIAR EMAIL A MÚLTIPLES DESTINATARIOS
 * -----------------------------------------------------------------------------
 * 
 * @param {Object} options - Opciones del email
 * @param {Array<string>} options.to - Array de emails de destinatarios
 * @param {string} options.subject - Asunto del email
 * @param {string} options.html - Contenido HTML
 * @param {string} [options.text] - Contenido en texto plano
 * 
 * @returns {Promise<Object>} Resultado del envío
 */
export const sendBulkEmail = async ({ to, subject, html, text }) => {
  try {
    if (!Array.isArray(to) || to.length === 0) {
      throw ApiError.badRequest('Debe proporcionar al menos un destinatario');
    }

    // Limitar a 50 destinatarios por envío para evitar problemas de spam
    if (to.length > 50) {
      logger.warn('Enviando email a más de 50 destinatarios', {
        count: to.length,
        subject,
      });
    }

    const results = [];

    // Enviar a cada destinatario individualmente (mejor para tracking)
    for (const email of to) {
      try {
        const result = await sendEmail({
          to: email,
          subject,
          html,
          text,
        });
        results.push({ email, success: true, messageId: result.messageId });
      } catch (error) {
        results.push({ email, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    logger.info('Envío masivo completado', {
      total: to.length,
      success: successCount,
      failed: failCount,
      subject,
    });

    return {
      success: failCount === 0,
      total: to.length,
      successCount,
      failCount,
      results,
    };

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('Error en envío masivo de emails', {
      error: error.message,
    });

    throw ApiError.serviceUnavailable(
      'Error al enviar emails masivos',
      {
        code: 'BULK_EMAIL_ERROR',
        details: error.message,
      }
    );
  }
};

/**
 * -----------------------------------------------------------------------------
 * VERIFICAR CONEXIÓN CON EL SERVICIO DE EMAIL
 * -----------------------------------------------------------------------------
 * 
 * @returns {Promise<Object>} Estado de la conexión
 */
export const verifyEmailConnection = async () => {
  try {
    const mailer = await getTransporter();

    if (!mailer) {
      return {
        connected: false,
        message: 'Transporter no inicializado',
      };
    }

    await mailer.verify();

    return {
      connected: true,
      message: 'Conexión exitosa con el servidor SMTP',
      host: env.EMAIL_HOST,
      port: env.EMAIL_PORT,
    };
  } catch (error) {
    return {
      connected: false,
      message: error.message,
      host: env.EMAIL_HOST,
      port: env.EMAIL_PORT,
    };
  }
};

// =============================================================================
// INICIALIZACIÓN AUTOMÁTICA
// =============================================================================

/**
 * Inicializar el servicio de email al cargar el módulo
 * (Solo en producción, en desarrollo se inicializa bajo demanda)
 */
if (env.NODE_ENV === 'production') {
  initializeTransporter().catch((error) => {
    logger.error('Error al inicializar servicio de email en producción', {
      error: error.message,
    });
  });
}

// =============================================================================
// EXPORTACIÓN POR DEFECTO
// =============================================================================

/**
 * Objeto con todas las funciones del servicio
 * para facilitar la importación en controllers
 */
export default {
  // Funciones principales
  sendEmail,
  sendBulkEmail,
  verifyEmailConnection,
  initializeTransporter,
  getTransporter,

  // Funciones específicas con plantillas
  sendPasswordResetEmail,
  sendEmailVerification,
  sendWelcomeEmail,
  sendProjectNotification,

  // Plantillas (para uso personalizado)
  getPasswordResetTemplate,
  getEmailVerificationTemplate,
  getWelcomeTemplate,
  getProjectNotificationTemplate,
};