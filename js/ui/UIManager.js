/**
 * Gestor de interfaz: cabecera, menú lateral, notificaciones, modales y
 * navegación entre las vistas de la aplicación.
 */
class UIManager {
  constructor(appInstance) {
    this._app = appInstance;
    this._currentPage = null;
    this._pages = {};
    this._selectedRole = 'trabajador';
    this._chatbot = null;
    this._notifOpen = false;
    this._dropdownOpen = false;
    this._confirmResolve = null;
    window.ui = this;
  }

  mount() {
    this._renderHeader();
    this._renderChatbot();
    this._bindGlobalEvents();
    this._bindDemoPanel();
  }

  /* ── Pantallas ───────────────────────────────────────────── */

  showSetupBanner() {
    document.getElementById('setupBanner')?.classList.remove('hidden');
  }

  showLocalBanner() {
    document.getElementById('localBanner')?.classList.remove('hidden');
  }

  showAuth() {
    document.getElementById('authScreen')?.classList.remove('hidden');
    document.getElementById('appScreen')?.classList.add('hidden');
    document.getElementById('chatbotFab')?.classList.add('hidden');
    document.querySelector('.chatbot-window')?.classList.remove('open');
  }

  /** Limpia el estado de la sesión anterior (páginas, modales, chat). */
  resetSession() {
    try { this._pages[this._currentPage]?.destroy?.(); } catch (e) { /* ignorar */ }
    this._pages = {};
    this._currentPage = null;
    this._notifs = [];
    this._notifSeen = null;
    this._notifOpen = false;
    this.closeModal();
    document.getElementById('notifPanel')?.classList.remove('open');
    document.getElementById('chatbotWindow')?.classList.remove('open');
    const badge = document.getElementById('notifBadge');
    if (badge) badge.classList.add('hidden');
    const icon = document.getElementById('chatbotIcon');
    if (icon) icon.className = 'fas fa-robot';
  }

  showApp(user) {
    document.getElementById('authScreen')?.classList.add('hidden');
    document.getElementById('appScreen')?.classList.remove('hidden');
    document.getElementById('chatbotFab')?.classList.remove('hidden');
    this._updateHeaderUser(user);
    this._renderSidebar(user.role);
    this._chatbot?.init(user);
    this.navigateTo('dashboard');
  }

  /* ── Autenticación ───────────────────────────────────────── */

  switchTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t =>
      t.classList.toggle('active', t.dataset.tab === tab)
    );
    const login = document.getElementById('loginForm');
    const register = document.getElementById('registerForm');
    const forgot = document.getElementById('forgotForm');
    if (login) login.style.display = tab === 'login' ? 'block' : 'none';
    if (register) register.style.display = tab === 'register' ? 'block' : 'none';
    if (forgot) forgot.style.display = 'none';
    this._clearAuthErrors();
  }

  showForgotPassword() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('forgotForm').style.display = 'block';
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  }

  selectRole(role, el) {
    this._selectedRole = role;
    document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
    el?.classList.add('active');
    const trade = document.getElementById('tradeField');
    if (trade) trade.style.display = role === 'trabajador' ? 'block' : 'none';
    const experience = document.getElementById('regExperienceGroup');
    if (experience) experience.style.display = role === 'trabajador' ? 'block' : 'none';
    const doc = document.getElementById('regDocGroup');
    if (doc) doc.style.display = role === 'trabajador' ? 'block' : 'none';
  }

  async doLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!email || !password) {
      this._showAuthError('loginError', 'Completa todos los campos.');
      return;
    }
    this._setLoading('loginBtn', true, 'Iniciando sesión...');
    this._clearAuthErrors();
    try {
      await this._app.loginWithEmail(email, password);
    } catch (err) {
      this._showAuthError('loginError', err.message);
    } finally {
      this._setLoading('loginBtn', false, '<i class="fas fa-sign-in-alt"></i> Iniciar sesión');
    }
  }

  async doRegister() {
    const name = document.getElementById('regName')?.value.trim();
    const last = document.getElementById('regLast')?.value.trim();
    const email = document.getElementById('regEmail')?.value.trim();
    const pass = document.getElementById('regPass')?.value;
    const phone = document.getElementById('regPhone')?.value.trim() || '';
    const documentId = document.getElementById('regDoc')?.value.trim() || '';
    const zone = document.getElementById('regZone')?.value.trim();
    const trade = document.getElementById('regTrade')?.value || null;
    const experience = document.getElementById('regExperience')?.value || 0;
    const admin = adminByEmail(email);
    const role = admin ? 'admin' : (this._selectedRole === 'worker' ? 'trabajador' : this._selectedRole);
    if (admin) {
      if (!email || !pass) {
        this._showAuthError('registerError', 'Ingresa el correo y la clave de administrador.');
        return;
      }
    } else if (!name || !last || !email || !pass || !zone) {
      this._showAuthError('registerError', 'Completa todos los campos.');
      return;
    }
    if (!admin && role === 'trabajador' && !trade) {
      this._showAuthError('registerError', 'Selecciona tu oficio.');
      return;
    }
    if (!admin && role === 'trabajador' && !phone) {
      this._showAuthError('registerError', 'Ingresa tu teléfono o WhatsApp para que los clientes puedan contactarte.');
      return;
    }
    if (!admin && role === 'trabajador' && !documentId) {
      this._showAuthError('registerError', 'Ingresa tu documento de identidad para la verificación.');
      return;
    }
    this._setLoading('registerBtn', true, 'Creando cuenta...');
    this._clearAuthErrors();
    try {
      await this._app.register({
        name: admin ? admin.name : `${name} ${last}`,
        email, password: pass,
        zone: admin ? '' : zone,
        trade: admin ? '' : trade,
        experience: admin ? 0 : Number(experience) || 0,
        phone: admin ? '' : phone,
        document: admin ? '' : documentId,
        role,
      });
      this.showToast(admin
        ? 'Administrador listo. Entraste al panel de gestión.'
        : 'Cuenta creada. Completa tu perfil para aparecer en las búsquedas.', 'success', 5000);
    } catch (err) {
      this._showAuthError('registerError', err.message);
    } finally {
      this._setLoading('registerBtn', false, '<i class="fas fa-user-plus"></i> Crear cuenta gratis');
    }
  }

  async doGoogleLogin() {
    this._clearAuthErrors();
    const registerVisible = document.getElementById('registerForm')?.style.display !== 'none';
    const roleHint = registerVisible ? this._selectedRole : null;
    try {
      const result = await this._app.loginWithGoogle(roleHint);
      if (result && result.redirected) return;
      this.showToast(result.isNew ? 'Cuenta creada con Google.' : '¡Hola de nuevo!', 'success');
    } catch (err) {
      this._showAuthError('loginError', err.message);
      this.showToast(err.message, 'error');
    }
  }

  async demoLogin(role) {
    if (this._app.mode !== 'local') {
      this.showToast('El acceso rápido solo está disponible en modo demostración.', 'error');
      return;
    }
    const creds = {
      cliente: ['ana@demo.tuoficio.co', 'demo1234'],
      trabajador: ['carlos@demo.tuoficio.co', 'demo1234'],
      admin: ['admin1@chambaya.com', 'AdminChamba1!'],
    }[role];
    if (!creds) return;
    try {
      await this._app.loginWithEmail(creds[0], creds[1]);
      this.showToast(`Sesión de demostración: ${role}`, 'success');
    } catch (e) {
      this.showToast(e.message, 'error');
    }
  }

  _bindDemoPanel() {
    const panel = document.getElementById('demoPanel');
    if (!panel) return;
    panel.classList.toggle('hidden', this._app.mode !== 'local');
  }

  askRole(user) {
    this.openModal(`
      <div class="modal-header">
        <div class="modal-title">¿Cómo vas a usar TuOficioCol?</div>
      </div>
      <p style="font-size:13px;color:var(--text3);margin-bottom:16px">
        Hola ${escapeHtml(user.name || '')}. Elige un rol y tu zona para personalizar la experiencia.
      </p>
      <div class="form-group"><label>Zona / localidad</label>
        <select class="form-input" id="roleZone">${CHAMBAYA.ZONES.map(z => `<option>${z.name}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label>Si eres trabajador, ¿cuál es tu oficio?</label>
        <select class="form-input" id="roleTrade">${CHAMBAYA.TRADES.map(t => `<option>${t}</option>`).join('')}</select>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="ui.finishRole('trabajador')"><i class="fas fa-hard-hat"></i> Trabajador</button>
        <button class="btn btn-secondary" onclick="ui.finishRole('cliente')"><i class="fas fa-briefcase"></i> Empleador</button>
      </div>`);
  }

  async finishRole(role) {
    try {
      const zone = document.getElementById('roleZone')?.value;
      const trade = document.getElementById('roleTrade')?.value;
      const user = await this._app.completeRole(role, { zone, trade });
      this.closeModal();
      this.showApp(user);
      this.showToast('Perfil configurado', 'success');
    } catch (e) {
      this.showToast(e.message, 'error');
    }
  }

  async doForgotPassword() {
    const email = document.getElementById('forgotEmail').value.trim();
    if (!email) return;
    try {
      await this._app.sendPasswordReset(email);
      const msg = document.getElementById('forgotMsg');
      msg.style.display = 'block';
      msg.textContent = `Enviamos el enlace de recuperación a ${email}.`;
    } catch (err) {
      const msg = document.getElementById('forgotMsg');
      msg.style.display = 'block';
      msg.style.color = '#A85B46';
      msg.textContent = err.message;
    }
  }

  async doLogout() {
    const ok = await this.confirm({
      title: 'Cerrar sesión',
      message: '¿Quieres salir de TuOficioCol?',
      confirmText: 'Cerrar sesión',
    });
    if (ok) await this._app.logout();
  }

  /* ── Cabecera ────────────────────────────────────────────── */

  _renderHeader() {
    const header = document.getElementById('appHeader');
    if (!header) return;
    header.innerHTML = `
      <button id="menuToggle" class="menu-toggle" onclick="ui.toggleSidebar()" aria-label="Abrir menú">
        <i class="fas fa-bars"></i>
      </button>
      <a class="header-logo" href="index.html">
        <div class="header-logo-icon"><i class="fas fa-bolt"></i></div>
        <span>TuOficio<b>Col</b></span>
      </a>
      <div class="header-search-wrapper">
        <i class="fas fa-search search-icon"></i>
        <input type="text" class="header-search" id="globalSearch"
          placeholder="Buscar técnicos, oficios o barrios..."
          onkeydown="if(event.key==='Enter') ui.handleSearch(this.value)"
          aria-label="Buscar"/>
      </div>
      <div class="header-actions">
        <span class="role-badge" id="headerRoleBadge"></span>
        <button class="notif-btn" onclick="ui.toggleNotifPanel()" title="Notificaciones" aria-label="Notificaciones">
          <i class="fas fa-bell"></i>
          <span class="notif-badge hidden" id="notifBadge">0</span>
        </button>
        <div class="dropdown" id="userDropdown">
          <div class="user-avatar" id="headerAvatar" onclick="ui.toggleDropdown()"></div>
          <div class="dropdown-menu" id="userMenu">
            <div class="dropdown-item" onclick="ui.navigateTo('profile')"><i class="fas fa-user"></i> Mi perfil</div>
            <div class="dropdown-item" onclick="ui.navigateTo('settings')"><i class="fas fa-cog"></i> Configuración</div>
            <div class="dropdown-divider"></div>
            <div class="dropdown-item danger" onclick="ui.doLogout()"><i class="fas fa-sign-out-alt"></i> Cerrar sesión</div>
          </div>
        </div>
      </div>`;
  }

  _updateHeaderUser(user) {
    if (!user) return;
    const avatar = document.getElementById('headerAvatar');
    if (avatar) {
      if (user.avatarUrl) {
        avatar.innerHTML = `<img src="${escapeHtml(user.avatarUrl)}" alt="" style="width:100%;height:100%;border-radius:inherit;object-fit:cover"/>`;
      } else {
        avatar.textContent = user.initials || initialsOf(user.name);
        avatar.style.background = user.avatarColor || '#3A3A38';
      }
    }
    const roleBadge = document.getElementById('headerRoleBadge');
    const roleLabel = { admin: 'Administrador', trabajador: 'Trabajador', cliente: 'Empleador' }[user.role] || user.role;
    if (roleBadge) {
      const cls = user.role === 'trabajador' ? 'worker' : user.role === 'admin' ? 'admin' : 'client';
      roleBadge.textContent = roleLabel;
      roleBadge.className = `role-badge ${cls}`;
    }
    const sName = document.getElementById('sidebarUserName');
    const sRole = document.getElementById('sidebarUserRole');
    const sAv = document.getElementById('sidebarAvatar');
    if (sName) sName.textContent = user.name || user.displayName;
    if (sRole) sRole.textContent = roleLabel;
    if (sAv) {
      if (user.avatarUrl) {
        sAv.innerHTML = `<img src="${escapeHtml(user.avatarUrl)}" alt="" style="width:100%;height:100%;border-radius:inherit;object-fit:cover"/>`;
      } else {
        sAv.textContent = user.initials || initialsOf(user.name);
        sAv.style.background = user.avatarColor || '#3A3A38';
      }
    }
  }

  _renderSidebar(role) {
    const NAV = {
      admin: {
        main: [
          { id: 'dashboard', icon: 'fa-th-large', label: 'Panel principal' },
          { id: 'admin-users', icon: 'fa-clipboard-list', label: 'Usuarios' },
          { id: 'admin-verify', icon: 'fa-shield-alt', label: 'Verificaciones' },
          { id: 'admin-reports', icon: 'fa-flag', label: 'Reportes' },
          { id: 'admin-jobs', icon: 'fa-briefcase', label: 'Trabajos' },
        ],
        mgmt: [
          { id: 'workers', icon: 'fa-hard-hat', label: 'Directorio' },
          { id: 'map', icon: 'fa-map-marked-alt', label: 'Zonas' },
          { id: 'messages', icon: 'fa-comment', label: 'Mensajes' },
          { id: 'settings', icon: 'fa-cog', label: 'Configuración' },
        ],
      },
      trabajador: {
        main: [
          { id: 'dashboard', icon: 'fa-th-large', label: 'Mi panel' },
          { id: 'profile', icon: 'fa-user', label: 'Mi perfil / HV' },
          { id: 'portfolio', icon: 'fa-images', label: 'Portafolio' },
          { id: 'availability', icon: 'fa-clock', label: 'Disponibilidad' },
          { id: 'quotes', icon: 'fa-briefcase', label: 'Ofertas cercanas' },
          { id: 'jobs', icon: 'fa-clipboard-check', label: 'Mis trabajos' },
          { id: 'messages', icon: 'fa-comment', label: 'Mensajes' },
        ],
        mgmt: [
          { id: 'map', icon: 'fa-map-marked-alt', label: 'Mapa de zonas' },
          { id: 'settings', icon: 'fa-cog', label: 'Configuración' },
        ],
      },
      cliente: {
        main: [
          { id: 'dashboard', icon: 'fa-th-large', label: 'Inicio' },
          { id: 'workers', icon: 'fa-users', label: 'Directorio' },
          { id: 'map', icon: 'fa-map-marked-alt', label: 'Mapa' },
          { id: 'quotes', icon: 'fa-file-alt', label: 'Mis solicitudes' },
          { id: 'jobs', icon: 'fa-clipboard-check', label: 'Mis trabajos' },
          { id: 'favorites', icon: 'fa-heart', label: 'Favoritos' },
          { id: 'messages', icon: 'fa-comment', label: 'Mensajes' },
        ],
        mgmt: [
          { id: 'profile', icon: 'fa-user', label: 'Mi perfil' },
          { id: 'settings', icon: 'fa-cog', label: 'Configuración' },
        ],
      },
    };
    const def = NAV[role] || NAV.cliente;
    document.getElementById('sidebar').innerHTML = `
      <div class="sidebar-section">
        <div class="sidebar-label">Principal</div>
        <div>${def.main.map(n => this._navItem(n)).join('')}</div>
      </div>
      <div class="sidebar-section">
        <div class="sidebar-label">Gestión</div>
        <div>${def.mgmt.map(n => this._navItem(n)).join('')}</div>
      </div>
      <div class="sidebar-profile">
        <div class="sidebar-user" onclick="ui.navigateTo('profile')">
          <div class="user-avatar" id="sidebarAvatar" style="width:36px;height:36px;font-size:14px;border-radius:10px;background:#3A3A38"></div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name" id="sidebarUserName">Cargando...</div>
            <div class="sidebar-user-role" id="sidebarUserRole">—</div>
          </div>
        </div>
      </div>`;
    this._updateHeaderUser(this._app.auth.currentUser);
  }

  _navItem(n) {
    return `<div class="nav-item" id="nav-${n.id}" onclick="ui.navigateTo('${n.id}')">
      <i class="fas ${n.icon}"></i>${n.label}
    </div>`;
  }

  /* ── Navegación ──────────────────────────────────────────── */

  navigateTo(pageId, params = {}) {
    if (this._currentPage) this._pages[this._currentPage]?.destroy?.();
    this._currentPage = pageId;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`nav-${pageId}`)?.classList.add('active');
    const main = document.getElementById('mainContent');
    if (!main) return;
    main.innerHTML = '<div class="page-loading"><span class="spinner"></span></div>';
    const page = this._getPage(pageId);
    if (!page) {
      main.innerHTML = `<div class="empty-state"><i class="fas fa-tools"></i><h3>Página no disponible</h3></div>`;
      return;
    }
    page._alive = true;
    Promise.resolve(page.render(main, params)).catch(err => {
      console.error(err);
      main.innerHTML = `<div class="empty-state"><i class="fas fa-triangle-exclamation"></i>
        <h3>No se pudo cargar la sección</h3><p>${escapeHtml(err.message || '')}</p></div>`;
    });
    if (window.innerWidth < 900) document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('notifPanel')?.classList.remove('open');
    this._notifOpen = false;
  }

  _getPage(pageId) {
    if (!this._pages[pageId] || this._pages[pageId] === true) {
      const map = {
        dashboard: DashboardPage,
        workers: WorkersPage,
        messages: MessagesPage,
        profile: ProfilePage,
        portfolio: PortfolioPage,
        availability: AvailabilityPage,
        quotes: QuotesPage,
        jobs: JobsPage,
        favorites: FavoritesPage,
        map: MapPage,
        'admin-users': AdminUsersPage,
        'admin-active': AdminUsersPage,
        'admin-inactive': AdminUsersPage,
        'admin-verify': AdminVerifyPage,
        'admin-reports': AdminReportsPage,
        'admin-jobs': AdminJobsPage,
        settings: SettingsPage,
      };
      const Cls = map[pageId];
      if (!Cls) return null;
      this._pages[pageId] = new Cls(this._app, this);
    }
    return this._pages[pageId];
  }

  /* ── Notificaciones ──────────────────────────────────────── */

  updateNotifications(notifs) {
    this._notifs = notifs;
    if (!this._notifSeen) {
      this._notifSeen = new Set(notifs.map(n => n.id));
    } else {
      notifs.forEach(n => {
        if (!this._notifSeen.has(n.id)) {
          this._notifSeen.add(n.id);
          if (!n.read) this._showBrowserNotification(n);
        }
      });
    }
    const unread = notifs.filter(n => !n.read).length;
    const badge = document.getElementById('notifBadge');
    if (badge) {
      badge.textContent = unread;
      badge.classList.toggle('hidden', unread === 0);
    }
    const panel = document.getElementById('notifPanel');
    if (!panel) return;
    panel.innerHTML = `
      <div class="notif-panel-header">
        <div style="font-size:15px;font-weight:700">Notificaciones</div>
        <button onclick="ui.markAllNotifRead()" class="link-btn">Marcar todas leídas</button>
      </div>
      ${notifs.length ? notifs.map(n => `
        <div class="notif-item ${n.read ? '' : 'unread'}" onclick="ui.openNotification('${n.id}','${escapeHtml(n.link || '')}')">
          <div class="notif-icon-wrap" style="background:${n.bg || 'var(--bg)'}">
            <i class="fas ${n.icon || 'fa-bell'}" style="color:${n.color || 'var(--primary)'}"></i>
          </div>
          <div style="flex:1;min-width:0">
            <div class="notif-title">${escapeHtml(n.title)}</div>
            <div class="notif-desc">${escapeHtml(n.desc)}</div>
            <div class="notif-time">${timeAgo(n.createdAt)}</div>
          </div>
        </div>`).join('') : '<div class="empty-state" style="padding:32px"><i class="fas fa-bell-slash"></i><h3>Sin notificaciones</h3></div>'}`;
  }

  _showBrowserNotification(n) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      const native = new Notification(n.title || 'TuOficioCol', {
        body: n.desc || '',
        tag: n.id,
      });
      native.onclick = () => {
        window.focus();
        if (n.link) this.navigateTo(n.link);
        native.close();
      };
    } catch (e) { /* el navegador puede bloquear avisos sin servicio */ }
  }

  async enableBrowserNotifications() {
    if (!('Notification' in window)) {
      return this.showToast('Este navegador no permite notificaciones nativas.', 'error');
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return this.showToast('No se concedió permiso para mostrar avisos del navegador.', 'error', 5000);
    }
    this.showToast('Avisos del navegador activados.', 'success');
    try {
      new Notification('TuOficioCol', { body: 'Recibirás avisos de solicitudes, ofertas y mensajes.' });
    } catch (e) { /* ignorar */ }
  }

  async openNotification(id, link) {
    try { await this._app.notif.markRead(id); } catch (e) { /* ignorar */ }
    if (link) this.navigateTo(link);
  }

  async markNotifRead(id) { await this._app.notif.markRead(id); }

  async markAllNotifRead() {
    const user = this._app.auth.currentUser;
    if (user) await this._app.notif.markAllRead(user.uid);
  }

  toggleNotifPanel() {
    this._notifOpen = !this._notifOpen;
    document.getElementById('notifPanel')?.classList.toggle('open', this._notifOpen);
  }

  /* ── Chatbot ─────────────────────────────────────────────── */

  _renderChatbot() {
    const host = document.getElementById('chatbotWindow');
    if (!host) return;
    this._chatbot = new Chatbot(this._app, this);
    host.innerHTML = this._chatbot.template();
  }

  toggleChatbot() {
    const win = document.getElementById('chatbotWindow');
    const icon = document.getElementById('chatbotIcon');
    if (!win) return;
    const open = win.classList.toggle('open');
    if (icon) icon.className = open ? 'fas fa-times' : 'fas fa-robot';
    if (open) this._chatbot?.focus();
  }

  /* ── Modales y avisos ────────────────────────────────────── */

  openModal(html, { wide = false, closeOnBackdrop = true } = {}) {
    this.closeModal();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.id = 'activeModal';
    overlay.innerHTML = `<div class="modal ${wide ? 'modal-lg' : ''}">${html}</div>`;
    if (closeOnBackdrop) overlay.addEventListener('click', e => { if (e.target === overlay) this.closeModal(); });
    document.getElementById('modalContainer').appendChild(overlay);
    return overlay;
  }

  closeModal() {
    const pending = this._confirmResolve;
    this._confirmResolve = null;
    document.getElementById('activeModal')?.remove();
    if (pending) pending(false);
  }

  /** Diálogo de confirmación basado en promesa. */
  confirm({ title = 'Confirmar', message = '', confirmText = 'Aceptar', cancelText = 'Cancelar', danger = false } = {}) {
    return new Promise(resolve => {
      this.openModal(`
        <div class="modal-header">
          <div class="modal-title">${escapeHtml(title)}</div>
          <button class="modal-close" onclick="ui.resolveConfirm(false)"><i class="fas fa-times"></i></button>
        </div>
        <p style="font-size:14px;color:var(--text2);line-height:1.6">${escapeHtml(message)}</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="ui.resolveConfirm(false)">${escapeHtml(cancelText)}</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" onclick="ui.resolveConfirm(true)">${escapeHtml(confirmText)}</button>
        </div>`);
      this._confirmResolve = resolve;
    });
  }

  resolveConfirm(value) {
    const resolve = this._confirmResolve;
    this._confirmResolve = null;
    this.closeModal();
    if (resolve) resolve(value);
  }

  openImage(src, title = '') {
    this.openModal(`
      <div class="modal-header">
        <div class="modal-title">${escapeHtml(title || 'Vista previa')}</div>
        <button class="modal-close" onclick="ui.closeModal()"><i class="fas fa-times"></i></button>
      </div>
      <img src="${src}" alt="${escapeHtml(title)}" class="modal-image"/>`, { wide: true });
  }

  showToast(msg, type = 'info', duration = 3500) {
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };
    const host = document.getElementById('toastContainer');
    if (!host) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${escapeHtml(msg)}</span>`;
    host.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(120%)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /* ── Utilidades ──────────────────────────────────────────── */

  handleSearch(val) {
    const q = String(val || '').trim();
    if (!q) return;
    if (this._currentPage !== 'workers') {
      this.navigateTo('workers', { query: q });
    } else {
      this._pages.workers?.search(q);
    }
  }

  /** Abre el perfil de un técnico desde cualquier sección. */
  viewWorker(workerId) {
    if (!workerId) return;
    if (this._currentPage !== 'workers') {
      this.navigateTo('workers', { openWorkerId: workerId });
    } else {
      this._pages.workers?.openProfile(workerId);
    }
  }

  copyText(text) {
    const value = String(text || '');
    if (!value) return;
    const done = () => this.showToast('Enlace copiado al portapapeles.', 'success');
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(value).then(done).catch(() => this._fallbackCopy(value, done));
    } else {
      this._fallbackCopy(value, done);
    }
  }

  _fallbackCopy(value, done) {
    try {
      const area = document.createElement('textarea');
      area.value = value;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
      done();
    } catch (e) {
      this.showToast('No se pudo copiar. Selecciona el enlace manualmente.', 'error');
    }
  }

  toggleSidebar() { document.getElementById('sidebar')?.classList.toggle('open'); }

  toggleDropdown() {
    this._dropdownOpen = !this._dropdownOpen;
    document.getElementById('userDropdown')?.classList.toggle('open', this._dropdownOpen);
  }

  _showAuthError(elId, msg) {
    const el = document.getElementById(elId);
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  }

  _clearAuthErrors() {
    ['loginError', 'registerError'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.textContent = ''; el.style.display = 'none'; }
    });
  }

  _setLoading(btnId, loading, html) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = loading;
    btn.innerHTML = loading ? `<span class="spinner"></span> ${html}` : html;
  }

  _bindGlobalEvents() {
    document.addEventListener('click', e => {
      if (!e.target.closest('#userDropdown')) {
        document.getElementById('userDropdown')?.classList.remove('open');
        this._dropdownOpen = false;
      }
      if (!e.target.closest('#notifPanel') && !e.target.closest('.notif-btn')) {
        document.getElementById('notifPanel')?.classList.remove('open');
        this._notifOpen = false;
      }
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (document.getElementById('activeModal')) this.closeModal();
        else if (document.getElementById('notifPanel')?.classList.contains('open')) this.toggleNotifPanel();
      }
    });
  }
}
