/**
 * Núcleo de la aplicación: detecta el backend disponible, instancia los
 * servicios y arranca la interfaz.
 */
class App {
  constructor() {
    this.mode = 'firebase';
    this.firebase = null;
  }

  async init() {
    this.mode = await DatabaseService.probe();
    this.firebase = this.mode === 'firebase' ? initFirebase() : { configured: true, mode: 'local' };

    this.db = new DatabaseService(this.mode);
    this.storage = new StorageService(this.mode);
    this.auth = new AuthService(this.db);
    this.workers = new WorkerService(this.db);
    this.quotes = new QuoteService(this.db);
    this.jobs = new JobService(this.db);
    this.verifications = new VerificationService(this.db);
    this.reports = new ReportService(this.db);
    this.favorites = new FavoriteService(this.db);
    this.messages = new MessageService(this.db);
    this.notif = new NotificationService(this.db);
    this.zones = new ZoneService();

    this.ui = new UIManager(this);
    this.ui.mount();
    if (this.mode === 'local') this.ui.showLocalBanner();
    if (this.mode === 'firebase' && window.ChambaEmulator) {
      this.ui.showToast('Conectado al emulador local de Firebase (Firestore, Auth y Storage).', 'info', 6000);
    }

    if (this.mode === 'firebase') {
      try {
        await this.auth.handleRedirectResult();
      } catch (e) {
        console.warn('TuOficioCol: no se pudo procesar el redirect de Google.', e.message);
      }
    }

    this.auth.onAuthChange(async (user) => {
      if (this._notifUnsub) {
        this._notifUnsub();
        this._notifUnsub = null;
      }
      if (!user) {
        this.ui.resetSession();
        this.ui.showAuth();
        return;
      }
      if (user.activo === false) {
        this.ui.resetSession();
        this.ui.showAuth();
        this.ui.showToast('Tu cuenta está desactivada. Contacta al administrador.', 'error', 6000);
        await this.auth.logout();
        return;
      }
      this.ui.resetSession();
      this.ui.showApp(user);
      if (user.needsRole) {
        this.ui.askRole(user);
        return;
      }
      this._notifUnsub = this.notif.subscribe(user.uid, notifs => this.ui.updateNotifications(notifs));
    });
  }

  /* Atajos usados por las vistas */
  loginWithEmail(email, password) { return this.auth.loginWithEmail(email, password); }
  register(data) { return this.auth.register(data); }
  loginWithGoogle(role) { return this.auth.loginWithGoogle(role); }
  completeRole(role, extras) { return this.auth.completeRole(role, extras); }
  sendPasswordReset(email) { return this.auth.sendPasswordReset(email); }
  logout() { return this.auth.logout(); }

  get user() {
    return this.auth.currentUser;
  }

  /** Notifica a todos los administradores (reportes y verificaciones). */
  async notifyAdmins(payload) {
    try {
      const admins = await this.db.getAll(this.db.COLLECTIONS.USERS, [['rol', '==', 'admin']]);
      await Promise.all(admins.map(a => this.notif.notify({ ...payload, usuarioId: a.id })));
    } catch (e) {
      console.warn('No se pudo notificar a los administradores.', e.message);
    }
  }

  resetDemoData() {
    this.db.resetDemo();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
  window.app.init().catch(err => {
    console.error(err);
    const msg = document.getElementById('bootError');
    if (msg) {
      msg.textContent = err.message || 'No se pudo iniciar TuOficioCol.';
      msg.classList.remove('hidden');
    }
  });
});
