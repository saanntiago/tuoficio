/**
 * Mensajería interna (HU-10).
 * Conversaciones uno a uno entre cliente y técnico, con lista de contactos
 * sugeridos a partir de trabajos, solicitudes y favoritos.
 */
class MessagesPage extends BasePage {
  constructor(app, ui) {
    super(app, ui);
    this.convs = [];
    this.activeOther = null;
    this.contactNames = {};
    this._msgUnsub = null;
    this._convUnsub = null;
  }

  destroy() {
    if (this._msgUnsub) { try { this._msgUnsub(); } catch (e) { /* ignorar */ } }
    if (this._convUnsub) { try { this._convUnsub(); } catch (e) { /* ignorar */ } }
    this._msgUnsub = null;
    this._convUnsub = null;
    super.destroy();
  }

  async render(container, params = {}) {
    container.innerHTML = `
      ${this._header('Mensajes', 'Coordina los detalles del servicio sin compartir tus datos personales.',
        `<button class="btn btn-secondary" onclick="ui._getPage('messages').openContacts()"><i class="fas fa-user-plus"></i> Nueva conversación</button>`)}
      <div class="chat-layout">
        <aside class="chat-list" id="chatList">
          <div class="page-loading"><span class="spinner dark"></span></div>
        </aside>
        <section class="chat-window" id="chatWindow"></section>
      </div>`;
    await this._preloadNames();
    if (!this._alive) return;
    this._convUnsub = this._app.messages.subscribeToConversationList(this.uid, convs => {
      if (!this._alive) return;
      this.convs = convs;
      this._renderList();
      if (!this.activeOther && convs.length) {
        const other = convs[0].participants.find(p => p !== this.uid);
        if (other) this.openConversation(other);
      }
      if (!this.activeOther && !convs.length) this._renderEmptyWindow();
    });
    if (params.otherId) {
      this.openConversation(params.otherId);
    }
  }

  async _preloadNames() {
    this.contactNames = {};
    try {
      const [jobs, suggestions] = await Promise.all([
        this.isClient ? this._app.jobs.getForClient(this.uid) : this.isWorker ? this._app.jobs.getForWorker(this.uid) : Promise.resolve([]),
        this.isClient ? this._app.quotes.getSuggestionsByClient(this.uid) : this._app.quotes.getSuggestionsForWorker(this.uid),
      ]);
      this._contacts = [];
      jobs.forEach(j => {
        const id = this.isClient ? j.trabajadorId : j.clientId;
        const name = this.isClient ? j.trabajadorNombre : j.clienteNombre;
        if (id && id !== this.uid) { this.contactNames[id] = name; this._contacts.push({ id, name, sub: j.service }); }
      });
      suggestions.forEach(s => {
        const id = this.isClient ? s.trabajadorId : s.employerId;
        const name = this.isClient ? (this.contactNames[id] || 'Técnico') : s.employerName;
        if (id && id !== this.uid && !this._contacts.some(c => c.id === id)) this._contacts.push({ id, name: name || 'Usuario', sub: s.service });
      });
      if (this.isClient) {
        const favs = await this._app.favorites.list(this.uid);
        for (const id of favs) {
          if (this._contacts.some(c => c.id === id)) continue;
          const w = await this._app.workers.getById(id);
          if (w) {
            this.contactNames[id] = w.name;
            this._contacts.push({ id, name: w.name, sub: w.trade });
          }
        }
      }
    } catch (e) {
      console.warn(e);
      this._contacts = this._contacts || [];
    }
  }

  async _nameFor(id) {
    if (this.contactNames[id]) return this.contactNames[id];
    try {
      const user = await this._app.db.get(CHAMBAYA.COLLECTIONS.USERS, id);
      if (user?.nombre) { this.contactNames[id] = user.nombre; return user.nombre; }
    } catch (e) { /* sin permiso o inexistente */ }
    try {
      const w = await this._app.workers.getById(id);
      if (w?.name) { this.contactNames[id] = w.name; return w.name; }
    } catch (e) { /* ignorar */ }
    return 'Usuario de TuOficioCol';
  }

  async _renderList() {
    const host = document.getElementById('chatList');
    if (!host) return;
    if (!this.convs.length) {
      host.innerHTML = `<div class="empty-state" style="padding:28px 16px">
        <i class="fas fa-comments"></i><h3>Sin conversaciones</h3>
        <p>Inicia una desde el perfil de un técnico o desde tus trabajos.</p>
        <button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="ui._getPage('messages').openContacts()">Nueva conversación</button>
      </div>`;
      return;
    }
    const rows = await Promise.all(this.convs.map(async conv => {
      const other = conv.participants.find(p => p !== this.uid) || '';
      const name = await this._nameFor(other);
      const unread = conv.unreadFor === this.uid;
      return `<button class="chat-list-item ${this.activeOther === other ? 'active' : ''}" onclick="ui._getPage('messages').openConversation('${other}')">
        ${this._avatar(name, '#3A3A38', 40, '', 12)}
        <div class="chat-list-body">
          <div class="chat-list-name">${escapeHtml(name)}</div>
          <div class="chat-list-msg">${escapeHtml(conv.lastMessage || 'Conversación iniciada')}</div>
          <div class="chat-list-time">${timeAgo(conv.updatedAt || conv.createdAt)}</div>
        </div>
        ${unread ? '<span class="unread-dot"></span>' : ''}
      </button>`;
    }));
    if (!this._alive) return;
    host.innerHTML = rows.join('');
  }

  _renderEmptyWindow() {
    const win = document.getElementById('chatWindow');
    if (!win) return;
    win.innerHTML = `<div class="chat-empty">
      <i class="fas fa-comment-dots"></i>
      <h3>Selecciona una conversación</h3>
      <p>Habla con el técnico o el cliente para acordar horarios, materiales y detalles del servicio.</p>
      <button class="btn btn-primary" onclick="ui._getPage('messages').openContacts()"><i class="fas fa-comment"></i> Iniciar conversación</button>
    </div>`;
  }

  async openConversation(otherId) {
    if (!otherId || otherId === this.uid) return;
    this.activeOther = otherId;
    const win = document.getElementById('chatWindow');
    if (!win) return;
    const name = await this._nameFor(otherId);
    if (this._msgUnsub) { try { this._msgUnsub(); } catch (e) { /* ignorar */ } }
    win.innerHTML = `
      <div class="chat-header">
        ${this._avatar(name, '#3A3A38', 42, '', 12)}
        <div>
          <div class="chat-header-name">${escapeHtml(name)}</div>
          <div class="chat-header-status"><span class="avail-dot available"></span> Responde por mensaje</div>
        </div>
        <button class="icon-btn" title="Ver perfil" onclick="ui.viewWorker('${otherId}')"><i class="fas fa-user"></i></button>
      </div>
      <div class="chat-messages" id="chatMessages"><div class="page-loading"><span class="spinner dark"></span></div></div>
      <div class="chat-input-bar">
        <textarea class="chat-input" id="chatInput" rows="1" maxlength="800" placeholder="Escribe un mensaje..."
          onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault(); ui._getPage('messages').send();}"></textarea>
        <button class="btn btn-primary btn-icon" id="chatSend" onclick="ui._getPage('messages').send()" aria-label="Enviar"><i class="fas fa-paper-plane"></i></button>
      </div>`;
    await this._app.messages.markRead(this.uid, otherId);
    this._msgUnsub = this._app.messages.subscribeToConversation(this.uid, otherId, msgs => {
      if (!this._alive) return;
      const box = document.getElementById('chatMessages');
      if (!box) return;
      if (!msgs.length) {
        box.innerHTML = '<div class="chat-start"><i class="fas fa-hand"></i><p>Inicia la conversación. Puedes acordar la visita y el presupuesto final.</p></div>';
        return;
      }
      box.innerHTML = msgs.map(m => `<div class="msg ${m.from === this.uid ? 'sent' : 'received'}">
        <div class="msg-bubble">${escapeHtml(m.text)}</div>
        <div class="msg-time">${escapeHtml(m.time || timeAgo(m.createdAt))}</div>
      </div>`).join('');
      box.scrollTop = box.scrollHeight;
    });
    this._renderList();
  }

  async send() {
    const input = document.getElementById('chatInput');
    const text = input?.value.trim();
    if (!text || !this.activeOther) return;
    input.value = '';
    try {
      await this._app.messages.send(this.uid, this.activeOther, text);
    } catch (e) {
      this._ui.showToast(e.message, 'error');
    }
  }

  async openContacts() {
    await this._preloadNames();
    const contacts = [...(this._contacts || [])];
    if (!contacts.length) {
      this._ui.openModal(`
        <div class="modal-header">
          <div class="modal-title">Nueva conversación</div>
          <button class="modal-close" onclick="ui.closeModal()"><i class="fas fa-times"></i></button>
        </div>
        ${this._empty('fa-user-group', 'Aún no tienes contactos', 'Contrata a un técnico o envía una solicitud directa para iniciar una conversación.',
          '<button class="btn btn-primary" onclick="ui.closeModal(); ui.navigateTo(\'workers\')">Ir al directorio</button>')}`);
      return;
    }
    const unique = [];
    contacts.forEach(c => { if (!unique.some(u => u.id === c.id)) unique.push(c); });
    this._ui.openModal(`
      <div class="modal-header">
        <div class="modal-title">Nueva conversación</div>
        <button class="modal-close" onclick="ui.closeModal()"><i class="fas fa-times"></i></button>
      </div>
      <p class="modal-copy">Elige a quién quieres escribir.</p>
      <div class="contact-list">${unique.map(c => `
        <button class="contact-row" onclick="ui.closeModal(); ui._getPage('messages').openConversation('${c.id}')">
          ${this._avatar(c.name, '#3A3A38', 40, '', 12)}
          <div class="contact-body"><div class="contact-name">${escapeHtml(c.name || 'Usuario')}</div>
          <div class="contact-sub">${escapeHtml(c.sub || '')}</div></div>
          <i class="fas fa-chevron-right"></i>
        </button>`).join('')}</div>
      <div class="modal-actions"><button class="btn btn-secondary" onclick="ui.closeModal()">Cerrar</button></div>`);
  }
}

/**
 * Favoritos del cliente (RF06, RF09): perfiles guardados para contactar después.
 */
class FavoritesPage extends BasePage {
  async render(container) {
    container.innerHTML = '<div class="page-loading"><span class="spinner dark"></span></div>';
    let list = [];
    try {
      const ids = await this._app.favorites.list(this.uid);
      const rows = await Promise.all(ids.map(id => this._app.workers.getById(id).catch(() => null)));
      list = rows.filter(Boolean);
    } catch (e) {
      container.innerHTML = this._empty('fa-triangle-exclamation', 'No se pudieron cargar los favoritos', escapeHtml(e.message));
      return;
    }
    if (!this._alive) return;
    container.innerHTML = `
      ${this._header('Mis favoritos', 'Técnicos que guardaste para contactar más adelante.',
        '<button class="btn btn-primary" onclick="ui.navigateTo(\'workers\')"><i class="fas fa-search"></i> Explorar directorio</button>')}
      ${list.length
        ? `<div class="workers-grid">${list.map(w => `
            <div class="favorite-wrap">
              ${this._workerCard(w)}
              <button class="favorite-remove" title="Quitar de favoritos" onclick="ui._getPage('favorites').remove('${w.id}')"><i class="fas fa-heart-crack"></i></button>
            </div>`).join('')}</div>`
        : this._empty('fa-heart', 'Sin favoritos todavía',
          'Toca el corazón en el perfil de un técnico para guardarlo aquí y comparar opciones.',
          '<button class="btn btn-primary" onclick="ui.navigateTo(\'workers\')"><i class="fas fa-search"></i> Buscar técnicos</button>')}`;
  }

  async remove(workerId) {
    const ok = await this._ui.confirm({
      title: 'Quitar de favoritos',
      message: '¿Quieres eliminar este técnico de tu lista de favoritos?',
      confirmText: 'Quitar', danger: true,
    });
    if (!ok) return;
    await this._app.favorites.toggle(this.uid, workerId);
    this._ui.showToast('Eliminado de favoritos.', 'success');
    this._reload();
  }
}

/**
 * Mapa de zonas (RF03, RF08): densidad de técnicos por localidad y acceso al
 * directorio filtrado por zona.
 */
class MapPage extends BasePage {
  constructor(app, ui) {
    super(app, ui);
    this._map = null;
  }

  async render(container) {
    container.innerHTML = '<div class="page-loading"><span class="spinner dark"></span></div>';
    let workers = [];
    try { workers = await this._app.workers.getAll({ onlyActive: true }); } catch (e) { console.warn(e); }
    if (!this._alive) return;
    const zones = this._app.zones.density(workers);
    const total = workers.length;
    container.innerHTML = `
      ${this._header('Mapa de cobertura', `${total} técnicos activos distribuidos en ${zones.filter(z => z.count).length} localidades de Bogotá.`,
        '<button class="btn btn-primary" onclick="ui.navigateTo(\'workers\')"><i class="fas fa-list"></i> Ver directorio</button>')}
      <div class="map-layout">
        <div class="map-card">
          <div id="zoneMap" class="leaflet-host big"></div>
          <div class="map-legend"><span><span class="legend-dot available"></span> Disponibles</span><span><span class="legend-dot busy"></span> Ocupados</span><span><i class="fas fa-circle" style="color:var(--primary)"></i> Zona de cobertura</span></div>
        </div>
        <aside class="zone-list">
          <h3>Localidades</h3>
          ${zones.map(z => `<button class="zone-row" onclick="ui.navigateTo('workers', { zone: '${z.name}' })">
            <div class="zone-row-head"><strong>${escapeHtml(z.name)}</strong><span>${z.count} técnicos</span></div>
            <div class="zone-bar"><div style="width:${total ? Math.round(z.count / Math.max(...zones.map(x => x.count), 1) * 100) : 0}%"></div></div>
            <div class="zone-row-foot"><span><span class="avail-dot available"></span>${z.available} disponibles</span><i class="fas fa-arrow-right"></i></div>
          </button>`).join('')}
        </aside>
      </div>`;
    this._renderMap(workers, zones);
  }

  destroy() {
    if (this._map) { try { this._map.remove(); } catch (e) { /* ignorar */ } this._map = null; }
    super.destroy();
  }

  _renderMap(workers, zones) {
    const host = document.getElementById('zoneMap');
    if (!host) return;
    if (typeof L === 'undefined') {
      host.innerHTML = `<div class="map-fallback"><i class="fas fa-map-location-dot"></i><h3>Mapa no disponible</h3>
        <p>Sin conexión no es posible cargar OpenStreetMap. Consulta la lista de localidades.</p></div>`;
      return;
    }
    this._map = L.map('zoneMap', { scrollWheelZoom: false }).setView([4.65, -74.09], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap', maxZoom: 18,
    }).addTo(this._map);
    const max = Math.max(...zones.map(z => z.count), 1);
    zones.forEach(z => {
      if (!z.count) return;
      const radius = 900 + (z.count / max) * 1400;
      L.circle([z.lat, z.lng], {
        radius, color: '#4E7A5C', weight: 1.5, fillColor: '#4E7A5C',
        fillOpacity: .13,
      }).addTo(this._map).bindPopup(`
        <div class="map-popup">
          <div class="map-popup-name">${escapeHtml(z.name)}</div>
          <div class="map-popup-sub">${z.count} técnicos · ${z.available} disponibles</div>
          <button class="map-popup-btn" onclick="ui.navigateTo('workers', { zone: '${z.name}' })">Ver técnicos</button>
        </div>`);
    });
    const colors = { Disponible: '#3E6B4F', 'Medio tiempo': '#B8914A', Ocupado: '#A85B46' };
    const groups = {};
    workers.forEach(w => {
      if (w.lat == null || w.lng == null) return;
      const key = `${w.lat.toFixed(4)},${w.lng.toFixed(4)}`;
      groups[key] = (groups[key] || 0) + 1;
      const jitter = (groups[key] - 1) * 0.0022;
      L.circleMarker([w.lat + jitter, w.lng + jitter], {
        radius: 8, color: '#fff', weight: 2,
        fillColor: colors[w.availability] || '#3A3A38', fillOpacity: 1,
      }).addTo(this._map).bindPopup(`
        <div class="map-popup">
          <div class="map-popup-name">${escapeHtml(w.name)}</div>
          <div class="map-popup-sub">${escapeHtml(w.trade)} · ${escapeHtml(w.zone)}</div>
          <div class="map-popup-stars">${starsHtml(w.stars, 11)} ${(w.stars || 0).toFixed(1)}</div>
          <button class="map-popup-btn" onclick="ui.viewWorker('${w.id}')">Ver perfil</button>
        </div>`);
    });
    setTimeout(() => { try { this._map && this._map.invalidateSize(); } catch (e) { /* ignorar */ } }, 250);
  }
}

/**
 * Configuración de la cuenta: preferencias de notificaciones, seguridad,
 * acceso a páginas públicas y reinicio de los datos de demostración.
 */
class SettingsPage extends BasePage {
  async render(container) {
    const user = this.user;
    const prefs = user.preferencias || { notificaciones: true, contactoVisible: true };
    container.innerHTML = `
      ${this._header('Configuración', 'Administra tus preferencias, tu seguridad y los datos de la cuenta.')}
      <div class="settings-grid">
        ${this._section('Cuenta', `
          <div class="settings-row"><div><strong>Nombre</strong><p class="muted small">${escapeHtml(user.name || '')}</p></div>
            <button class="btn btn-secondary btn-sm" onclick="ui.navigateTo('profile')">Editar</button></div>
          <div class="settings-row"><div><strong>Correo</strong><p class="muted small">${escapeHtml(user.email || '')}</p></div>
            <span class="status-pill verified"><i class="fas fa-check"></i> ${user.googleAuth ? 'Google' : 'Verificado'}</span></div>
          <div class="settings-row"><div><strong>Rol</strong><p class="muted small">${this.role === 'trabajador' ? 'Trabajador' : this.role === 'admin' ? 'Administrador' : 'Empleador'}</p></div>
            <span class="role-badge ${this.role === 'trabajador' ? 'worker' : this.role === 'admin' ? 'admin' : 'client'}">${this.role === 'trabajador' ? 'Técnico' : this.role === 'admin' ? 'Admin' : 'Cliente'}</span></div>
          <div class="settings-row"><div><strong>Miembro desde</strong><p class="muted small">${formatDate(user.fechaRegistro)}</p></div></div>`)}
        ${this._section('Notificaciones', `
          <label class="settings-toggle"><div><strong>Notificaciones de actividad</strong><p class="muted small">Ofertas, mensajes, cambios de estado y reseñas.</p></div>
            <input type="checkbox" id="prefNotif" ${prefs.notificaciones !== false ? 'checked' : ''} onchange="ui._getPage('settings').savePrefs()"/></label>
          ${this.isWorker ? `<label class="settings-toggle"><div><strong>Mostrar mi contacto</strong><p class="muted small">Teléfono y WhatsApp visibles en el perfil público.</p></div>
            <input type="checkbox" id="prefContact" ${prefs.contactoVisible !== false ? 'checked' : ''} onchange="ui._getPage('settings').savePrefs()"/></label>` : ''}
          <p class="muted tiny">Las notificaciones se guardan en tu cuenta y aparecen en la campana.</p>`)}
        ${this._section('Seguridad', `
          <div class="settings-row"><div><strong>Contraseña</strong><p class="muted small">Recibe un enlace para restablecerla.</p></div>
            <button class="btn btn-secondary btn-sm" onclick="ui._getPage('settings').resetPassword(this)">Enviar enlace</button></div>
          <div class="settings-row"><div><strong>Cerrar sesión</strong><p class="muted small">Salir de este dispositivo.</p></div>
            <button class="btn btn-secondary btn-sm" onclick="ui.doLogout()">Cerrar sesión</button></div>`)}
        ${this._section('Páginas públicas', `
          <div class="settings-links">
            <a href="index.html" target="_blank"><i class="fas fa-house"></i> Página de inicio</a>
            <a href="buscar.html" target="_blank"><i class="fas fa-magnifying-glass"></i> Directorio público</a>
            ${this.isWorker ? `<a href="perfil.html?id=${encodeURIComponent(this.uid)}" target="_blank"><i class="fas fa-id-card"></i> Mi perfil público</a>` : ''}
          </div>`)}
        ${this._section('Datos de demostración', `
          <div class="notice notice-info"><i class="fas fa-flask"></i><div>
            <strong>Modo ${this.isLocal ? 'demostración local' : 'Firestore'}.</strong>
            ${this.isLocal
              ? 'Los datos se guardan en este navegador. Puedes restablecerlos al estado inicial para volver a probar todos los flujos.'
              : 'La aplicación está conectada a Firestore. Los cambios se guardan en la nube.'}
          </div></div>
          ${this.isLocal ? `<button class="btn btn-danger" style="margin-top:14px" onclick="ui._getPage('settings').resetDemo()"><i class="fas fa-rotate-left"></i> Restablecer datos de demostración</button>` : ''}`)}
      </div>`;
  }

  async savePrefs() {
    try {
      const prefs = {
        notificaciones: Boolean(document.getElementById('prefNotif')?.checked),
        contactoVisible: this.isWorker ? Boolean(document.getElementById('prefContact')?.checked) : true,
      };
      await this._app.db.update(CHAMBAYA.COLLECTIONS.USERS, this.uid, { preferencias: prefs });
      if (this.isWorker) await this._app.workers.updateProfile(this.uid, { contactoVisible: prefs.contactoVisible });
      this.user.preferencias = prefs;
      this._ui.showToast('Preferencias guardadas.', 'success');
    } catch (e) {
      this._ui.showToast(e.message, 'error');
    }
  }

  async resetPassword(btn) {
    this._setBusy(btn, true, 'Enviando...');
    try {
      await this._app.sendPasswordReset(this.user.email);
      this._ui.showToast('Enviamos el enlace de recuperación a tu correo.', 'success', 5000);
    } catch (e) {
      this._ui.showToast(e.message, 'error');
    } finally {
      this._setBusy(btn, false);
    }
  }

  async resetDemo() {
    const ok = await this._ui.confirm({
      title: 'Restablecer demostración',
      message: 'Se borrarán los cambios que hiciste en este navegador y volverán los datos de ejemplo. ¿Continuar?',
      confirmText: 'Restablecer', danger: true,
    });
    if (!ok) return;
    this._app.resetDemoData();
    this._ui.showToast('Datos restablecidos. Recargando...', 'success');
    setTimeout(() => location.reload(), 900);
  }
}
