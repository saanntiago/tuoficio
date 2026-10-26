/**
 * Clase base de las vistas de la aplicación.
 * Concentra los fragmentos de interfaz compartidos (tarjetas, estados vacíos,
 * cabeceras, insignias y acciones frecuentes) para mantener un lenguaje visual
 * coherente en todas las secciones.
 */
class BasePage {
  constructor(app, ui) {
    this._app = app;
    this._ui = ui;
    this._subs = [];
    this._alive = true;
  }

  render() { throw new Error('render() no implementado'); }

  destroy() {
    this._alive = false;
    this._subs.forEach(fn => { try { fn && fn(); } catch (e) { /* ignorar */ } });
    this._subs = [];
  }

  /* ── Sesión ─────────────────────────────────────────────── */

  get user() { return this._app.auth.currentUser || {}; }
  get uid() { return this.user.uid || this.user.id || ''; }
  get role() {
    const r = this.user.role || this.user.rol || 'cliente';
    if (r === 'worker') return 'trabajador';
    if (r === 'client') return 'cliente';
    return r;
  }
  get isWorker() { return this.role === 'trabajador'; }
  get isClient() { return this.role === 'cliente'; }
  get isAdmin() { return this.role === 'admin'; }
  get isLocal() { return this._app.mode === 'local'; }

  /* ── Cabecera / estados ─────────────────────────────────── */

  _header(title, subtitle = '', actions = '') {
    return `<div class="page-header">
      <div>
        <h1 class="page-title">${escapeHtml(title)}</h1>
        ${subtitle ? `<p class="page-subtitle">${subtitle}</p>` : ''}
      </div>
      ${actions ? `<div class="page-actions">${actions}</div>` : ''}
    </div>`;
  }

  _empty(icon, title, desc = '', action = '') {
    return `<div class="empty-state">
      <i class="fas ${icon}"></i>
      <h3>${escapeHtml(title)}</h3>
      ${desc ? `<p>${desc}</p>` : ''}
      ${action ? `<div style="margin-top:16px">${action}</div>` : ''}
    </div>`;
  }

  _statCard(icon, color, bg, value, label, foot = '') {
    return `<div class="stat-card">
      <div class="stat-icon" style="background:${bg}"><i class="fas ${icon}" style="color:${color}"></i></div>
      <div class="stat-value">${value}</div>
      <div class="stat-label">${escapeHtml(label)}</div>
      ${foot ? `<div class="stat-foot">${foot}</div>` : ''}
    </div>`;
  }

  _section(title, body, action = '', extraClass = '') {
    return `<section class="section-card ${extraClass}">
      <div class="section-head">
        <h2 class="section-title">${escapeHtml(title)}</h2>
        ${action || ''}
      </div>
      ${body}
    </section>`;
  }

  _statusPill(text, type = 'neutral') {
    const map = {
      available: 'verified', Disponible: 'verified', Aprobado: 'verified', Finalizado: 'verified',
      pendiente: 'pending', Pendiente: 'pending', 'En revisión': 'pending', en_revision: 'pending',
      rejected: 'rejected', Rechazado: 'rejected', Cancelado: 'rejected', Activo: 'active',
      Asignada: 'active', Cerrada: 'inactive', inactivo: 'inactive', Suspendido: 'rejected',
    };
    const cls = map[type] || map[text] || 'active';
    return `<span class="status-pill ${cls}">${escapeHtml(text)}</span>`;
  }

  _avatar(name, color = '#3A3A38', size = 48, url = '', radius = 14) {
    if (url) {
      return `<div class="worker-avatar" style="width:${size}px;height:${size}px;border-radius:${radius}px;background:${color};overflow:hidden">
        <img src="${escapeHtml(url)}" alt="${escapeHtml(name)}" style="width:100%;height:100%;object-fit:cover"/>
      </div>`;
    }
    return `<div class="worker-avatar" style="width:${size}px;height:${size}px;border-radius:${radius}px;background:${color};font-size:${Math.round(size * .38)}px">
      ${escapeHtml(initialsOf(name))}
    </div>`;
  }

  _workerCard(w) {
    const distance = (w.distanceKm != null && w.distanceKm < 90)
      ? `<span class="tag"><i class="fas fa-route"></i> ${w.distanceKm.toFixed(1)} km</span>` : '';
    return `<article class="worker-card" onclick="ui.viewWorker('${w.id}')">
      <div class="worker-card-header">
        ${this._avatar(w.name, w.avatarColor, 52, w.avatarUrl)}
        <div class="worker-info">
          <div class="worker-name">${escapeHtml(w.name)}</div>
          <div class="worker-trade"><i class="fas ${tradeIcon(w.trade)}"></i> ${escapeHtml(w.trade)} · ${w.experience || 0} años</div>
          ${w.badgeVerified
            ? '<span class="verified-badge"><i class="fas fa-check-circle"></i> Verificado</span>'
            : '<span class="verified-badge muted"><i class="fas fa-clock"></i> Sin verificar</span>'}
        </div>
        <span class="avail-dot ${availabilityClass(w.availability)}" title="${escapeHtml(w.availability)}"></span>
      </div>
      <div class="worker-stars">${starsHtml(w.stars)}<span>${(w.stars || 0).toFixed(1)} (${w.reviewCount || 0} reseñas)</span></div>
      <div class="worker-tags">
        <span class="tag primary">${escapeHtml(w.trade)}</span>
        <span class="tag"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(w.zone || 'Sin zona')}</span>
        ${distance}
        <span class="tag"><span class="avail-dot ${availabilityClass(w.availability)}"></span>${escapeHtml(w.availability)}</span>
      </div>
      <div class="worker-footer">
        <div class="worker-price">${formatMoney(w.visitFee)}<span> / visita</span></div>
        <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); ui.viewWorker('${w.id}')">
          Ver perfil <i class="fas fa-arrow-right"></i>
        </button>
      </div>
    </article>`;
  }

  _reviewItem(r) {
    const name = r.clientName || 'Cliente';
    return `<div class="review-item">
      <div class="review-header">
        ${this._avatar(name, r.clientColor, 36, '', 10)}
        <div>
          <div class="review-name">${escapeHtml(name)}</div>
          <div class="stars-line">${starsHtml(r.rating, 11)}</div>
        </div>
        <div class="review-date">${escapeHtml(formatDate(r.date || r.createdAt))}</div>
      </div>
      <div class="review-text">${escapeHtml(r.text || '')}</div>
    </div>`;
  }

  _jobCard(job, actions = '') {
    const done = job.estado === CHAMBAYA.JOB_STATUS.DONE;
    const active = job.estado === CHAMBAYA.JOB_STATUS.ACTIVE;
    const canReport = this._app.jobs.canReport(job, this.uid);
    return `<article class="job-card">
      <div class="job-card-head">
        <div>
          <div class="job-title">${escapeHtml(job.service || 'Servicio')}</div>
          <div class="job-sub">${escapeHtml(job.zona || '')} · ${escapeHtml(job.address || '')}</div>
        </div>
        ${this._statusPill(job.estado || 'Activo')}
      </div>
      <p class="job-desc">${escapeHtml(job.description || '')}</p>
      <div class="job-meta">
        <span><i class="fas fa-calendar"></i> ${formatDate(job.fecha)} ${escapeHtml(job.hora || '')}</span>
        <span><i class="fas fa-wallet"></i> ${formatMoney(job.presupuesto)}</span>
        <span><i class="fas fa-user"></i> ${escapeHtml((this.isClient ? job.trabajadorNombre : job.clienteNombre) || '')}</span>
      </div>
      ${done && job.finalizadoEn ? `<div class="job-note"><i class="fas fa-check-circle"></i> Finalizado ${timeAgo(job.finalizadoEn)}${canReport ? ' · puedes reportar dentro de las 24 h' : ''}</div>` : ''}
      ${active ? '<div class="job-note active"><i class="fas fa-circle-play"></i> Servicio en curso</div>' : ''}
      ${actions ? `<div class="job-actions">${actions}</div>` : ''}
    </article>`;
  }

  _reviewStars(rating) {
    return `<div class="star-input" data-value="${rating || 5}">
      ${[1, 2, 3, 4, 5].map(i => `<button type="button" class="star-btn" data-star="${i}" onclick="this.parentNode.dataset.value=${i}; this.parentNode.querySelectorAll('.star-btn').forEach((b,idx)=>b.classList.toggle('on', idx<${i}))"><i class="fas fa-star"></i></button>`).join('')}
    </div>`;
  }

  /* ── Acciones compartidas ───────────────────────────────── */

  async _openChat(otherId, otherName = '') {
    if (!otherId || otherId === this.uid) return;
    try {
      await this._app.messages.openWith(this.uid, otherId);
      this._ui.navigateTo('messages', { otherId });
      setTimeout(() => this._ui.showToast(`Conversación con ${otherName || 'el técnico'}`, 'info'), 300);
    } catch (e) {
      this._ui.showToast(e.message, 'error');
    }
  }

  async _toggleFavorite(workerId) {
    try {
      const { added } = await this._app.favorites.toggle(this.uid, workerId);
      if (added && this.isClient) {
        const me = this.user?.name || 'Un cliente';
        this._app.notif.notify({
          usuarioId: workerId,
          title: 'Tu perfil está en favoritos',
          desc: `${me} guardó tu perfil para contactarte más adelante.`,
          icon: 'fa-heart', color: '#A85B46', bg: 'rgba(168,91,70,.12)', link: 'profile',
        }).catch(() => {});
      }
      this._ui.showToast(added ? 'Agregado a favoritos' : 'Eliminado de favoritos', 'success');
      return added;
    } catch (e) {
      this._ui.showToast(e.message, 'error');
      return false;
    }
  }

  shareWorker(worker) {
    const url = publicProfileUrl(worker.id);
    const message = `Mira el perfil de ${worker.name} (${worker.trade}) en TuOficioCol: ${url}`;
    this._ui.openModal(`
      <div class="modal-header">
        <div class="modal-title">Compartir perfil</div>
        <button class="modal-close" onclick="ui.closeModal()"><i class="fas fa-times"></i></button>
      </div>
      <p class="modal-copy">Comparte el perfil público de ${escapeHtml(worker.name)} por WhatsApp o copia el enlace.</p>
      <div class="share-link"><i class="fas fa-link"></i><span id="shareUrl">${escapeHtml(url)}</span></div>
      <div class="modal-actions wrap">
        <button class="btn btn-secondary" onclick="ui.copyText('${escapeHtml(url)}')"><i class="fas fa-copy"></i> Copiar enlace</button>
        <a class="btn btn-whatsapp" href="${whatsappLink(worker.whatsapp || worker.phone, message)}" target="_blank" rel="noopener">
          <i class="fab fa-whatsapp"></i> Enviar por WhatsApp
        </a>
        <a class="btn btn-secondary" href="perfil.html?id=${encodeURIComponent(worker.id)}" target="_blank">
          <i class="fas fa-arrow-up-right-from-square"></i> Abrir perfil público
        </a>
      </div>`);
  }

  _formatRange(tarifas) {
    if (!tarifas) return 'A convenir';
    const parts = [];
    if (Number(tarifas.visitaDiagnostica) > 0) parts.push(`Visita ${formatMoney(tarifas.visitaDiagnostica)}`);
    if (Number(tarifas.horaBase) > 0) parts.push(`Hora ${formatMoney(tarifas.horaBase)}`);
    return parts.length ? parts.join(' · ') : 'A convenir';
  }

  _setBusy(btn, busy, label = '') {
    if (!btn) return;
    if (busy) {
      btn.dataset.html = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner dark"></span> ${escapeHtml(label || 'Guardando...')}`;
    } else {
      btn.disabled = false;
      if (btn.dataset.html) btn.innerHTML = btn.dataset.html;
    }
  }

  _todayIso() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }

  _reload() {
    if (this._alive) this._ui.navigateTo(this._ui._currentPage || 'dashboard');
  }
}
