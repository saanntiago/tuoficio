/**
 * Siembra Firestore y Firebase Auth con los datos de demostración.
 *
 * Uso real:
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\ruta\service-account.json"
 *   npm run seed
 *
 * Uso con emulador (sin credenciales):
 *   npm run emulators
 *   npm run seed:emulator
 *
 * El script es idempotente: puede ejecutarse varias veces sin duplicar
 * documentos. No guarda contraseñas ni hashes en Firestore: las cuentas se
 * crean en Firebase Auth y el perfil queda en la colección `usuarios`.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EMULATOR = process.argv.includes('--emulator');
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'chambaya-45541';
const DEMO_PASSWORD = 'demo1234';

const ADMINS = [
  { id: 'admin1', uid: 'admin1', email: 'admin1@chambaya.com', password: 'AdminChamba1!', nombre: 'Admin Central' },
  { id: 'admin2', uid: 'admin2', email: 'admin2@chambaya.com', password: 'AdminChamba2!', nombre: 'Admin Operaciones' },
  { id: 'admin3', uid: 'admin3', email: 'admin3@chambaya.com', password: 'AdminChamba3!', nombre: 'Admin Soporte' },
];

if (EMULATOR) {
  process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099';
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ||= '127.0.0.1:9199';
} else {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!credentialsPath) {
    console.error('\nFalta la cuenta de servicio de Firebase.\n');
    console.error('Descarga una clave JSON desde Firebase Console → Configuración del proyecto → Cuentas de servicio');
    console.error('y ejecuta:\n');
    console.error('  $env:GOOGLE_APPLICATION_CREDENTIALS="C:\\ruta\\service-account.json"');
    console.error('  npm run seed\n');
    console.error('También puedes probar todo localmente con el emulador: npm run emulators + npm run seed:emulator\n');
    process.exit(1);
  }
}

const { initializeApp, cert } = await import('firebase-admin/app');
const { getFirestore } = await import('firebase-admin/firestore');
const { getAuth } = await import('firebase-admin/auth');

let app;
if (EMULATOR) {
  app = initializeApp({ projectId: PROJECT_ID });
  console.log(`Conectado al emulador de Firebase (${PROJECT_ID}).`);
} else {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT;
  const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  app = initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id || PROJECT_ID,
  });
  console.log(`Conectado al proyecto Firebase ${serviceAccount.project_id || PROJECT_ID}.`);
}

const db = getFirestore(app);
const auth = getAuth(app);
db.settings({ ignoreUndefinedProperties: true });

/* ── Datos de demostración ─────────────────────────────────────────── */

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function placeholderImage(label, color = '#4E7A5C') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${color}" stop-opacity=".95"/>
      <stop offset="1" stop-color="#21201C" stop-opacity=".85"/>
    </linearGradient></defs>
    <rect width="640" height="420" fill="url(#g)"/>
    <text x="50%" y="50%" fill="#F7F6F2" font-family="sans-serif" font-size="34"
      font-weight="700" text-anchor="middle" dominant-baseline="middle">${escapeXml(label)}</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function loadSeed() {
  const code = fs.readFileSync(path.join(ROOT, 'js', 'data', 'seed.js'), 'utf8');
  const context = {
    console,
    placeholderImage,
    demoHash: () => 'firebase-auth-no-guarda-hash',
  };
  vm.createContext(context);
  vm.runInContext(`${code}\n;globalThis.__seed = TuOficioSeed;`, context, { filename: 'seed.js' });
  return context.__seed;
}

globalThis.placeholderImage = placeholderImage;

const seed = loadSeed();
const collections = {
  usuarios: seed.usuarios || [],
  trabajadores: seed.trabajadores || [],
  resenas: seed.resenas || [],
  cotizaciones: seed.cotizaciones || [],
  postulaciones: seed.postulaciones || [],
  trabajos: seed.trabajos || [],
  verificaciones: seed.verificaciones || [],
  reportes: seed.reportes || [],
  notificaciones: seed.notificaciones || [],
  favoritos: seed.favoritos || [],
  conversaciones: seed.conversaciones || [],
  mensajes: seed.mensajes || [],
  hojasDeVida: seed.hojasDeVida || [],
  sugerencias: seed.sugerencias || [],
};

/* ── Firebase Auth ─────────────────────────────────────────────────── */

async function ensureAuthUser({ uid, email, password, displayName, disabled = false }) {
  try {
    const existing = await auth.getUser(uid);
    await auth.updateUser(uid, {
      email,
      password,
      displayName,
      emailVerified: true,
      disabled,
    });
    return existing.uid;
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
  }

  try {
    const existingByEmail = await auth.getUserByEmail(email);
    if (existingByEmail.uid !== uid) {
      console.warn(`  ! ${email} ya existe con UID ${existingByEmail.uid}; no se crea ${uid}.`);
      return null;
    }
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
  }

  await auth.createUser({
    uid,
    email,
    password,
    displayName,
    emailVerified: true,
    disabled,
  });
  return uid;
}

const authUsers = [];
for (const user of collections.usuarios) {
  if (!user.email || !user.uid) continue;
  authUsers.push({
    uid: user.uid,
    email: user.email,
    password: DEMO_PASSWORD,
    displayName: user.nombre || user.email,
    disabled: user.activo === false,
  });
}
for (const admin of ADMINS) {
  authUsers.push({
    uid: admin.uid,
    email: admin.email,
    password: admin.password,
    displayName: admin.nombre,
    disabled: false,
  });
}

console.log(`\nCuentas de Firebase Auth: ${authUsers.length}`);
for (const user of authUsers) {
  const uid = await ensureAuthUser(user);
  if (uid) console.log(`  ✓ ${user.email} (${uid})`);
  else console.log(`  – ${user.email} omitida por conflicto de correo`);
}

/* ── Firestore ─────────────────────────────────────────────────────── */

function cleanDocument(item) {
  const data = JSON.parse(JSON.stringify(item));
  delete data.passHash;
  delete data.id;
  if (!data.uid && item.uid) data.uid = item.uid;
  return data;
}

console.log('\nColecciones de Firestore:');
for (const [name, items] of Object.entries(collections)) {
  if (!items.length) {
    console.log(`  ${name}: vacía`);
    continue;
  }

  let written = 0;
  const batch = db.batch();
  for (const item of items) {
    const id = item.id || item.uid;
    if (!id) continue;
    const data = cleanDocument(item);
    if (!data.uid && (name === 'usuarios' || name === 'trabajadores' || name === 'favoritos')) {
      data.uid = id;
    }
    batch.set(db.collection(name).doc(id), data, { merge: true });
    written += 1;
  }
  await batch.commit();
  console.log(`  ${name}: ${written} documento(s)`);
}

// Administradores: siempre con un documento de perfil en `usuarios`.
const adminBatch = db.batch();
for (const admin of ADMINS) {
  adminBatch.set(db.collection('usuarios').doc(admin.uid), {
    uid: admin.uid,
    nombre: admin.nombre,
    email: admin.email,
    rol: 'admin',
    activo: true,
    verificado: true,
    avatarColor: '#3A3A38',
    fechaRegistro: new Date().toISOString(),
    demo: false,
  }, { merge: true });
}
await adminBatch.commit();
console.log(`  usuarios (administradores): ${ADMINS.length} documento(s)`);

console.log('\nListo. Credenciales de demostración:');
console.log('  Cliente:          ana@demo.tuoficio.co / demo1234');
console.log('  Trabajador:       carlos@demo.tuoficio.co / demo1234');
console.log('  Administrador:    admin1@chambaya.com / AdminChamba1!');
if (EMULATOR) {
  console.log('\nAbre la app con ?emulator=1 en localhost para usar estos datos.');
  console.log('Ejemplo: http://127.0.0.1:8123/app.html?emulator=1');
}
console.log('');
process.exit(0);
