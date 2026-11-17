/**
 * HU-21: recuperación de contraseña con un código OTP de 6 dígitos.
 *
 * Flujo:
 *  1. `requestPasswordOtp` genera un código, lo guarda hasheado en Firestore
 *     (`otp_resets`) y lo envía al correo registrado con SMTP/nodemailer.
 *  2. `resetPasswordWithOtp` valida el código, su vigencia (15 minutos) y el
 *     número de intentos, y actualiza la contraseña en Firebase Auth.
 *
 * Variables de entorno requeridas en producción:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, OTP_SECRET
 *
 * En el emulador (o con OTP_DEV_MODE=true) las funciones devuelven `devCode`
 * para poder demostrar el flujo sin un servidor de correo real.
 */
const crypto = require('crypto');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');

admin.initializeApp();

const REGION = 'us-central1';
const COLLECTION = 'otp_resets';
const OTP_TTL_MS = 15 * 60 * 1000;
const COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const CODE_LENGTH = 6;

const db = admin.firestore();

/* ── Utilidades ─────────────────────────────────────────────── */

function normalizeEmail(data = {}) {
  const email = String(data.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError('invalid-argument', 'Ingresa un correo electrónico válido.');
  }
  return email;
}

function emailKey(email) {
  return crypto.createHash('sha256').update(email).digest('hex');
}

function hashCode(email, code) {
  const secret = process.env.OTP_SECRET || 'tuoficio-otp-local';
  return crypto.createHmac('sha256', secret).update(`${email}:${code}`).digest('hex');
}

function safeEqual(a = '', b = '') {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function smtpConfigured() {
  return ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM']
    .every(name => Boolean(String(process.env[name] || '').trim()));
}

function devMode() {
  return process.env.FUNCTIONS_EMULATOR === 'true' || process.env.OTP_DEV_MODE === 'true';
}

function mailTransport() {
  const port = Number(process.env.SMTP_PORT) || 587;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendOtpEmail(email, code) {
  const minutes = Math.round(OTP_TTL_MS / 60000);
  await mailTransport().sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Código de recuperación de TuOficioCol',
    text: `Tu código de recuperación es ${code}. Vence en ${minutes} minutos. Si no solicitaste el cambio, ignora este mensaje.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#25241f">
      <h2 style="color:#4E7A5C">Recupera tu contraseña</h2>
      <p>Usa este código de 6 dígitos para restablecer tu contraseña en TuOficioCol:</p>
      <p style="font-size:34px;font-weight:800;letter-spacing:8px;background:#f1f3ec;border-radius:10px;padding:16px 20px;text-align:center">${escapeHtml(code)}</p>
      <p>El código vence en <strong>${minutes} minutos</strong>. Si no solicitaste el cambio, ignora este mensaje.</p>
      <p style="color:#7b7a72;font-size:12px">TuOficioCol · Red de oficios de Bogotá</p>
    </div>`,
  });
}

/* ── Solicitar código ──────────────────────────────────────── */

exports.requestPasswordOtp = onCall({ region: REGION, cors: true }, async request => {
  const email = normalizeEmail(request.data || {});

  try {
    await admin.auth().getUserByEmail(email);
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      throw new HttpsError('not-found', 'No existe una cuenta con ese correo.');
    }
    logger.error('No se pudo consultar el usuario para OTP', e);
    throw new HttpsError('internal', 'No se pudo procesar la solicitud.');
  }

  const ref = db.collection(COLLECTION).doc(emailKey(email));
  const previous = await ref.get();
  if (previous.exists) {
    const createdAt = Number(previous.get('creadoEn')) || 0;
    if (createdAt && Date.now() - createdAt < COOLDOWN_MS) {
      throw new HttpsError('resource-exhausted', 'Espera un minuto antes de solicitar otro código.');
    }
  }

  const code = String(crypto.randomInt(10 ** (CODE_LENGTH - 1), 10 ** CODE_LENGTH));
  const now = Date.now();
  await ref.set({
    email,
    codeHash: hashCode(email, code),
    creadoEn: now,
    expiraEn: now + OTP_TTL_MS,
    intentos: 0,
  });

  if (!smtpConfigured()) {
    if (devMode()) {
      logger.info(`OTP de desarrollo para ${email}: ${code}`);
      return { ok: true, devCode: code, expiresInMinutes: OTP_TTL_MS / 60000 };
    }
    await ref.delete();
    logger.error('SMTP no está configurado; no se puede enviar el OTP.');
    throw new HttpsError('failed-precondition', 'El envío de correos no está configurado. Contacta al administrador.');
  }

  try {
    await sendOtpEmail(email, code);
  } catch (e) {
    logger.error('No se pudo enviar el correo con el OTP', e);
    await ref.delete();
    throw new HttpsError('unavailable', 'No se pudo enviar el correo. Intenta de nuevo más tarde.');
  }

  return { ok: true, expiresInMinutes: OTP_TTL_MS / 60000 };
});

/* ── Verificar código y cambiar contraseña ─────────────────── */

exports.resetPasswordWithOtp = onCall({ region: REGION, cors: true }, async request => {
  const email = normalizeEmail(request.data || {});
  const code = String(request.data?.code || '').trim();
  const newPassword = String(request.data?.newPassword || '');

  if (!new RegExp(`^\\d{${CODE_LENGTH}}$`).test(code)) {
    throw new HttpsError('invalid-argument', 'El código debe tener 6 dígitos.');
  }
  if (newPassword.length < 6) {
    throw new HttpsError('invalid-argument', 'La nueva contraseña debe tener al menos 6 caracteres.');
  }

  const ref = db.collection(COLLECTION).doc(emailKey(email));
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError('failed-precondition', 'Solicita un código nuevo para continuar.');
  }

  const data = snap.data();
  const expiresAt = Number(data.expiraEn) || 0;
  if (!expiresAt || expiresAt < Date.now()) {
    await ref.delete();
    throw new HttpsError('deadline-exceeded', 'El código venció. Solicita uno nuevo.');
  }

  const attempts = Number(data.intentos) || 0;
  if (attempts >= MAX_ATTEMPTS) {
    await ref.delete();
    throw new HttpsError('resource-exhausted', 'Demasiados intentos. Solicita un código nuevo.');
  }

  if (!safeEqual(data.codeHash, hashCode(email, code))) {
    await ref.update({ intentos: attempts + 1 });
    throw new HttpsError('invalid-argument', 'El código no es correcto.');
  }

  let userRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(email);
  } catch (e) {
    await ref.delete();
    if (e.code === 'auth/user-not-found') {
      throw new HttpsError('not-found', 'No existe una cuenta con ese correo.');
    }
    throw new HttpsError('internal', 'No se pudo actualizar la contraseña.');
  }

  await admin.auth().updateUser(userRecord.uid, { password: newPassword });
  await ref.delete();
  logger.info(`Contraseña restablecida con OTP para ${email}`);
  return { ok: true };
});
