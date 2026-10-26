/**
 * Autenticación.
 *
 * Modo firebase: Firebase Auth (correo/contraseña y Google) + perfil en Firestore.
 * Modo local:    sesión simulada en localStorage para poder demostrar la
 *                plataforma sin depender de la configuración de Firebase.
 */
class AuthService {
  constructor(db) {
    this._db = db;
    this.currentUser = null;
    this.mode = db.isLocal ? 'local' : 'firebase';
    this._sessionKey = 'tuoficio_session_uid';
    this._localListeners = new Set();
  }

  _emitLocal() {
    this._localListeners.forEach(cb => {
      try { cb(this.currentUser); } catch (e) { console.warn(e); }
    });
  }

  /* ── Infraestructura ─────────────────────────────────────── */

  get _auth() {
    if (!window.ChambaAuth) throw new Error('Firebase Auth no está inicializado.');
    return window.ChambaAuth;
  }

  _mapError(err) {
    const map = {
      'auth/invalid-api-key': 'Firebase no está configurado. Pega tu firebaseConfig en js/config/firebase-config.js',
      'auth/configuration-not-found': 'Firebase Authentication no está habilitado en el proyecto. En Firebase Console → Authentication → Comenzar, habilita Correo/contraseña y Google.',
      'auth/unauthorized-domain': 'Agrega este dominio en Firebase → Authentication → Authorized domains.',
      'auth/popup-closed-by-user': 'Cerraste la ventana de Google. Intenta de nuevo.',
      'auth/cancelled-popup-request': 'Se canceló el inicio de sesión.',
      'auth/popup-blocked': 'El navegador bloqueó la ventana de Google. Permite popups.',
      'auth/operation-not-allowed': 'Habilita Google (y/o Correo) en Firebase Authentication → Sign-in method.',
      'auth/invalid-email': 'El correo no es válido.',
      'auth/user-not-found': 'No existe una cuenta con ese correo.',
      'auth/wrong-password': 'Contraseña incorrecta.',
      'auth/invalid-credential': 'Correo o contraseña incorrectos.',
      'auth/email-already-in-use': 'Ese correo ya está registrado.',
      'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
      'auth/network-request-failed': 'Sin conexión. Revisa tu internet.',
    };
    return map[err.code] || err.message || 'Error de autenticación';
  }

  _avatarColor(uid) {
    const colors = ['#3A3A38', '#6F6F6B', '#8C8C88', '#6B5E45', '#6B736C', '#5A5A56'];
    let h = 0;
    for (let i = 0; i < (uid || '').length; i++) h = (h + uid.charCodeAt(i)) % colors.length;
    return colors[h];
  }

  _initials(name) {
    return initialsOf(name);
  }

  /* ── Perfil ──────────────────────────────────────────────── */

  _baseProfile(id, data = {}) {
    const nombre = data.nombre || data.name || 'Usuario';
    return {
      id,
      uid: id,
      nombre,
      name: nombre,
      email: data.email || '',
      telefono: data.telefono || '',
      whatsapp: data.whatsapp || data.telefono || '',
      documento: data.documento || '',
      role: data.rol || 'cliente',
      rol: data.rol || 'cliente',
      zone: data.zona || '',
      zona: data.zona || '',
      oficio: data.oficio || '',
      avatarUrl: data.foto || data.avatarUrl || '',
      avatarColor: data.avatarColor || this._avatarColor(id),
      initials: this._initials(nombre),
      verificado: Boolean(data.verificado),
      activo: data.activo !== false,
      sancion: data.sancion || null,
      googleAuth: Boolean(data.googleAuth),
      needsRole: !data.rol,
      demo: Boolean(data.demo),
      fechaRegistro: data.fechaRegistro || null,
    };
  }

  /* ── Modo local ──────────────────────────────────────────── */

  _localSession() {
    try {
      return localStorage.getItem(this._sessionKey) || '';
    } catch (e) {
      return '';
    }
  }

  _setLocalSession(uid) {
    try {
      if (uid) localStorage.setItem(this._sessionKey, uid);
      else localStorage.removeItem(this._sessionKey);
    } catch (e) { /* ignorar */ }
  }

  _findLocalUserByEmail(email) {
    const target = String(email || '').trim().toLowerCase();
    return this._db.local.getAllSync(CHAMBAYA.COLLECTIONS.USERS)
      .find(u => String(u.email || '').toLowerCase() === target) || null;
  }

  async _localProfile(id) {
    const doc = await this._db.get(CHAMBAYA.COLLECTIONS.USERS, id);
    if (!doc) return null;
    const profile = this._baseProfile(id, doc);
    profile.verified = Boolean(doc.verificado || doc.googleAuth);
    return profile;
  }

  _assertLocalAccess(user) {
    if (!user) throw new Error('Correo o contraseña incorrectos.');
    if (user.activo === false) throw new Error('Tu cuenta está desactivada. Contacta al administrador.');
    if (isUserBanned(user)) {
      const hasta = user.sancion?.hasta ? ` hasta ${formatDate(user.sancion.hasta)}` : '';
      throw new Error(`Tu cuenta está suspendida${hasta} por un reporte.`);
    }
  }

  async _localLogin(email, password) {
    const admin = adminByEmail(email);
    if (admin) {
      if (password !== admin.password) throw new Error('Contraseña incorrecta.');
      let doc = this._findLocalUserByEmail(admin.email);
      if (!doc) {
        const id = 'admin-local';
        await this._db.set(CHAMBAYA.COLLECTIONS.USERS, id, {
          uid: id, nombre: admin.name, email: admin.email, rol: 'admin', activo: true,
          verificado: true, avatarColor: this._avatarColor(id), demo: true,
          fechaRegistro: new Date().toISOString(),
        });
        doc = await this._db.get(CHAMBAYA.COLLECTIONS.USERS, id);
      }
      this._setLocalSession(doc.id);
      this.currentUser = await this._localProfile(doc.id);
      this._emitLocal();
      return this.currentUser;
    }
    const doc = this._findLocalUserByEmail(email);
    this._assertLocalAccess(doc);
    if (demoHash(password) !== doc.passHash) throw new Error('Correo o contraseña incorrectos.');
    this._setLocalSession(doc.id);
    this.currentUser = await this._localProfile(doc.id);
    this._emitLocal();
    return this.currentUser;
  }

  async _localRegister({ name, email, password, zone, trade, role, phone = '', documentId = '', experience = 0 }) {
    if (this._findLocalUserByEmail(email)) throw new Error('Ese correo ya está registrado.');
    if (String(password || '').length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
    const id = `u-${Date.now().toString(36)}`;
    await this._db.set(CHAMBAYA.COLLECTIONS.USERS, id, {
      uid: id, nombre: name, email, telefono: phone, whatsapp: phone, documento: documentId,
      rol: role || 'cliente', zona: zone || '', oficio: trade || '',
      avatarColor: this._avatarColor(id), verificado: Boolean(adminByEmail(email)),
      activo: true, passHash: demoHash(password), demo: true,
      fechaRegistro: new Date().toISOString(),
      preferencias: { contactoVisible: true, notificaciones: true },
    });
    if (role === 'trabajador') await this._ensureWorkerDoc(id, { name, trade, zone, experience, phone });
    this._setLocalSession(id);
    this.currentUser = await this._localProfile(id);
    this._emitLocal();
    return this.currentUser;
  }

  _ensureWorkerDocLocal(uid, extras = {}) { return this._ensureWorkerDoc(uid, extras); }

  /* ── API pública ─────────────────────────────────────────── */

  onAuthChange(callback) {
    if (this.mode === 'local') {
      this._localListeners.add(callback);
      const uid = this._localSession();
      if (!uid) {
        this.currentUser = null;
        callback(null);
      } else {
        this._localProfile(uid).then(user => {
          this.currentUser = user;
          callback(user);
        }).catch(err => {
          console.warn(err);
          callback(null);
        });
      }
      return () => this._localListeners.delete(callback);
    }
    return this._auth.onAuthStateChanged(async (fbUser) => {
      if (!fbUser) {
        this.currentUser = null;
        callback(null);
        return;
      }
      try {
        this.currentUser = await this._profileFromAuth(fbUser);
        callback(this.currentUser);
      } catch (e) {
        console.error(e);
        callback(null);
      }
    });
  }

  async loginWithEmail(email, password) {
    if (this.mode === 'local') return this._localLogin(email, password);
    const admin = adminByEmail(email);
    if (admin && password !== admin.password) throw new Error('Contraseña incorrecta.');
    try {
      const cred = await this._auth.signInWithEmailAndPassword(email, password);
      this.currentUser = await this._profileFromAuth(cred.user);
      return this.currentUser;
    } catch (e) {
      const canCreateAdmin = admin && ['auth/user-not-found', 'auth/invalid-credential', 'auth/invalid-login-credentials'].includes(e.code);
      if (canCreateAdmin) {
        const cred = await this._auth.createUserWithEmailAndPassword(admin.email, admin.password);
        await cred.user.updateProfile({ displayName: admin.name });
        await this._ensureUserDoc(cred.user, { name: admin.name, role: 'admin', activo: true });
        this.currentUser = await this._profileFromAuth(cred.user);
        return this.currentUser;
      }
      throw new Error(this._mapError(e));
    }
  }

  async register({ name, email, password, zone, trade, role, phone = '', document: documentId = '', experience = 0 }) {
    if (this.mode === 'local') return this._localRegister({ name, email, password, zone, trade, role, phone, documentId, experience });
    try {
      const admin = adminByEmail(email);
      if (admin && password !== admin.password) throw new Error('Usa la clave de administrador asignada.');
      const finalRole = admin ? 'admin' : role;
      const cred = await this._auth.createUserWithEmailAndPassword(email, password);
      await cred.user.updateProfile({ displayName: admin ? admin.name : name });
      if (!admin) await cred.user.sendEmailVerification();
      await this._ensureUserDoc(cred.user, {
        name: admin ? admin.name : name,
        role: finalRole,
        zone: admin ? '' : zone,
        trade: admin ? '' : trade,
        phone: admin ? '' : phone,
        document: admin ? '' : documentId,
        experience: admin ? 0 : Number(experience) || 0,
        activo: true,
      });
      this.currentUser = await this._profileFromAuth(cred.user);
      return this.currentUser;
    } catch (e) {
      throw new Error(this._mapError(e));
    }
  }

  async loginWithGoogle(roleHint) {
    if (this.mode === 'local') {
      // Simula el retorno de Google con una cuenta de demostración.
      const id = 'google-demo';
      let doc = await this._db.get(CHAMBAYA.COLLECTIONS.USERS, id);
      if (!doc) {
        await this._db.set(CHAMBAYA.COLLECTIONS.USERS, id, {
          uid: id, nombre: 'Sofía Google', email: 'sofia.google@demo.tuoficio.co',
          rol: roleHint || 'cliente', zona: 'Chapinero', oficio: roleHint === 'trabajador' ? 'Electricidad' : '',
          googleAuth: true, verificado: true, activo: true, demo: true, avatarColor: this._avatarColor(id),
          fechaRegistro: new Date().toISOString(),
        });
        if ((roleHint || 'cliente') === 'trabajador') await this._ensureWorkerDoc(id, { trade: 'Electricidad', zone: 'Chapinero' });
        doc = await this._db.get(CHAMBAYA.COLLECTIONS.USERS, id);
      }
      this._setLocalSession(doc.id);
      this.currentUser = await this._localProfile(doc.id);
      this._emitLocal();
      return { isNew: true, user: this.currentUser };
    }
    try {
      const provider = window.ChambaGoogleProvider;
      if (roleHint) sessionStorage.setItem('chambaya_role_hint', roleHint);
      const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') ||
        (window.matchMedia && window.matchMedia('(max-width: 700px)').matches);
      let result = null;
      try {
        if (isMobile) throw new Error('__mobile_redirect__');
        result = await this._auth.signInWithPopup(provider);
      } catch (popErr) {
        const forcedRedirect = popErr && popErr.message === '__mobile_redirect__';
        if (!forcedRedirect && popErr.code !== 'auth/popup-blocked') throw popErr;
        await this._auth.signInWithRedirect(provider);
        return { isNew: false, user: this.currentUser, redirected: true };
      }
      const isNew = result.additionalUserInfo?.isNewUser;
      const existing = await this._db.get(this._db.COLLECTIONS.USERS, result.user.uid);
      const admin = adminByEmail(result.user.email);
      if (!existing && roleHint && !admin) {
        await this._ensureUserDoc(result.user, { role: roleHint });
      }
      this.currentUser = await this._profileFromAuth(result.user);
      return { isNew: Boolean(isNew || !existing), user: this.currentUser };
    } catch (e) {
      throw new Error(this._mapError(e));
    }
  }

  async handleRedirectResult() {
    if (this.mode === 'local' || !this._auth.getRedirectResult) return null;
    let result;
    try {
      result = await this._auth.getRedirectResult();
    } catch (e) {
      console.warn('TuOficio: no hubo resultado de redirect Google.', e.message);
      return null;
    }
    if (!result || !result.user) return null;
    const isNew = Boolean(result.additionalUserInfo?.isNewUser);
    const hint = sessionStorage.getItem('chambaya_role_hint') || '';
    sessionStorage.removeItem('chambaya_role_hint');
    const existing = await this._db.get(this._db.COLLECTIONS.USERS, result.user.uid);
    const admin = adminByEmail(result.user.email);
    if (!existing && hint && !admin) await this._ensureUserDoc(result.user, { role: hint });
    this.currentUser = await this._profileFromAuth(result.user);
    return { isNew: Boolean(isNew || !existing), user: this.currentUser };
  }

  async completeRole(role, extras = {}) {
    if (this.mode === 'local') {
      const uid = this._localSession();
      if (!uid) throw new Error('No hay sesión.');
      await this._db.update(CHAMBAYA.COLLECTIONS.USERS, uid, {
        rol: role, zona: extras.zone || '', oficio: extras.trade || '',
      });
      if (role === 'trabajador') await this._ensureWorkerDoc(uid, extras);
      this.currentUser = await this._localProfile(uid);
      this._emitLocal();
      return this.currentUser;
    }
    const user = this._auth.currentUser;
    if (!user) throw new Error('No hay sesión.');
    const existing = await this._db.get(this._db.COLLECTIONS.USERS, user.uid);
    if (!existing) {
      await this._ensureUserDoc(user, { role, zone: extras.zone, trade: extras.trade });
    } else {
      await this._db.update(this._db.COLLECTIONS.USERS, user.uid, {
        rol: role, zona: extras.zone || '', oficio: extras.trade || '',
      });
      if (role === 'trabajador') await this._ensureWorkerDoc(user.uid, extras);
    }
    this.currentUser = await this._profileFromAuth(user);
    return this.currentUser;
  }

  async sendPasswordReset(email) {
    if (this.mode === 'local') {
      const user = this._findLocalUserByEmail(email);
      if (!user) throw new Error('No existe una cuenta con ese correo.');
      return true;
    }
    try {
      await this._auth.sendPasswordResetEmail(email);
      return true;
    } catch (e) {
      throw new Error(this._mapError(e));
    }
  }

  async resendVerificationEmail() {
    if (this.mode === 'local') return true;
    if (this._auth.currentUser) await this._auth.currentUser.sendEmailVerification();
    return true;
  }

  async checkEmailVerified() {
    if (this.mode === 'local') return true;
    if (!this._auth.currentUser) return false;
    await this._auth.currentUser.reload();
    return this._auth.currentUser.emailVerified;
  }

  async logout() {
    if (this.mode === 'local') {
      this._setLocalSession('');
      this.currentUser = null;
      this._emitLocal();
      return;
    }
    await this._auth.signOut();
    this.currentUser = null;
  }

  /* ── Documentos de perfil (modo Firebase) ────────────────── */

  async _promoteAdmin(fbUser) {
    const admin = adminByEmail(fbUser.email);
    if (!admin) return null;
    await this._db.set(this._db.COLLECTIONS.USERS, fbUser.uid, {
      uid: fbUser.uid, nombre: admin.name, email: fbUser.email, rol: 'admin',
      activo: true, verificado: true, avatarColor: this._avatarColor(fbUser.uid),
    });
    return admin;
  }

  async _profileFromAuth(fbUser) {
    const admin = await this._promoteAdmin(fbUser);
    const doc = await this._db.get(this._db.COLLECTIONS.USERS, fbUser.uid);
    const merged = {
      ...(doc || {}),
      nombre: admin ? admin.name : (doc?.nombre || fbUser.displayName || 'Usuario'),
      rol: admin ? 'admin' : (doc?.rol || 'cliente'),
      email: fbUser.email,
      foto: doc?.foto || fbUser.photoURL || '',
      googleAuth: fbUser.providerData.some(p => p.providerId === 'google.com'),
    };
    const profile = this._baseProfile(fbUser.uid, merged);
    profile.needsRole = !admin && !doc;
    profile.verified = Boolean(admin || doc?.verificado);
    return profile;
  }

  async _ensureUserDoc(fbUser, extras = {}) {
    const existing = await this._db.get(this._db.COLLECTIONS.USERS, fbUser.uid);
    if (existing) return existing;
    const role = extras.role || 'cliente';
    const name = extras.name || fbUser.displayName || 'Usuario TuOficioCol';
    const payload = {
      uid: fbUser.uid,
      nombre: name,
      email: fbUser.email,
      foto: fbUser.photoURL || '',
      rol: role,
      zona: extras.zone || '',
      oficio: extras.trade || '',
      telefono: extras.phone || '',
      whatsapp: extras.phone || '',
      documento: extras.document || '',
      // La verificación de identidad (documento + selfie) es independiente de
      // que Google haya validado el correo. Se activa solo cuando un admin aprueba.
      verificado: false,
      googleAuth: fbUser.providerData.some(p => p.providerId === 'google.com'),
      activo: extras.activo !== false,
      avatarColor: this._avatarColor(fbUser.uid),
      preferencias: { contactoVisible: true, notificaciones: true },
      fechaRegistro: firebase.firestore.FieldValue.serverTimestamp(),
    };
    await this._db.set(this._db.COLLECTIONS.USERS, fbUser.uid, payload);
    if (role === 'trabajador') await this._ensureWorkerDoc(fbUser.uid, extras);
    return payload;
  }

  async _ensureWorkerDoc(uid, extras = {}) {
    const existing = await this._db.get(this._db.COLLECTIONS.WORKERS, uid);
    if (existing) return existing;
    const userDoc = await this._db.get(this._db.COLLECTIONS.USERS, uid);
    const zone = extras.zone || '';
    const z = zoneByName(zone);
    await this._db.set(this._db.COLLECTIONS.WORKERS, uid, {
      uid,
      nombre: extras.name || userDoc?.nombre || '',
      oficio: extras.trade || '',
      experiencia: Number(extras.experience) || 0,
      descripcion: '',
      tipoHojaVida: extras.cvType || '',
      disponibilidad: 'Disponible',
      horario: { dias: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'], inicio: '08:00', fin: '18:00' },
      tarifas: { visitaDiagnostica: 0, horaBase: 0, nota: '' },
      calificacionPromedio: 0,
      totalResenas: 0,
      zona: zone,
      zonasCobertura: zone ? [zone] : [],
      ubicacion: z ? { lat: z.lat, lng: z.lng } : null,
      telefono: extras.phone || '',
      whatsapp: extras.phone || '',
      contactoVisible: true,
      portafolio: [],
      habilidades: [],
      badgeVerified: false,
      verificacionEstado: CHAMBAYA.VERIFICATION_STATUS.NONE,
      vistas: 0,
      activo: extras.activo !== false,
    });
  }
}
