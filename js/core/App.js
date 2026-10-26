class App {
  constructor() {
    this.firebase = initFirebase();
    this.db = new DatabaseService();
    this.auth = new AuthService(this.db);
    this.workers = new WorkerService(this.db);
    this.quotes = new QuoteService(this.db);
    this.messages = new MessageService(this.db);
    this.notif = new NotificationService(this.db);
    this.zones = new ZoneService();
    this.ui = new UIManager(this);
    this._notifUnsub = null;
  }

  async init() {
    this.ui.mount();
    if (!this.firebase.configured) {
      this.ui.showSetupBanner();
    }
    // Si venimos de un login con Google por redirect (móvil), procesa el resultado.
    try {
      await this.auth.handleRedirectResult();
    } catch (e) {
      console.error('TuOficioCol: no se pudo procesar el redirect de Google.', e.message);
    }
    this.auth.onAuthChange(async (user) => {
      if (this._notifUnsub) {
        this._notifUnsub();
        this._notifUnsub = null;
      }
      if (!user) {
        this.ui.showAuth();
        return;
      }
      this.ui.showApp(user);
      if (user.needsRole) {
        this.ui.askRole(user);
        return;
      }
      this._notifUnsub = this.notif.subscribe(user.uid, notifs => this.ui.updateNotifications(notifs));
    });
  }

  loginWithEmail(email, password) {
    return this.auth.loginWithEmail(email, password);
  }

  register(data) {
    return this.auth.register(data);
  }

  loginWithGoogle(role) {
    return this.auth.loginWithGoogle(role);
  }

  completeRole(role, extras) {
    return this.auth.completeRole(role, extras);
  }

  sendPasswordReset(email) {
    return this.auth.sendPasswordReset(email);
  }

  logout() {
    return this.auth.logout();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
  window.app.init().catch(err => {
    console.error(err);
    alert(err.message || 'No se pudo iniciar TuOficioCol');
  });
});
