// firebase-config.js
// Configuración de Firebase para las páginas "legacy" (index, buscar, dashboards, perfil).
// La fuente principal vive en js/config/firebase-config.js (FIREBASE_CONFIG).
// Estas claves son PÚBLICAS (no secretas): la seguridad de los datos la dan firestore.rules.
(function() {
  // Si ya se definió FIREBASE_CONFIG global y es válida, úsala; si no, config real por defecto.
  var realConfig = {
    apiKey: "AIzaSyBNWgXKFrJIB85rRl4G0o-KuPIwJkd1MYo",
    authDomain: "chambaya-45541.firebaseapp.com",
    projectId: "chambaya-45541",
    storageBucket: "chambaya-45541.firebasestorage.app",
    messagingSenderId: "1049651276514",
    appId: "1:1049651276514:web:e2588e4b591e9bdf0d0cbb"
  };
  var firebaseConfig =
    (typeof FIREBASE_CONFIG !== 'undefined' && FIREBASE_CONFIG &&
      String(FIREBASE_CONFIG.apiKey || '').indexOf('YOUR_') !== 0)
      ? FIREBASE_CONFIG
      : realConfig;

  // Firestore (y seteo de opciones si no están ya hechas)
  try {
    if (!firebase.apps || !firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    if (firebase.apps.length && !window.ChambaDB) {
      var db = firebase.firestore();
      if (db.settings) db.settings({ ignoreUndefinedProperties: true });
      window.ChambaDB = db;
    }
  } catch (e) {
    console.error('TuOficioCol: no se pudo iniciar Firestore. Revisa la conexión y el SDK Firebase.', e);
  }

  // Auth + proveedor Google SOLO si el SDK de auth está cargado en esta página.
  try {
    if (typeof firebase.auth === 'function' && !window.ChambaAuth) {
      window.ChambaAuth = firebase.auth();
    }
    if (typeof firebase.auth === 'function' && !window.ChambaGoogleProvider) {
      window.ChambaGoogleProvider = new firebase.auth.GoogleAuthProvider();
      window.ChambaGoogleProvider.setCustomParameters({ prompt: 'select_account' });
    }
  } catch (e) {
    console.warn('TuOficioCol: Firebase Auth no disponible en esta página.', e);
  }

  // Storage SOLO si el SDK de storage está cargado en esta página.
  try {
    if (typeof firebase.storage === 'function' && !window.ChambaStorage) {
      window.ChambaStorage = firebase.storage();
    }
  } catch (e) {
    console.warn('TuOficioCol: Firebase Storage no disponible en esta página.');
  }

  console.log('🔥 Firebase initialized successfully for TuOficioCol.');
})();