class AuthService {
  constructor(db) {
    this._db = db;
    this.currentUser = null;
  }

  get _auth() {
    if (!window.ChambaAuth) throw new Error('Firebase Auth no está inicializado.');
    return window.ChambaAuth;
  }

  _mapError(err) {
    const map = {
      'auth/invalid-api-key': 'Firebase no está configurado. Pega tu firebaseConfig en js/config/firebase-config.js',
      'auth/unauthorized-domain': 'Agrega este dominio en Firebase → Authentication → Authorized domains (localhost).',
      'auth/popup-closed-by-user': 'Cerraste la ventana de Google. Intenta de nuevo.',
      'auth/cancelled-popup-request': 'Se canceló el inicio de sesión.',
      'auth/popup-blocked': 'El navegador bloqueó la ventana de Google. Permite popups.',
      'auth/operation-not-allowed': 'Habilita Google (y/o Email) en Firebase Authentication → Sign-in method.',
      'auth/invalid-email': 'El correo no es válido.',
      'auth/user-not-found': 'No existe una cuenta con ese correo.',
      'auth/wrong-password': 'Contraseña incorrecta.',
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

  async _promoteAdmin(fbUser) {
    const admin = adminByEmail(fbUser.email);
    if (!admin) return null;
    await this._db.set(this._db.COLLECTIONS.USERS, fbUser.uid, {
      uid: fbUser.uid,
      nombre: admin.name,
      email: fbUser.email,
      rol: 'admin',
      activo: true,
      verificado: true,
      avatarColor: this._avatarColor(fbUser.uid),
    });
    return admin;
  }

  async _profileFromAuth(fbUser) {
    const admin = await this._promoteAdmin(fbUser);
    const doc = await this._db.get(this._db.COLLECTIONS.USERS, fbUser.uid);
    const base = {
      id: fbUser.uid,
      uid: fbUser.uid,
      email: fbUser.email,
      verified: Boolean(fbUser.emailVerified || admin),
      googleAuth: fbUser.providerData.some(p => p.providerId === 'google.com'),
      avatarUrl: fbUser.photoURL || doc?.foto || '',
      displayName: fbUser.displayName,
    };
    if (admin) {
      return {
        ...base,
        ...doc,
        name: admin.name,
        role: 'admin',
        zone: doc?.zona || '',
        initials: initialsOf(admin.name),
        avatarColor: doc?.avatarColor || this._avatarColor(fbUser.uid),
        needsRole: false,
      };
    }
    if (!doc) return { ...base, name: fbUser.displayName || 'Usuario', role: 'cliente', needsRole: true };
    return {
      ...base,
      ...doc,
      name: doc.nombre || fbUser.displayName || 'Usuario',
      role: doc.rol || 'cliente',
      zone: doc.zona || '',
      initials: initialsOf(doc.nombre || fbUser.displayName),
      avatarColor: doc.avatarColor || this._avatarColor(fbUser.uid),
    };
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
      verificado: fbUser.emailVerified,
      googleAuth: fbUser.providerData.some(p => p.providerId === 'google.com'),
      activo: extras.activo !== false,
      avatarColor: this._avatarColor(fbUser.uid),
      fechaRegistro: firebase.firestore.FieldValue.serverTimestamp(),
    };
    await this._db.set(this._db.COLLECTIONS.USERS, fbUser.uid, payload);
    if (role === 'trabajador') await this._ensureWorkerDoc(fbUser.uid, extras);
    return payload;
  }

  async _ensureWorkerDoc(uid, extras = {}) {
    const existing = await this._db.get(this._db.COLLECTIONS.WORKERS, uid);
    if (existing) return;
    await this._db.set(this._db.COLLECTIONS.WORKERS, uid, {
      uid,
      oficio: extras.trade || '',
      experiencia: extras.experience || 0,
      descripcion: '',
      tipoHojaVida: extras.cvType || '',
      disponibilidad: 'Disponible',
      tarifas: { visitaDiagnostica: 0, horaBase: 0 },
      calificacionPromedio: 0,
      totalResenas: 0,
      zona: extras.zone || '',
      zonasCobertura: extras.zone ? [extras.zone] : [],
      portafolio: [],
      badgeVerified: false,
      activo: extras.activo !== false,
    });
  }

  onAuthChange(callback) {
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
    const admin = adminByEmail(email);
    if (admin && password !== admin.password) {
      throw new Error('Contraseña incorrecta.');
    }
    try {
      const cred = await this._auth.signInWithEmailAndPassword(email, password);
      this.currentUser = await this._profileFromAuth(cred.user);
      return this.currentUser;
    } catch (e) {
      const missing = ['auth/user-not-found', 'auth/invalid-credential', 'auth/invalid-login-credentials', 'auth/wrong-password'].includes(e.code);
      if (admin && (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential' || e.code === 'auth/invalid-login-credentials')) {
        try {
          const cred = await this._auth.createUserWithEmailAndPassword(admin.email, admin.password);
          await cred.user.updateProfile({ displayName: admin.name });
          await this._ensureUserDoc(cred.user, { name: admin.name, role: 'admin', activo: true });
          this.currentUser = await this._profileFromAuth(cred.user);
          return this.currentUser;
        } catch (createErr) {
          if (createErr.code === 'auth/email-already-in-use') {
            throw new Error('Esa cuenta admin ya existe. Revisa la contraseña.');
          }
          throw new Error(this._mapError(createErr));
        }
      }
      if (admin && missing) throw new Error(this._mapError(e));
      throw new Error(this._mapError(e));
    }
  }

  async register({ name, email, password, zone, trade, role }) {
    try {
      const admin = adminByEmail(email);
      if (admin && password !== admin.password) {
        throw new Error('Usa la clave de administrador asignada.');
      }
      const finalRole = admin ? 'admin' : role;
      const cred = await this._auth.createUserWithEmailAndPassword(email, password);
      await cred.user.updateProfile({ displayName: admin ? admin.name : name });
      if (!admin) await cred.user.sendEmailVerification();
      await this._ensureUserDoc(cred.user, {
        name: admin ? admin.name : name,
        role: finalRole,
        zone: admin ? '' : zone,
        trade: admin ? '' : trade,
        activo: true,
      });
      this.currentUser = await this._profileFromAuth(cred.user);
      return this.currentUser;
    } catch (e) {
      throw new Error(this._mapError(e));
    }
  }

  async loginWithGoogle(roleHint) {
    try {
      const provider = window.ChambaGoogleProvider;
      if (roleHint) sessionStorage.setItem('chambaya_role_hint', roleHint);

      // En móvil el popup suele estar bloqueado → mejor redirect directo.
      const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') ||
        (window.matchMedia && window.matchMedia('(max-width: 700px)').matches);

      let result = null;
      try {
        if (isMobile) throw new Error('__mobile_redirect__');
        result = await this._auth.signInWithPopup(provider);
      } catch (popErr) {
        const code = popErr && popErr.code;
        const forcedRedirect = popErr && popErr.message === '__mobile_redirect__';
        // Redirect solo cuando el navegador bloquea el popup (o en móvil).
        // Si el usuario cancela/cierra el popup a propósito, se muestra el error normal.
        if (!forcedRedirect && code !== 'auth/popup-blocked') {
          throw popErr;
        }
        // Navega a Google en la misma pestaña; al volver, el arranque
        // procesa el resultado con handleRedirectResult().
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

  // Procesa el regreso de signInWithRedirect (suele llamarse al arrancar la app).
  async handleRedirectResult() {
    if (!this._auth.getRedirectResult) return null;
    let result;
    try {
      result = await this._auth.getRedirectResult();
    } catch (e) {
      console.warn('TuOficioCol: no hubo resultado de redirect Google.', e.message);
      return null;
    }
    if (!result || !result.user) return null;

    const isNew = Boolean(result.additionalUserInfo?.isNewUser);
    const hint = sessionStorage.getItem('chambaya_role_hint') || '';
    sessionStorage.removeItem('chambaya_role_hint');
    const existing = await this._db.get(this._db.COLLECTIONS.USERS, result.user.uid);
    const admin = adminByEmail(result.user.email);
    if (!existing && hint && !admin) {
      await this._ensureUserDoc(result.user, { role: hint });
    }
    this.currentUser = await this._profileFromAuth(result.user);
    return { isNew: Boolean(isNew || !existing), user: this.currentUser };
  }

  async completeRole(role, extras = {}) {
    const user = this._auth.currentUser;
    if (!user) throw new Error('No hay sesión.');
    const existing = await this._db.get(this._db.COLLECTIONS.USERS, user.uid);
    if (!existing) {
      await this._ensureUserDoc(user, { role, zone: extras.zone, trade: extras.trade });
    } else {
      await this._db.update(this._db.COLLECTIONS.USERS, user.uid, {
        rol: role,
        zona: extras.zone || '',
        oficio: extras.trade || '',
      });
      if (role === 'trabajador') await this._ensureWorkerDoc(user.uid, extras);
    }
    this.currentUser = await this._profileFromAuth(user);
    return this.currentUser;
  }

  async sendPasswordReset(email) {
    try {
      await this._auth.sendPasswordResetEmail(email);
    } catch (e) {
      throw new Error(this._mapError(e));
    }
  }

  async resendVerificationEmail() {
    if (this._auth.currentUser) await this._auth.currentUser.sendEmailVerification();
  }

  async checkEmailVerified() {
    if (!this._auth.currentUser) return false;
    await this._auth.currentUser.reload();
    return this._auth.currentUser.emailVerified;
  }

  async logout() {
    await this._auth.signOut();
    this.currentUser = null;
  }
}
