/**
 * Vistas de administración (HU-13, HU-14, HU-15).
 *  - Usuarios: consulta, activación y desactivación de cuentas.
 *  - Verificaciones: revisión de documento + selfie y aprobación de insignias.
 *  - Reportes: decisión y aplicación de advertencias, suspensiones o baneos.
 *  - Trabajos: supervisión global de los servicios coordinados.
 */
class AdminUsersPage extends BasePage {
  constructor(app, ui) {
    super(app, ui);
    this.users = [];
    this.workersById = {};
    this.query = '';
    this.roleFilter = 'todos';
  }

  async render(container) {
    container.innerHTML = '<div class="page-loading"><span class="spinner dark"></span></div>';
    try {
      const [users, workers] = await Promise.all([
        this._app.db.getAll(CHAMBAYA.COLLECTIONS.USERS),
        this._app.workers.getAll(),
      ]);
      this.users = users.sort((a, b) => String(b.fechaRegistro || '').localeCompare(String(a.fechaRegistro || '')));
      this.workersById = Object.fromEntries(workers.map(w => [w.id, w]));
    } catch (e) {
      container.innerHTML = this._empty('fa-triangle-exclamation', 'No se pudieron cargar los usuarios', escapeHtml(e.message));
      return;
    }
    if (!this._alive) return;
    const active = this.users.filter(u => u.activo !== false).length;
    const verified = Object.values(this.workersById).filter(w => w.badgeVerified).length;
    container.innerHTML = `
      ${this._header('Gestión de usuarios', 'Consulta cuentas, revisa sanciones y activa o desactiva perfiles.', '')}
      <div class="stats-grid">
        ${this._statCard('fa-users', '#4E7A5C', 'rgba(78,122,92,.12)', this.users.length, 'Usuarios totales', `${this.users.filter(u => u.rol === 'trabajador').length} técnicos`)}
        ${this._statCard('fa-user-check', '#3A3A38', 'rgba(58,58,56,.1)', active, 'Cuentas activas', `${this.users.length - active} inactivas`)}
        ${this._statCard('fa-user-shield', '#B8914A', 'rgba(184,145,74,.14)', verified, 'Técnicos verificados', 'Con insignia visible')}
        ${this._statCard('fa-user-lock', '#A85B46', 'rgba(168,91,70,.12)', this.users.filter(u => u.sancion).length, 'Con sanciones', 'Advertencia o suspensión')}
      </div>
      <div class="table-toolbar">
        <div class="filter-search grow"><i class="fas fa-search"></i>
          <input type="search" placeholder="Buscar por nombre, correo o zona..." oninput="ui._getPage('admin-users').setQuery(this.value)">
        </div>
        <select class="filter-select" onchange="ui._getPage('admin-users').setRole(this.value)">
          <option value="todos">Todos los roles</option>
          <option value="trabajador">Trabajadores</option>
          <option value="cliente">Empleadores</option>
          <option value="admin">Administradores</option>
        </select>
        <select class="filter-select" onchange="ui._getPage('admin-users').setStatus(this.value)">
          <option value="todos">Todos los estados</option>
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
        </select>
      </div>
      <div class="table-card">
        <table class="admin-table">
          <thead><tr><th>Usuario</th><th>Rol</th><th>Zona / oficio</th><th>Registro</th><th>Estado</th><th>Sanción</th><th></th></tr></thead>
          <tbody id="usersTbody"></tbody>
        </table>
      </div>`;
    this._renderRows();
  }

  setQuery(value) { this.query = value.toLowerCase(); this._renderRows(); }
  setRole(value) { this.roleFilter = value; this._renderRows(); }
  setStatus(value) { this.statusFilter = value; this._renderRows(); }

  _filtered() {
    return this.users.filter(u => {
      if (this.roleFilter !== 'todos' && u.rol !== this.roleFilter) return false;
      if (this.statusFilter === 'activos' && u.activo === false) return false;
      if (this.statusFilter === 'inactivos' && u.activo !== false) return false;
      if (!this.query) return true;
      return [u.nombre, u.email, u.zona, u.oficio]
        .some(v => String(v || '').toLowerCase().includes(this.query));
    });
  }

  _renderRows() {
    const tbody = document.getElementById('usersTbody');
    if (!tbody) return;
    const list = this._filtered();
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="7">${this._empty('fa-user-slash', 'Sin resultados', 'Ajusta la búsqueda o los filtros.')}</td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(u => {
      const w = this.workersById[u.id];
      const active = u.activo !== false;
      const suspension = u.sancion?.tipo === 'suspension' && u.sancion.hasta && new Date(u.sancion.hasta).getTime() > Date.now();
      const banned = u.sancion?.tipo === 'baneo';
      return `<tr>
        <td><div class="table-user">
          ${this._avatar(u.nombre, u.avatarColor || '#3A3A38', 36, u.foto || '', 10)}
          <div><strong>${escapeHtml(u.nombre || 'Sin nombre')}</strong>
          <div class="muted tiny">${escapeHtml(u.email || '')}</div></div>
        </div></td>
        <td><span class="role-badge ${u.rol === 'trabajador' ? 'worker' : u.rol === 'admin' ? 'admin' : 'client'}">${u.rol === 'trabajador' ? 'Técnico' : u.rol === 'admin' ? 'Admin' : 'Empleador'}</span></td>
        <td><div>${escapeHtml(u.zona || '—')}</div><div class="muted tiny">${escapeHtml(w?.trade || u.oficio || '')}</div></td>
        <td>${formatDate(u.fechaRegistro)}</td>
        <td>${active ? this._statusPill('Activo', 'verified') : this._statusPill('Inactivo', 'rejected')}</td>
        <td>${banned ? this._statusPill('Baneado', 'rejected') : suspension ? this._statusPill(`Hasta ${formatDate(u.sancion.hasta)}`, 'pending') : u.sancion?.tipo === 'advertencia' ? this._statusPill('Advertencia', 'pending') : '<span class="muted tiny">—</span>'}</td>
        <td><div class="table-actions">
          <button class="icon-btn" title="Ver detalle" onclick="ui._getPage('admin-users').viewUser('${u.id}')"><i class="fas fa-eye"></i></button>
          ${u.rol === 'admin' ? '' : `<button class="icon-btn ${active ? 'danger' : 'on'}" title="${active ? 'Desactivar' : 'Activar'}" onclick="ui._getPage('admin-users').toggleActive('${u.id}', ${active})"><i class="fas ${active ? 'fa-user-slash' : 'fa-user-check'}"></i></button>`}
        </div></td>
      </tr>`;
    }).join('');
  }

  async viewUser(id) {
    const u = this.users.find(x => x.id === id);
    if (!u) return;
    const w = this.workersById[id];
    let jobs = [];
    try { jobs = await this._app.jobs.getForClient(id); } catch (e) { /* ignorar */ }
    this._ui.openModal(`
      <div class="modal-header">
        <div class="modal-title">Detalle del usuario</div>
        <button class="modal-close" onclick="ui.closeModal()"><i class="fas fa-times"></i></button>
      </div>
      <div class="profile-modal-head">
        ${this._avatar(u.nombre, u.avatarColor || '#3A3A38', 68, u.foto || '', 18)}
        <div class="profile-modal-info">
          <h2>${escapeHtml(u.nombre || 'Sin nombre')}</h2>
          <div class="muted small">${escapeHtml(u.email || '')}</div>
          <div class="worker-tags">
            <span class="role-badge ${u.rol === 'trabajador' ? 'worker' : u.rol === 'admin' ? 'admin' : 'client'}">${u.rol === 'trabajador' ? 'Técnico' : u.rol === 'admin' ? 'Admin' : 'Empleador'}</span>
            ${w?.badgeVerified ? '<span class="verified-badge"><i class="fas fa-check-circle"></i> Verificado</span>' : ''}
            ${u.activo === false ? this._statusPill('Inactivo', 'rejected') : this._statusPill('Activo', 'verified')}
          </div>
        </div>
      </div>
      <div class="detail-grid">
        <div class="detail-box"><div class="detail-label">Teléfono</div><div class="detail-value small">${escapeHtml(u.telefono || '—')}</div></div>
        <div class="detail-box"><div class="detail-label">Zona</div><div class="detail-value small">${escapeHtml(u.zona || '—')}</div></div>
        <div class="detail-box"><div class="detail-label">Oficio</div><div class="detail-value small">${escapeHtml(w?.trade || u.oficio || '—')}</div></div>
        <div class="detail-box"><div class="detail-label">Registro</div><div class="detail-value small">${formatDate(u.fechaRegistro)}</div></div>
        <div class="detail-box"><div class="detail-label">Calificación</div><div class="detail-value small">${w ? `${(w.stars || 0).toFixed(1)} (${w.reviewCount || 0})` : '—'}</div></div>
        <div class="detail-box"><div class="detail-label">Trabajos como cliente</div><div class="detail-value small">${jobs.length}</div></div>
      </div>
      ${u.sancion ? `<div class="notice notice-warning"><i class="fas fa-triangle-exclamation"></i><div>
        <strong>Sanción activa: ${escapeHtml(u.sancion.tipo)}.</strong>
        ${u.sancion.motivo ? escapeHtml(u.sancion.motivo) : ''}
        ${u.sancion.hasta ? `<br>Hasta ${formatDateTime(u.sancion.hasta)}` : ''}
      </div></div>` : ''}
      ${w?.description ? `<div class="detail-section"><h3>Sobre el técnico</h3><p class="muted small">${escapeHtml(w.description)}</p></div>` : ''}
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="ui.closeModal()">Cerrar</button>
        ${u.rol !== 'admin' ? `<button class="btn ${u.activo === false ? 'btn-primary' : 'btn-danger'}" onclick="ui.closeModal(); ui._getPage('admin-users').toggleActive('${u.id}', ${u.activo !== false})">
          <i class="fas ${u.activo === false ? 'fa-user-check' : 'fa-user-slash'}"></i> ${u.activo === false ? 'Reactivar cuenta' : 'Desactivar cuenta'}
        </button>` : ''}
      </div>`, { wide: true });
  }

  async toggleActive(id, isActive) {
    const user = this.users.find(u => u.id === id);
    if (!user) return;
    const next = !isActive;
    const ok = await this._ui.confirm({
      title: next ? 'Reactivar cuenta' : 'Desactivar cuenta',
      message: next
        ? `¿Reactivar la cuenta de ${user.nombre}? Se eliminarán las restricciones de acceso.`
        : `¿Desactivar la cuenta de ${user.nombre}? No podrá iniciar sesión ni recibir solicitudes.`,
      confirmText: next ? 'Reactivar' : 'Desactivar',
      danger: !next,
    });
    if (!ok) return;
    try {
      await this._app.db.update(CHAMBAYA.COLLECTIONS.USERS, id, {
        activo: next,
        sancion: next ? null : (user.sancion || null),
      });
      if (user.rol === 'trabajador') {
        await this._app.db.set(CHAMBAYA.COLLECTIONS.WORKERS, id, { activo: next });
      }
      this._ui.showToast(next ? 'Cuenta reactivada.' : 'Cuenta desactivada.', 'success');
      this._reload();
    } catch (e) {
      this._ui.showToast(e.message, 'error');
    }
  }
}

class AdminVerifyPage extends BasePage {
  constructor(app, ui) {
    super(app, ui);
    this.items = [];
    this.tab = 'pending';
  }

  async render(container) {
    container.innerHTML = '<div class="page-loading"><span class="spinner dark"></span></div>';
    try {
      this.items = await this._app.verifications.listAll();
    } catch (e) {
      container.innerHTML = this._empty('fa-triangle-exclamation', 'No se pudieron cargar las verificaciones', escapeHtml(e.message));
      return;
    }
    if (!this._alive) return;
    const pending = this.items.filter(v => v.estado === 'Pendiente');
    const history = this.items.filter(v => v.estado !== 'Pendiente');
    const list = this.tab === 'pending' ? pending : history;
    container.innerHTML = `
      ${this._header('Verificaciones', 'Revisa el documento de identidad y la selfie antes de otorgar la insignia de verificado.')}
      <div class="stats-grid">
        ${this._statCard('fa-hourglass-half', '#B8914A', 'rgba(184,145,74,.14)', pending.length, 'Pendientes', 'Requieren revisión')}
        ${this._statCard('fa-circle-check', '#4E7A5C', 'rgba(78,122,92,.12)', history.filter(v => v.estado === 'Aprobado').length, 'Aprobadas', 'Con insignia activa')}
        ${this._statCard('fa-circle-xmark', '#A85B46', 'rgba(168,91,70,.12)', history.filter(v => v.estado === 'Rechazado').length, 'Rechazadas', 'Con observación')}
      </div>
      <div class="tabs-bar">
        <button class="tab-btn ${this.tab === 'pending' ? 'active' : ''}" onclick="ui._getPage('admin-verify').setTab('pending')">Pendientes ${pending.length ? `<span class="tab-count">${pending.length}</span>` : ''}</button>
        <button class="tab-btn ${this.tab === 'history' ? 'active' : ''}" onclick="ui._getPage('admin-verify').setTab('history')">Historial</button>
      </div>
      <div id="verifyBody">${list.length ? `<div class="verify-grid">${list.map(v => this._card(v)).join('')}</div>`
        : this._empty('fa-circle-check', this.tab === 'pending' ? 'No hay verificaciones pendientes' : 'Sin historial',
          this.tab === 'pending' ? 'Todas las solicitudes han sido revisadas.' : 'Aún no se han procesado solicitudes.')}</div>`;
  }

  setTab(tab) {
    this.tab = tab;
    const body = document.getElementById('verifyBody');
    if (!body) return;
    const pending = this.items.filter(v => v.estado === 'Pendiente');
    const list = tab === 'pending' ? pending : this.items.filter(v => v.estado !== 'Pendiente');
    body.innerHTML = list.length ? `<div class="verify-grid">${list.map(v => this._card(v)).join('')}</div>`
      : this._empty('fa-circle-check', tab === 'pending' ? 'No hay verificaciones pendientes' : 'Sin historial',
        tab === 'pending' ? 'Todas las solicitudes han sido revisadas.' : 'Aún no se han procesado solicitudes.');
    document.querySelectorAll('.tabs-bar .tab-btn').forEach(b => b.classList.toggle('active', b.getAttribute('onclick')?.includes(`'${tab}'`)));
  }

  _card(v) {
    const pending = v.estado === 'Pendiente';
    return `<article class="verify-card">
      <div class="verify-head">
        <div>
          <h3>${escapeHtml(v.nombre || 'Trabajador')}</h3>
          <div class="muted small">${escapeHtml(v.oficio || '')} · ${v.experiencia || 0} años de experiencia</div>
        </div>
        ${this._statusPill(v.estado || 'Pendiente', pending ? 'pending' : v.estado === 'Aprobado' ? 'verified' : 'rejected')}
      </div>
      <div class="verify-docs">
        <button class="doc-thumb" onclick="ui.openImage('${String(v.documentoUrl || placeholderImage('Documento')).replace(/'/g, '%27')}', 'Documento de identidad')">
          <img src="${escapeHtml(v.documentoUrl || placeholderImage('Documento'))}" alt="Documento"/>
          <span><i class="fas fa-id-card"></i> Documento</span>
        </button>
        <button class="doc-thumb" onclick="ui.openImage('${String(v.selfieUrl || placeholderImage('Selfie')).replace(/'/g, '%27')}', 'Foto del rostro')">
          <img src="${escapeHtml(v.selfieUrl || placeholderImage('Selfie'))}" alt="Selfie"/>
          <span><i class="fas fa-user"></i> Selfie</span>
        </button>
      </div>
      <div class="verify-meta">
        <div><span>Tipo de documento</span><strong>${escapeHtml(v.tipoDocumento || '—')}</strong></div>
        <div><span>Número</span><strong>${escapeHtml(v.numeroDocumento || '—')}</strong></div>
        <div><span>Solicitud</span><strong>${timeAgo(v.createdAt)}</strong></div>
      </div>
      ${v.certificados ? `<div class="verify-certs"><i class="fas fa-certificate"></i> ${escapeHtml(v.certificados)}</div>` : ''}
      ${v.observacion ? `<div class="notice notice-info"><i class="fas fa-circle-info"></i><div>${escapeHtml(v.observacion)}</div></div>` : ''}
      ${pending ? `<div class="verify-actions">
        <button class="btn btn-secondary danger-text" onclick="ui._getPage('admin-verify').openDecision('${v.id}', 'reject')"><i class="fas fa-xmark"></i> Rechazar</button>
        <button class="btn btn-primary" onclick="ui._getPage('admin-verify').openDecision('${v.id}', 'approve')"><i class="fas fa-check"></i> Aprobar y otorgar insignia</button>
      </div>` : `<div class="verify-resolved">Revisado por ${escapeHtml(v.revisadoPor || 'administración')} ${v.revisadoEn ? `· ${timeAgo(v.revisadoEn)}` : ''}</div>`}
    </article>`;
  }

  openDecision(id, action) {
    const v = this.items.find(x => x.id === id);
    if (!v) return;
    const approve = action === 'approve';
    this._ui.openModal(`
      <div class="modal-header">
        <div class="modal-title">${approve ? 'Aprobar verificación' : 'Rechazar verificación'}</div>
        <button class="modal-close" onclick="ui.closeModal()"><i class="fas fa-times"></i></button>
      </div>
      <p class="modal-copy">${approve
        ? `Al aprobar, ${escapeHtml(v.nombre)} recibirá la insignia de verificado en su perfil, en el directorio y en su perfil público.`
        : `Indica a ${escapeHtml(v.nombre)} por qué no se aprueba la solicitud. Podrá corregir los documentos y volver a intentarlo.`}</p>
      <div class="form-group"><label>Observación ${approve ? '(opcional)' : '*'}</label>
        <textarea class="form-input" id="decisionNote" rows="3" placeholder="${approve ? 'Ej.: Documento legible y coincidente.' : 'Ej.: La selfie no permite ver el rostro con claridad.'}"></textarea>
      </div>
      <div class="form-error" id="decisionError" style="display:none"></div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="ui.closeModal()">Cancelar</button>
        <button class="btn ${approve ? 'btn-primary' : 'btn-danger'}" id="decisionBtn" onclick="ui._getPage('admin-verify').decide('${v.id}', ${approve}, this)">
          <i class="fas ${approve ? 'fa-check' : 'fa-xmark'}"></i> ${approve ? 'Aprobar' : 'Rechazar'}
        </button>
      </div>`);
  }

  async decide(id, approve, btn) {
    const note = document.getElementById('decisionNote').value.trim();
    if (!approve && !note) {
      const err = document.getElementById('decisionError');
      if (err) { err.textContent = 'Escribe una observación para el trabajador.'; err.style.display = 'block'; }
      return;
    }
    const v = this.items.find(x => x.id === id);
    this._setBusy(btn, true, 'Procesando...');
    try {
      if (approve) await this._app.verifications.approve(id, this.user.name, note);
      else await this._app.verifications.reject(id, this.user.name, note);
      if (v) {
        await this._app.notif.notify({
          usuarioId: v.trabajadorId,
          title: approve ? '¡Perfil verificado!' : 'Verificación rechazada',
          desc: approve
            ? 'Tu insignia de verificado ya está activa en tu perfil y en el directorio.'
            : `Tu solicitud no fue aprobada. ${note}`,
          icon: approve ? 'fa-circle-check' : 'fa-circle-xmark',
          color: approve ? '#4E7A5C' : '#A85B46',
          bg: approve ? 'rgba(78,122,92,.12)' : 'rgba(168,91,70,.12)',
          link: 'profile',
        });
      }
      this._ui.closeModal();
      this._ui.showToast(approve ? 'Verificación aprobada. Insignia otorgada.' : 'Solicitud rechazada y notificada.', 'success', 4500);
      this._reload();
    } catch (e) {
      this._ui.showToast(e.message, 'error');
    } finally {
      this._setBusy(btn, false);
    }
  }
}

class AdminReportsPage extends BasePage {
  constructor(app, ui) {
    super(app, ui);
    this.items = [];
    this.tab = 'pending';
  }

  async render(container) {
    container.innerHTML = '<div class="page-loading"><span class="spinner dark"></span></div>';
    try {
      this.items = await this._app.reports.listAll();
    } catch (e) {
      container.innerHTML = this._empty('fa-triangle-exclamation', 'No se pudieron cargar los reportes', escapeHtml(e.message));
      return;
    }
    if (!this._alive) return;
    const pending = this.items.filter(r => r.estado === 'Pendiente');
    const resolved = this.items.filter(r => r.estado !== 'Pendiente');
    const list = this.tab === 'pending' ? pending : resolved;
    container.innerHTML = `
      ${this._header('Reportes de usuarios', 'Revisa los casos reportados y aplica advertencias, suspensiones o baneos cuando corresponda.')}
      <div class="stats-grid">
        ${this._statCard('fa-flag', '#A85B46', 'rgba(168,91,70,.12)', pending.length, 'Reportes pendientes', 'Sin resolver')}
        ${this._statCard('fa-scale-balanced', '#B8914A', 'rgba(184,145,74,.14)', resolved.length, 'Casos resueltos', 'Con decisión')}
        ${this._statCard('fa-ban', '#3A3A38', 'rgba(58,58,56,.1)', resolved.filter(r => r.sancion && r.sancion.tipo !== 'ninguna').length, 'Sanciones aplicadas', 'Advertencia o más')}
      </div>
      <div class="tabs-bar">
        <button class="tab-btn ${this.tab === 'pending' ? 'active' : ''}" onclick="ui._getPage('admin-reports').setTab('pending')">Pendientes ${pending.length ? `<span class="tab-count">${pending.length}</span>` : ''}</button>
        <button class="tab-btn ${this.tab === 'history' ? 'active' : ''}" onclick="ui._getPage('admin-reports').setTab('history')">Historial</button>
      </div>
      <div id="reportsBody">${list.length ? `<div class="report-list">${list.map(r => this._card(r)).join('')}</div>`
        : this._empty('fa-flag', this.tab === 'pending' ? 'No hay reportes pendientes' : 'Sin historial',
          this.tab === 'pending' ? 'La comunidad está al día.' : 'Aún no se han resuelto reportes.')}</div>`;
  }

  setTab(tab) {
    this.tab = tab;
    const body = document.getElementById('reportsBody');
    if (!body) return;
    const list = tab === 'pending' ? this.items.filter(r => r.estado === 'Pendiente') : this.items.filter(r => r.estado !== 'Pendiente');
    body.innerHTML = list.length ? `<div class="report-list">${list.map(r => this._card(r)).join('')}</div>`
      : this._empty('fa-flag', tab === 'pending' ? 'No hay reportes pendientes' : 'Sin historial',
        tab === 'pending' ? 'La comunidad está al día.' : 'Aún no se han resuelto reportes.');
    document.querySelectorAll('.tabs-bar .tab-btn').forEach(b => b.classList.toggle('active', b.getAttribute('onclick')?.includes(`'${tab}'`)));
  }

  _card(r) {
    return `<article class="report-card ${r.estado === 'Pendiente' ? 'open' : ''}">
      <div class="report-head">
        <div class="report-icon"><i class="fas fa-flag"></i></div>
        <div class="report-head-body">
          <h3>${escapeHtml(r.motivo || 'Reporte')}</h3>
          <div class="muted small">${timeAgo(r.createdAt)} · ${escapeHtml(r.reportanteNombre || 'Usuario')} reportó a ${escapeHtml(r.reportadoNombre || 'Usuario')}</div>
        </div>
        ${this._statusPill(r.estado || 'Pendiente', r.estado === 'Pendiente' ? 'pending' : r.estado === 'Resuelto' ? 'verified' : 'inactive')}
      </div>
      <p class="report-detail">${escapeHtml(r.detalle || '')}</p>
      <div class="report-meta">
        <span><i class="fas fa-user"></i> Reportante: ${escapeHtml(r.reportanteRol || '')}</span>
        <span><i class="fas fa-user-tag"></i> Reportado: ${escapeHtml(r.reportadoRol || '')}</span>
        ${r.trabajoId ? `<span><i class="fas fa-briefcase"></i> Trabajo ${escapeHtml(r.trabajoId)}</span>` : ''}
      </div>
      ${r.estado !== 'Pendiente' ? `<div class="report-resolution">
        <strong>${escapeHtml(r.estado)}</strong>
        ${r.sancion ? `<span class="status-pill rejected">Sanción: ${escapeHtml(r.sancion.tipo)}${r.sancion.dias ? ` · ${r.sancion.dias} días` : ''}</span>` : '<span class="status-pill active">Sin sanción</span>'}
        ${r.observacion ? `<p class="muted small">${escapeHtml(r.observacion)}</p>` : ''}
        <span class="muted tiny">Resuelto por ${escapeHtml(r.resueltoPor || 'administración')} ${r.resueltoEn ? `· ${timeAgo(r.resueltoEn)}` : ''}</span>
      </div>` : `<div class="report-actions">
        <button class="btn btn-secondary btn-sm" onclick="ui._getPage('admin-reports').openResolve('${r.id}', false)">Descartar</button>
        <button class="btn btn-primary btn-sm" onclick="ui._getPage('admin-reports').openResolve('${r.id}', true)"><i class="fas fa-scale-balanced"></i> Resolver y sancionar</button>
      </div>`}
    </article>`;
  }

  openResolve(id, sanction) {
    const r = this.items.find(x => x.id === id);
    if (!r) return;
    this._ui.openModal(`
      <div class="modal-header">
        <div class="modal-title">${sanction ? 'Resolver con sanción' : 'Descartar reporte'}</div>
        <button class="modal-close" onclick="ui.closeModal()"><i class="fas fa-times"></i></button>
      </div>
      <div class="report-target">
        <strong>${escapeHtml(r.reportadoNombre || 'Usuario reportado')}</strong>
        <span class="muted small">${escapeHtml(r.motivo || '')}</span>
      </div>
      ${sanction ? `<div class="form-row">
        <div class="form-group"><label>Tipo de sanción</label>
          <select class="form-input" id="sanctionType" onchange="ui._getPage('admin-reports').toggleDays()">
            <option value="advertencia">Advertencia</option>
            <option value="suspension">Suspensión temporal</option>
            <option value="baneo">Baneo permanente</option>
          </select>
        </div>
        <div class="form-group" id="daysGroup"><label>Días de suspensión</label><input class="form-input" id="sanctionDays" type="number" min="1" max="365" value="7"></div>
      </div>` : ''}
      <div class="form-group"><label>Observación ${sanction ? '' : '(opcional)'}</label>
        <textarea class="form-input" id="resolveNote" rows="3" placeholder="Explica la decisión para el historial..."></textarea>
      </div>
      <div class="notice ${sanction ? 'notice-warning' : 'notice-info'}"><i class="fas fa-circle-info"></i><div>
        ${sanction ? 'La sanción se aplica de inmediato y se notifica al usuario reportado. Un baneo desactiva su cuenta y su perfil de trabajador.' : 'El reporte se marcará como descartado sin sanción.'}
      </div></div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="ui.closeModal()">Cancelar</button>
        <button class="btn ${sanction ? 'btn-danger' : 'btn-primary'}" id="resolveBtn" onclick="ui._getPage('admin-reports').resolve('${id}', ${sanction}, this)">
          <i class="fas ${sanction ? 'fa-gavel' : 'fa-check'}"></i> ${sanction ? 'Aplicar sanción' : 'Descartar reporte'}
        </button>
      </div>`);
    this.toggleDays();
  }

  toggleDays() {
    const type = document.getElementById('sanctionType')?.value;
    const group = document.getElementById('daysGroup');
    if (group) group.style.display = type === 'suspension' ? 'block' : 'none';
  }

  async resolve(id, sanction, btn) {
    const r = this.items.find(x => x.id === id);
    if (!r) return;
    const note = document.getElementById('resolveNote').value.trim();
    const sancionTipo = sanction ? document.getElementById('sanctionType').value : 'ninguna';
    const dias = sanction && sancionTipo === 'suspension' ? Number(document.getElementById('sanctionDays').value) || 7 : 0;
    const ok = await this._ui.confirm({
      title: sanction ? 'Aplicar sanción' : 'Descartar reporte',
      message: sanction
        ? `Se aplicará ${sancionTipo}${sancionTipo === 'suspension' ? ` por ${dias} días` : ''} a ${r.reportadoNombre}.`
        : `El reporte contra ${r.reportadoNombre} se cerrará sin sanción.`,
      confirmText: sanction ? 'Aplicar' : 'Descartar',
      danger: sanction,
    });
    if (!ok) return;
    this._setBusy(btn, true, 'Aplicando...');
    try {
      await this._app.reports.resolve(id, {
        estado: sanction ? 'Resuelto' : 'Descartado',
        sancionTipo,
        dias,
        observacion: note,
        adminName: this.user.name,
      });
      if (sanction && sancionTipo !== 'ninguna') {
        await this._app.reports.sanction(r.reportadoId, sancionTipo, dias, r.motivo);
      }
      await this._app.notif.notify({
        usuarioId: r.reportadoId,
        title: sanction ? 'Se aplicó una sanción a tu cuenta' : 'Reporte cerrado',
        desc: sanction
          ? `Motivo: ${r.motivo}. ${note || (sancionTipo === 'baneo' ? 'Tu cuenta fue desactivada.' : 'Revisa las normas de la comunidad.')}`
          : 'El reporte en tu contra fue revisado y cerrado sin sanción.',
        icon: sanction ? 'fa-gavel' : 'fa-circle-check',
        color: sanction ? '#A85B46' : '#4E7A5C',
        bg: sanction ? 'rgba(168,91,70,.12)' : 'rgba(78,122,92,.12)',
        link: 'settings',
      });
      if (r.reportanteId) {
        await this._app.notif.notify({
          usuarioId: r.reportanteId,
          title: 'Tu reporte fue resuelto',
          desc: sanction ? 'Se aplicó una sanción al usuario reportado. Gracias por cuidar la comunidad.' : 'El caso fue revisado y cerrado.',
          icon: 'fa-scale-balanced', color: '#3A3A38', bg: 'rgba(58,58,56,.1)', link: 'jobs',
        });
      }
      this._ui.closeModal();
      this._ui.showToast(sanction ? 'Sanción aplicada y usuarios notificados.' : 'Reporte descartado.', 'success', 4500);
      this._reload();
    } catch (e) {
      this._ui.showToast(e.message, 'error');
    } finally {
      this._setBusy(btn, false);
    }
  }
}

/** La supervisión de trabajos comparte la vista de administración de JobsPage. */
class AdminJobsPage extends JobsPage {}
