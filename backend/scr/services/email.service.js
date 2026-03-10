import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const transporter = nodemailer.createTransport({
  host: env.EMAIL_HOST,
  port: env.EMAIL_PORT,
  secure: env.EMAIL_PORT === 465,
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASSWORD,
  },
});

export const sendEmail = async ({ to, subject, html }) => {
  await transporter.sendMail({ from: env.EMAIL_FROM, to, subject, html });
};

export const sendPasswordResetEmail = async (email, resetUrl) => {
  await sendEmail({
    to: email,
    subject: 'Restablecer contraseña — OSFLSystem',
    html: `
      <h2>Restablecer contraseña</h2>
      <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>Este enlace expira en 1 hora.</p>
    `,
  });
};

export const sendWelcomeEmail = async (email, nombre) => {
  await sendEmail({
    to: email,
    subject: 'Bienvenido a OSFLSystem',
    html: `<h2>Bienvenido, ${nombre}!</h2><p>Tu cuenta ha sido creada exitosamente.</p>`,
  });
};
