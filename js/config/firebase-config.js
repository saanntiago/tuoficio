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
  const db = firebase.firestore();
  db.settings({ ignoreUndefinedProperties: true });
  window.ChambaDB = db;
  window.ChambaAuth = firebase.auth();
  window.ChambaGoogleProvider = new firebase.auth.GoogleAuthProvider();
  window.ChambaGoogleProvider.setCustomParameters({ prompt: 'select_account' });
  window.ChambaGoogleProvider.addScope('email');
  window.ChambaGoogleProvider.addScope('profile');
  return {
    db,
    auth: window.ChambaAuth,
    googleProvider: window.ChambaGoogleProvider,
    configured: isFirebaseConfigured(),
    googleMapsKey: GOOGLE_MAPS_API_KEY,
  };
}
