/**
 * Claves públicas de Firebase (cliente).
 * NO pongas secretos de servidor aquí (no hay "token secreto" de Google Login
 * en el frontend). El login real lo hace Firebase Auth con Google.
 *
 * 1. Abre https://console.firebase.google.com
 * 2. Proyecto (o crea uno) → Configuración → Tus apps → Web
 * 3. Copia el objeto firebaseConfig y pégalo abajo.
 * 4. Authentication → Sign-in method → Google → Habilitar
 * 5. Firestore Database → Crear (modo producción) y publica firestore.rules
 * 6. Authentication → Settings → Authorized domains → localhost
 */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBNWgXKFrJIB85rRl4G0o-KuPIwJkd1MYo",
  authDomain: "chambaya-45541.firebaseapp.com",
  projectId: "chambaya-45541",
  storageBucket: "chambaya-45541.firebasestorage.app",
  messagingSenderId: "1049651276514",
  appId: "1:1049651276514:web:e2588e4b591e9bdf0d0cbb"
};

/** Opcional: Places / Maps JS. Si está vacío, el mapa usa OpenStreetMap (Leaflet). */
const GOOGLE_MAPS_API_KEY = '';

/**
 * Modo emulador local de Firebase.
 *
 * Se activa con ?emulator=1 en localhost (o con ?emulator=0 para volver al
 * proyecto real). Es útil para probar Firestore, Auth y Storage sin tocar
 * datos de producción. La preferencia queda guardada en localStorage.
 */
function usingFirebaseEmulator() {
  try {
    const host = window.location.hostname;
    if (!['localhost', '127.0.0.1'].includes(host)) return false;
    const flag = new URLSearchParams(window.location.search).get('emulator');
    if (flag === '1') localStorage.setItem('tuoficio_emulator', '1');
    if (flag === '0') localStorage.removeItem('tuoficio_emulator');
    return localStorage.getItem('tuoficio_emulator') === '1';
  } catch (e) {
    return false;
  }
}

function isFirebaseConfigured() {
  return Boolean(FIREBASE_CONFIG.apiKey) && !String(FIREBASE_CONFIG.apiKey).startsWith('YOUR_');
}

function initFirebase() {
  if (typeof firebase === 'undefined') {
    throw new Error('Firebase SDK no cargó. Revisa la conexión a internet.');
  }
  if (!firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
  }

  const emulator = usingFirebaseEmulator();
  const db = firebase.firestore();

  // `settings()` y `useEmulator()` solo se pueden aplicar antes de la primera
  // operación. `initFirebase()` se llama en probe() y otra vez en App.init(),
  // por eso la configuración se aplica una sola vez.
  if (!window.ChambaFirestoreConfigured) {
    db.settings({ ignoreUndefinedProperties: true });
    window.ChambaFirestoreConfigured = true;
  }

  if (typeof firebase.auth === 'function') {
    window.ChambaAuth = firebase.auth();
    window.ChambaGoogleProvider = new firebase.auth.GoogleAuthProvider();
    window.ChambaGoogleProvider.setCustomParameters({ prompt: 'select_account' });
    window.ChambaGoogleProvider.addScope('email');
    window.ChambaGoogleProvider.addScope('profile');
  }

  if (typeof firebase.storage === 'function') {
    window.ChambaStorage = firebase.storage();
  }

  if (emulator && !window.ChambaEmulatorConfigured) {
    // Puertos por defecto de Firebase Emulator Suite.
    db.useEmulator('127.0.0.1', 8080);
    if (window.ChambaAuth) window.ChambaAuth.useEmulator('http://127.0.0.1:9099');
    if (window.ChambaStorage) window.ChambaStorage.useEmulator('127.0.0.1', 9199);
    window.ChambaEmulatorConfigured = true;
  }

  window.ChambaDB = db;
  window.ChambaEmulator = emulator;

  return {
    db,
    auth: window.ChambaAuth || null,
    storage: window.ChambaStorage || null,
    googleProvider: window.ChambaGoogleProvider || null,
    configured: isFirebaseConfigured(),
    emulator,
    googleMapsKey: GOOGLE_MAPS_API_KEY,
  };
}
