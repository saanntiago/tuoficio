class UIManager {
  constructor(appInstance) {
    this._app = appInstance;
    this._currentPage = null;
    this._pages = {};
    this._selectedRole = 'trabajador';
    this._chatbot = null;
    this._notifOpen = false;
    this._dropdownOpen = false;
    window.ui = this;
  }

  mount() {
    this._renderHeader();
    this._renderChatbot();
    this._bindGlobalEvents();
  }

  showSetupBanner() {
    const el = document.getElementById('setupBanner');
    if (el) el.classList.remove('hidden');
  }

  showAuth() {
    document.getElementById('authScreen')?.classList.remove('hidden');
    document.getElementById('appScreen')?.classList.add('hidden');
    document.getElementById('chatbotFab')?.classList.add('hidden');
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
    el.classList.add('active');
    const trade = document.getElementById('tradeField');
    if (trade) trade.style.display = role === 'trabajador' || role === 'worker' ? 'block' : 'none';
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
      this._setLoading('loginBtn', false, '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión');
    }
  }

  async doRegister() {
    const name = document.getElementById('regName').value.trim();
    const last = document.getElementById('regLast').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const pass = document.getElementById('regPass').value;
    const zone = document.getElementById('regZone').value.trim();
    const trade = document.getElementById('regTrade')?.value || null;
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
    this._setLoading('registerBtn', true, 'Creando cuenta...');
    this._clearAuthErrors();
    try {
      await this._app.register({
        name: admin ? admin.name : `${name} ${last}`,
        email, password: pass, zone: admin ? '' : zone, trade: admin ? '' : trade, role,
      });
      this.showToast(admin
        ? 'Administrador listo. Entraste al panel de gestión.'
        : 'Cuenta creada. Revisa tu correo para verificarla.', 'success', 5000);
    } catch (err) {
      this._showAuthError('registerError', err.message);
    } finally {
      this._setLoading('registerBtn', false, '<i class="fas fa-user-plus"></i> Crear Cuenta Gratis');
    }
  }

  async doGoogleLogin() {
    this._clearAuthErrors();
    const registerVisible = document.getElementById('registerForm')?.style.display !== 'none';
    const roleHint = registerVisible
      ? (this._selectedRole === 'worker' ? 'trabajador' : this._selectedRole)
      : null;
    try {
      const result = await this._app.loginWithGoogle(roleHint);
      if (result && result.redirected) return; // navegando a Google en la misma pestaña
      this.showToast(result.isNew ? 'Cuenta creada con Google.' : '¡Hola de nuevo!', 'success');
    } catch (err) {
      this._showAuthError('loginError', err.message);
      this.showToast(err.message, 'error');
    }
  }

  askRole(user) {
    this.openModal(`
      <div class="modal-header">
        <div class="modal-title">¿Cómo vas a usar TuOficioCol?</div>
      </div>
      <p style="font-size:13px;color:var(--text3);margin-bottom:16px">Hola ${escapeHtml(user.name || '')}. Elige un rol para guardar tu perfil en Firestore.</p>
      <div class="form-group"><label>Zona</label>
        <select class="form-input" id="roleZone">${CHAMBAYA.ZONES.map(z => `<option>${z.name}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label>Si eres trabajador, oficio</label>
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
      this.showToast('Perfil guardado', 'success');
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
      msg.textContent = `Enviamos el enlace a ${email}.`;
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  async doLogout() {
    await this._app.logout();
  }

  _renderHeader() {
    const header = document.getElementById('appHeader');
    if (!header) return;
    header.innerHTML = `
      <button id="menuToggle" class="menu-toggle" onclick="ui.toggleSidebar()"><i class="fas fa-bars"></i></button>
      <a class="header-logo" href="index.html">
        <div class="header-logo-icon"><i class="fas fa-bolt"></i></div>
        <span>TuOficioCol</span>
      </a>
      <div class="header-search-wrapper">
        <i class="fas fa-search search-icon"></i>
        <input type="text" class="header-search" id="globalSearch"
          placeholder="Buscar técnicos, oficios, barrios..."
          oninput="ui.handleSearch(this.value)"/>
      </div>
      <div class="header-actions">
        <span class="role-badge" id="headerRoleBadge"></span>
        <button class="notif-btn" onclick="ui.toggleNotifPanel()" title="Notificaciones">
          <i class="fas fa-bell"></i>
          <span class="notif-badge hidden" id="notifBadge">0</span>
        </button>
        <div class="dropdown" id="userDropdown">
          <div class="user-avatar" id="headerAvatar" onclick="ui.toggleDropdown()"></div>
          <div class="dropdown-menu" id="userMenu">
            <div class="dropdown-item" onclick="ui.navigateTo('profile')"><i class="fas fa-user"></i> Mi Perfil</div>
            <div class="dropdown-item" onclick="ui.navigateTo('settings')"><i class="fas fa-cog"></i> Configuración</div>
            <div class="dropdown-divider"></div>
            <div class="dropdown-item danger" onclick="ui.doLogout()"><i class="fas fa-sign-out-alt"></i> Cerrar Sesión</div>
          </div>
        </div>
      </div>`;
  }

  _updateHeaderUser(user) {
    const avatar = document.getElementById('headerAvatar');
    if (!avatar) return;
    if (user.avatarUrl) {
      avatar.innerHTML = `<img src="${escapeHtml(user.avatarUrl)}" alt="" style="width:100%;height:100%;border-radius:inherit;object-fit:cover"/>`;
    } else {
      avatar.textContent = user.initials || initialsOf(user.name);
      avatar.style.background = user.avatarColor || '#3A3A38';
    }
    const roleBadge = document.getElementById('headerRoleBadge');
    const roleLabel = { admin: 'Administrador', trabajador: 'Trabajador', worker: 'Trabajador', cliente: 'Empleador', client: 'Empleador' }[user.role] || user.role;
    if (roleBadge) {
      const cls = user.role === 'trabajador' || user.role === 'worker' ? 'worker' : user.role === 'admin' ? 'admin' : 'client';
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
    const r = role === 'worker' ? 'trabajador' : role === 'client' ? 'cliente' : role;
    const NAV = {
      admin: {
        main: [
          { id: 'dashboard', icon: 'fa-th-large', label: 'Panel Principal' },
          { id: 'admin-users', icon: 'fa-clipboard-list', label: 'Registros' },
          { id: 'admin-active', icon: 'fa-user-check', label: 'Usuarios activos' },
          { id: 'admin-inactive', icon: 'fa-user-slash', label: 'Usuarios inactivos' },
          { id: 'admin-verify', icon: 'fa-shield-alt', label: 'Verificaciones' },
          { id: 'admin-reports', icon: 'fa-flag', label: 'Reportes' },
        ],
        mgmt: [
          { id: 'workers', icon: 'fa-hard-hat', label: 'Trabajadores' },
          { id: 'map', icon: 'fa-map-marked-alt', label: 'Zonas' },
          { id: 'messages', icon: 'fa-comment', label: 'Mensajes' },
          { id: 'settings', icon: 'fa-cog', label: 'Configuración' },
        ],
      },
      trabajador: {
        main: [
          { id: 'dashboard', icon: 'fa-th-large', label: 'Mi Panel' },
          { id: 'profile', icon: 'fa-user', label: 'Mi Perfil / HV' },
          { id: 'portfolio', icon: 'fa-images', label: 'Portafolio' },
          { id: 'availability', icon: 'fa-clock', label: 'Disponibilidad' },
          { id: 'quotes', icon: 'fa-briefcase', label: 'Ofertas cercanas' },
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
          { id: 'favorites', icon: 'fa-heart', label: 'Favoritos' },
          { id: 'messages', icon: 'fa-comment', label: 'Mensajes' },
        ],
        mgmt: [
          { id: 'profile', icon: 'fa-user', label: 'Mi Perfil' },
          { id: 'settings', icon: 'fa-cog', label: 'Configuración' },
        ],
      },
    };
    const def = NAV[r] || NAV.cliente;
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

  navigateTo(pageId) {
    this._pages[this._currentPage]?.destroy?.();
    delete this._pages[this._currentPage];
    this._currentPage = pageId;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`nav-${pageId}`)?.classList.add('active');
    const main = document.getElementById('mainContent');
    main.innerHTML = '';
    const page = this._getPage(pageId);
    if (page) page.render(main);
    else main.innerHTML = `<div class="empty-state"><i class="fas fa-tools"></i><h3>Página en construcción</h3></div>`;
    if (window.innerWidth < 900) document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('notifPanel')?.classList.remove('open');
    this._notifOpen = false;
  }

  _getPage(pageId) {
    if (!this._pages[pageId]) {
      const map = {
        dashboard: DashboardPage,
        workers: WorkersPage,
        messages: MessagesPage,
        profile: ProfilePage,
        portfolio: PortfolioPage,
        availability: AvailabilityPage,
        quotes: QuotesPage,
        favorites: FavoritesPage,
        map: MapPage,
        'admin-users': AdminUsersPage,
        'admin-active': AdminUsersPage,
        'admin-inactive': AdminUsersPage,
        'admin-verify': AdminVerifyPage,
        'admin-reports': AdminReportsPage,
        settings: SettingsPage,
      };
      const Cls = map[pageId];
      if (!Cls) return null;
      this._pages[pageId] = new Cls(this._app, this);
    }
    return this._pages[pageId];
  }

  updateNotifications(notifs) {
    const unread = notifs.filter(n => !n.read && !n.leida).length;
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
        <button onclick="ui.markAllNotifRead()" style="font-size:12px;color:var(--primary);background:none;border:none;cursor:pointer;font-weight:600">Marcar todas leídas</button>
      </div>
      ${notifs.length ? notifs.map(n => `
        <div class="notif-item ${n.read || n.leida ? '' : 'unread'}" onclick="ui.markNotifRead('${n.id}')">
          <div class="notif-icon-wrap" style="background:${n.bg || 'var(--bg)'}">
            <i class="fas ${n.icon || 'fa-bell'}" style="color:${n.color || 'var(--primary)'}"></i>
          </div>
          <div style="flex:1">
            <div class="notif-title">${escapeHtml(n.title)}</div>
            <div class="notif-desc">${escapeHtml(n.desc)}</div>
          </div>
        </div>`).join('') : `<div class="empty-state" style="padding:32px"><i class="fas fa-bell-slash"></i><h3>Sin notificaciones</h3></div>`}`;
  }

  async markNotifRead(id) { await this._app.notif.markRead(id); }
  async markAllNotifRead() {
    const user = this._app.auth.currentUser;
    if (user) await this._app.notif.markAllRead(user.uid);
  }

  toggleNotifPanel() {
    this._notifOpen = !this._notifOpen;
    document.getElementById('notifPanel').classList.toggle('open', this._notifOpen);
  }

  _renderChatbot() {
    this._chatbot = new Chatbot(this._app, this);
    document.getElementById('chatbotWindow').innerHTML = this._chatbot.template();
  }

  toggleChatbot() {
    const win = document.getElementById('chatbotWindow');
    const icon = document.getElementById('chatbotIcon');
    const open = win.classList.toggle('open');
    if (icon) icon.className = open ? 'fas fa-times' : 'fas fa-robot';
    if (open) this._chatbot?.focus();
  }

  openModal(html) {
    this.closeModal();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.id = 'activeModal';
    overlay.innerHTML = `<div class="modal">${html}</div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) this.closeModal(); });
    document.getElementById('modalContainer').appendChild(overlay);
  }

  closeModal() {
    document.getElementById('activeModal')?.remove();
  }

  showToast(msg, type = 'info', duration = 3500) {
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${icons[type]}"></i><span>${escapeHtml(msg)}</span>`;
    document.getElementById('toastContainer').appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(120%)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  handleSearch(val) {
    if (this._currentPage === 'workers') this._pages.workers?.search(val);
  }

  toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }
  toggleDropdown() {
    this._dropdownOpen = !this._dropdownOpen;
    document.getElementById('userDropdown').classList.toggle('open', this._dropdownOpen);
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
  }
}
