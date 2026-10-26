/**
 * Mis trabajos (RF11, RF12, RF13).
 * El técnico marca el servicio como finalizado; solo entonces el cliente puede
 * publicar una reseña. Cliente y técnico pueden reportar durante el servicio o
 * dentro de las 24 horas posteriores.
 */
class JobsPage extends BasePage {
  constructor(app, ui) {
    super(app, ui);
    this.jobs = [];
    this.tab = 'active';
    this.reviewsByJob = {};
    this.workerNames = {};
  }

  async render(container) {
    container.innerHTML = '<div class="page-loading"><span class="spinner dark"></span></div>';
    try {
      if (this.isAdmin) {
        this.jobs = await this._app.db.getAll(CHAMBAYA.COLLECTIONS.JOBS);
        this.jobs.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
      } else if (this.isWorker) {
        this.jobs = await this._app.jobs.getForWorker(this.uid);
      } else {
        this.jobs = await this._app.jobs.getForClient(this.uid);
      }
      await this._loadReviews();
    } catch (e) {
      container.innerHTML = this._empty('fa-triangle-exclamation', 'No se pudieron cargar los trabajos', escapeHtml(e.message));
      return;
    }
    if (!this._alive) return;
    container.innerHTML = this.isAdmin ? this._adminView() : this._view();
  }

  async _loadReviews() {
    this.reviewsByJob = {};
    const workerIds = [...new Set(this.jobs.map(j => j.trabajadorId).filter(Boolean))];
    const lists = await Promise.all(workerIds.map(id => this._app.workers.getReviewsByWorker(id).catch(() => [])));
    lists.flat().forEach(r => {
      if (r.trabajoId) this.reviewsByJob[r.trabajoId] = r;
    });
  }

  _view() {
    const active = this.jobs.filter(j => j.estado === CHAMBAYA.JOB_STATUS.ACTIVE);
    const done = this.jobs.filter(j => j.estado === CHAMBAYA.JOB_STATUS.DONE);
    const cancelled = this.jobs.filter(j => j.estado === CHAMBAYA.JOB_STATUS.CANCELLED);
    const pendingReviews = this.isClient ? done.filter(j => this._app.jobs.canReview(j, this.uid) && !this.reviewsByJob[j.id]) : [];
    const filtered = this.tab === 'active' ? active
      : this.tab === 'done' ? done
        : this.tab === 'cancelled' ? cancelled
          : this.jobs;

    return `
      ${this._header('Mis trabajos', this.isWorker
        ? 'Marca los servicios como finalizados cuando termines. Los clientes podrán calificarte solo después de esa confirmación.'
        : 'Sigue el estado de tus servicios. Cuando el técnico los finalice podrás calificar y, si algo falla, reportar dentro de las 24 h.',
        this.isWorker ? `<button class="btn btn-secondary" onclick="ui.navigateTo('quotes')"><i class="fas fa-briefcase"></i> Buscar más trabajos</button>` : `<button class="btn btn-primary" onclick="ui.navigateTo('workers')"><i class="fas fa-search"></i> Buscar técnico</button>`)}
      ${pendingReviews.length ? `<div class="notice notice-warning">
        <i class="fas fa-star"></i>
        <div><strong>${pendingReviews.length} servicio${pendingReviews.length > 1 ? 's' : ''} esperando tu reseña.</strong>
        Tu opinión ayuda a otros empleadores a elegir mejor.</div>
      </div>` : ''}
      <div class="stats-grid">
        ${this._statCard('fa-circle-play', '#4E7A5C', 'rgba(78,122,92,.12)', active.length, 'En curso', 'Servicios activos')}
        ${this._statCard('fa-circle-check', '#3A3A38', 'rgba(58,58,56,.1)', done.length, 'Finalizados', 'Con reseña disponible')}
        ${this._statCard('fa-star', '#B8914A', 'rgba(184,145,74,.14)', done.filter(j => this.reviewsByJob[j.id] || j.resenaId).length, 'Calificados', 'Reseñas publicadas')}
        ${this._statCard('fa-ban', '#A85B46', 'rgba(168,91,70,.12)', cancelled.length, 'Cancelados', 'Historial')}
      </div>
      <div class="tabs-bar">
        <button class="tab-btn ${this.tab === 'active' ? 'active' : ''}" onclick="ui._getPage('jobs').setTab('active')">En curso ${active.length ? `<span class="tab-count">${active.length}</span>` : ''}</button>
        <button class="tab-btn ${this.tab === 'done' ? 'active' : ''}" onclick="ui._getPage('jobs').setTab('done')">Finalizados ${pendingReviews.length ? `<span class="tab-count">${pendingReviews.length}</span>` : ''}</button>
        <button class="tab-btn ${this.tab === 'cancelled' ? 'active' : ''}" onclick="ui._getPage('jobs').setTab('cancelled')">Cancelados</button>
        <button class="tab-btn ${this.tab === 'all' ? 'active' : ''}" onclick="ui._getPage('jobs').setTab('all')">Todos</button>
      </div>
      <div id="jobsTabBody">${this._renderJobs(filtered)}</div>`;
  }

  _renderJobs(list) {
    if (!list.length) {
      const msg = this.tab === 'active' ? 'No tienes trabajos en curso.'
        : this.tab === 'done' ? 'Aún no hay trabajos finalizados.'
          : this.tab === 'cancelled' ? 'No hay trabajos cancelados.' : 'Todavía no tienes trabajos.';
      return this._empty('fa-clipboard', msg,
        this.isWorker ? 'Postúlate a una solicitud cercana para conseguir tu primer trabajo.' : 'Contrata a un técnico desde el directorio o publica una solicitud.',
        `<button class="btn btn-primary" onclick="ui.navigateTo('${this.isWorker ? 'quotes' : 'workers'}')">${this.isWorker ? 'Ver solicitudes' : 'Buscar técnico'}</button>`);
    }
    return `<div class="jobs-list">${list.map(job => {
      const review = this.reviewsByJob[job.id];
      const canReview = this.isClient && this._app.jobs.canReview(job, this.uid) && !review;
      const canReport = this._app.jobs.canReport(job, this.uid);
      const active = job.estado === CHAMBAYA.JOB_STATUS.ACTIVE;
      const done = job.estado === CHAMBAYA.JOB_STATUS.DONE;
      const actions = [];
      if (active && this.isWorker) actions.push(`<button class="btn btn-sm btn-primary" onclick="ui._getPage('jobs').finish('${job.id}', this)"><i class="fas fa-check"></i> Marcar finalizado</button>`);
      if (active && !this.isAdmin) actions.push(`<button class="btn btn-sm btn-secondary" onclick="ui._getPage('jobs').cancel('${job.id}', this)">Cancelar</button>`);
      if (canReview) actions.push(`<button class="btn btn-sm btn-primary" onclick="ui._getPage('jobs').openReview('${job.id}')"><i class="fas fa-star"></i> Calificar servicio</button>`);
      if (review) actions.push(`<button class="btn btn-sm btn-secondary" onclick="ui._getPage('jobs').openReview('${job.id}', true)"><i class="fas fa-star"></i> Ver mi reseña</button>`);
      if (canReport) actions.push(`<button class="btn btn-sm btn-secondary danger-text" onclick="ui._getPage('jobs').openReport('${job.id}')"><i class="fas fa-flag"></i> Reportar</button>`);
      if (done && !canReport && !review) actions.push('<span class="muted tiny"><i class="fas fa-lock"></i> Ventana de reporte cerrada</span>');
      return this._jobCard(job, actions.join(''));
    }).join('')}</div>`;
  }

  setTab(tab) {
    this.tab = tab;
    const list = tab === 'active' ? this.jobs.filter(j => j.estado === CHAMBAYA.JOB_STATUS.ACTIVE)
      : tab === 'done' ? this.jobs.filter(j => j.estado === CHAMBAYA.JOB_STATUS.DONE)
        : tab === 'cancelled' ? this.jobs.filter(j => j.estado === CHAMBAYA.JOB_STATUS.CANCELLED)
          : this.jobs;
    const body = document.getElementById('jobsTabBody');
    if (body) body.innerHTML = this._renderJobs(list);
    document.querySelectorAll('.tabs-bar .tab-btn').forEach(b => b.classList.toggle('active', b.getAttribute('onclick')?.includes(`'${tab}'`)));
  }

  async finish(jobId, btn) {
    const ok = await this._ui.confirm({
      title: 'Marcar trabajo finalizado',
      message: 'Confirma que terminaste el servicio. A partir de este momento el cliente podrá publicar una reseña y ambos tendrán 24 horas para reportar cualquier problema.',
      confirmText: 'Sí, finalizar',
    });
    if (!ok) return;
    this._setBusy(btn, true, 'Finalizando...');
    try {
      const job = await this._app.jobs.finish(jobId);
      await this._app.notif.notify({
        usuarioId: job.clientId,
        title: 'Servicio finalizado',
        desc: `${job.trabajadorNombre || 'El técnico'} finalizó ${job.service}. Ya puedes calificar el trabajo.`,
        icon: 'fa-circle-check', color: '#4E7A5C', bg: 'rgba(78,122,92,.12)', link: 'jobs',
      });
      this._ui.showToast('Trabajo finalizado. El cliente ya puede calificarte.', 'success', 4500);
      this._reload();
    } catch (e) {
      this._ui.showToast(e.message, 'error');
    } finally {
      this._setBusy(btn, false);
    }
  }

  async cancel(jobId, btn) {
    const ok = await this._ui.confirm({
      title: 'Cancelar trabajo',
      message: '¿Cancelar este servicio? Ambas partes verán el trabajo como cancelado y no se podrá calificar.',
      confirmText: 'Cancelar trabajo', danger: true,
    });
    if (!ok) return;
    this._setBusy(btn, true, 'Cancelando...');
    try {
      const job = await this._app.jobs.getById(jobId);
      await this._app.jobs.cancel(jobId, 'Cancelado por el usuario');
      const other = this.isWorker ? job.clientId : job.trabajadorId;
      if (other) {
        await this._app.notif.notify({
          usuarioId: other,
          title: 'Servicio cancelado',
          desc: `El trabajo de ${job.service} fue cancelado.`,
          icon: 'fa-ban', color: '#A85B46', bg: 'rgba(168,91,70,.12)', link: 'jobs',
        });
      }
      this._ui.showToast('Trabajo cancelado.', 'success');
      this._reload();
    } catch (e) {
      this._ui.showToast(e.message, 'error');
    } finally {
      this._setBusy(btn, false);
    }
  }

  /* ── Reseñas (RF11) ─────────────────────────────────────── */

  openReview(jobId, readOnly = false) {
    const job = this.jobs.find(j => j.id === jobId);
    if (!job) return;
    const review = this.reviewsByJob[jobId];
    if (!readOnly && job.estado !== CHAMBAYA.JOB_STATUS.DONE) {
      return this._ui.showToast('Solo puedes calificar cuando el trabajo está finalizado.', 'error');
    }
    if (readOnly && review) {
      this._ui.openModal(`
        <div class="modal-header">
          <div class="modal-title">Mi reseña</div>
          <button class="modal-close" onclick="ui.closeModal()"><i class="fas fa-times"></i></button>
        </div>
        <div class="review-summary">
          <div class="stars-line">${starsHtml(review.rating, 18)}</div>
          <p>${escapeHtml(review.text)}</p>
          <span class="muted small">Publicada el ${formatDate(review.date || review.createdAt)}</span>
        </div>
        <div class="modal-actions"><button class="btn btn-secondary" onclick="ui.closeModal()">Cerrar</button></div>`);
      return;
    }
    this._ui.openModal(`
      <div class="modal-header">
        <div class="modal-title">Calificar servicio</div>
        <button class="modal-close" onclick="ui.closeModal()"><i class="fas fa-times"></i></button>
      </div>
      <div class="review-job-context">
        <strong>${escapeHtml(job.service)} · ${escapeHtml(job.zona || '')}</strong>
        <span class="muted small">${escapeHtml(job.trabajadorNombre || '')} · ${formatDate(job.fecha)}</span>
      </div>
      <div class="form-group">
        <label>¿Cómo fue tu experiencia?</label>
        <div class="star-input" id="starInput" data-value="5">
          ${[1, 2, 3, 4, 5].map(i => `<button type="button" class="star-btn on" onclick="ui._getPage('jobs').setStars(${i})"><i class="fas fa-star"></i></button>`).join('')}
        </div>
        <div class="rating-label" id="ratingLabel">Excelente</div>
      </div>
      <div class="form-group"><label>Cuéntanos sobre el trabajo *</label>
        <textarea class="form-input" id="reviewText" rows="4" maxlength="500" placeholder="Puntualidad, calidad del trabajo, trato..."></textarea>
      </div>
      <div class="notice notice-info"><i class="fas fa-circle-info"></i><div>La reseña quedará visible en el perfil público del técnico. Solo se permite una reseña por trabajo.</div></div>
      <div class="form-error" id="reviewError" style="display:none"></div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="ui.closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="reviewSubmit" onclick="ui._getPage('jobs').submitReview('${job.id}', this)"><i class="fas fa-star"></i> Publicar reseña</button>
      </div>`);
  }

  setStars(value) {
    const box = document.getElementById('starInput');
    if (!box) return;
    box.dataset.value = value;
    box.querySelectorAll('.star-btn').forEach((b, i) => b.classList.toggle('on', i < value));
    const labels = { 1: 'Muy malo', 2: 'Malo', 3: 'Regular', 4: 'Bueno', 5: 'Excelente' };
    const label = document.getElementById('ratingLabel');
    if (label) label.textContent = labels[value] || '';
  }

  async submitReview(jobId, btn) {
    const err = document.getElementById('reviewError');
    const fail = msg => { if (err) { err.textContent = msg; err.style.display = 'block'; } this._ui.showToast(msg, 'error'); };
    const job = await this._app.jobs.getById(jobId);
    if (!job) return fail('El trabajo no existe.');
    if (!this._app.jobs.canReview(job, this.uid) || this.reviewsByJob[jobId]) return fail('Este trabajo ya fue calificado.');
    const rating = Number(document.getElementById('starInput')?.dataset.value) || 5;
    const text = document.getElementById('reviewText').value.trim();
    if (text.length < 10) return fail('Escribe al menos 10 caracteres sobre el servicio.');
    this._setBusy(btn, true, 'Publicando...');
    try {
      const id = await this._app.workers.addReview({
        workerId: job.trabajadorId,
        clientId: this.uid,
        clientName: this.user.name,
        clientColor: this.user.avatarColor,
        rating,
        text,
        trabajoId: job.id,
      });
      await this._app.jobs.markReviewed(job.id, id);
      await this._app.notif.notify({
        usuarioId: job.trabajadorId,
        title: 'Nueva reseña recibida',
        desc: `${this.user.name} calificó tu servicio de ${job.service} con ${rating} estrellas.`,
        icon: 'fa-star', color: '#B8914A', bg: 'rgba(184,145,74,.16)', link: 'profile',
      });
      this._ui.closeModal();
      this._ui.showToast('¡Gracias! Tu reseña ya es visible en el perfil del técnico.', 'success', 5000);
      this._reload();
    } catch (e) {
      fail(e.message || 'No se pudo publicar la reseña.');
    } finally {
      this._setBusy(btn, false);
    }
  }

  /* ── Reportes (RF13 / HU-16 / HU-17) ────────────────────── */

  openReport(jobId) {
    const job = this.jobs.find(j => j.id === jobId);
    if (!job) return;
    if (!this._app.jobs.canReport(job, this.uid)) {
      return this._ui.showToast('Solo puedes reportar durante el servicio o dentro de las 24 horas posteriores a su finalización.', 'error', 5500);
    }
    const role = this.isWorker ? 'cliente' : 'trabajador';
    this._ui.openModal(`
      <div class="modal-header">
        <div class="modal-title">Reportar ${role === 'cliente' ? 'al cliente' : 'al técnico'}</div>
        <button class="modal-close" onclick="ui.closeModal()"><i class="fas fa-times"></i></button>
      </div>
      <div class="notice notice-warning"><i class="fas fa-clock"></i><div>${job.estado === CHAMBAYA.JOB_STATUS.ACTIVE
        ? 'El servicio está activo. Puedes reportar ahora.'
        : `El servicio finalizó ${timeAgo(job.finalizadoEn)}. La ventana de reporte es de 24 horas.`}</div></div>
      <div class="form-group"><label>Motivo *</label>
        <select class="form-input" id="reportReason">${CHAMBAYA.REPORT_REASONS.map(r => `<option>${r}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label>Descripción de los hechos *</label>
        <textarea class="form-input" id="reportDetail" rows="4" maxlength="600" placeholder="Explica qué ocurrió con el mayor detalle posible..."></textarea>
      </div>
      <div class="notice notice-info"><i class="fas fa-shield-halved"></i><div>Un administrador revisará el reporte y podrá advertir, suspender o banear al usuario. Los reportes falsos también pueden sancionarse.</div></div>
      <div class="form-error" id="reportError" style="display:none"></div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="ui.closeModal()">Cancelar</button>
        <button class="btn btn-danger" id="reportSubmit" onclick="ui._getPage('jobs').submitReport('${job.id}', this)"><i class="fas fa-flag"></i> Enviar reporte</button>
      </div>`);
  }

  async submitReport(jobId, btn) {
    const err = document.getElementById('reportError');
    const fail = msg => { if (err) { err.textContent = msg; err.style.display = 'block'; } this._ui.showToast(msg, 'error'); };
    const job = await this._app.jobs.getById(jobId);
    if (!job) return fail('El trabajo no existe.');
    if (!this._app.jobs.canReport(job, this.uid)) return fail('La ventana de reporte ya cerró.');
    const motivo = document.getElementById('reportReason').value;
    const detalle = document.getElementById('reportDetail').value.trim();
    if (detalle.length < 15) return fail('Describe los hechos con al menos 15 caracteres.');
    this._setBusy(btn, true, 'Enviando...');
    try {
      const isReporterWorker = this.isWorker;
      await this._app.reports.create({
        reportanteId: this.uid,
        reportanteRol: isReporterWorker ? 'trabajador' : 'cliente',
        reportanteNombre: this.user.name,
        reportadoId: isReporterWorker ? job.clientId : job.trabajadorId,
        reportadoRol: isReporterWorker ? 'cliente' : 'trabajador',
        reportadoNombre: isReporterWorker ? job.clienteNombre : job.trabajadorNombre,
        trabajoId: job.id,
        motivo,
        detalle,
      });
      await this._app.notifyAdmins({
        title: 'Nuevo reporte',
        desc: `${this.user.name} reportó a ${isReporterWorker ? job.clienteNombre : job.trabajadorNombre}: ${motivo}.`,
        icon: 'fa-flag', color: '#A85B46', bg: 'rgba(168,91,70,.12)', link: 'admin-reports',
      });
      this._ui.closeModal();
      this._ui.showToast('Reporte enviado. El equipo administrativo lo revisará.', 'success', 5000);
      this._reload();
    } catch (e) {
      fail(e.message || 'No se pudo enviar el reporte.');
    } finally {
      this._setBusy(btn, false);
    }
  }

  /* ── Administrador ──────────────────────────────────────── */

  _adminView() {
    const active = this.jobs.filter(j => j.estado === CHAMBAYA.JOB_STATUS.ACTIVE);
    const done = this.jobs.filter(j => j.estado === CHAMBAYA.JOB_STATUS.DONE);
    return `
      ${this._header('Supervisión de trabajos', 'Todos los servicios coordinados en la plataforma, con su estado y las partes involucradas.')}
      <div class="stats-grid">
        ${this._statCard('fa-briefcase', '#4E7A5C', 'rgba(78,122,92,.12)', this.jobs.length, 'Trabajos totales', 'Histórico')}
        ${this._statCard('fa-circle-play', '#B8914A', 'rgba(184,145,74,.14)', active.length, 'En curso', 'Requieren seguimiento')}
        ${this._statCard('fa-circle-check', '#3A3A38', 'rgba(58,58,56,.1)', done.length, 'Finalizados', 'Con posible reseña')}
      </div>
      ${this.jobs.length ? `<div class="table-card"><table class="admin-table">
        <thead><tr><th>Servicio</th><th>Cliente</th><th>Técnico</th><th>Fecha</th><th>Presupuesto</th><th>Estado</th><th></th></tr></thead>
        <tbody>${this.jobs.map(j => `<tr>
          <td><strong>${escapeHtml(j.service || '')}</strong><div class="muted tiny">${escapeHtml(j.zona || '')}</div></td>
          <td>${escapeHtml(j.clienteNombre || '')}</td>
          <td>${escapeHtml(j.trabajadorNombre || '')}</td>
          <td>${formatDate(j.fecha)}</td>
          <td>${formatMoney(j.presupuesto)}</td>
          <td>${this._statusPill(j.estado || '')}</td>
          <td>${j.estado === CHAMBAYA.JOB_STATUS.ACTIVE ? `<button class="link-btn danger" onclick="ui._getPage('jobs').adminCancel('${j.id}')">Cancelar</button>` : ''}</td>
        </tr>`).join('')}</tbody>
      </table></div>` : this._empty('fa-clipboard', 'Sin trabajos registrados', 'Aún no se han coordinado servicios en la plataforma.')}`;
  }

  async adminCancel(jobId) {
    const ok = await this._ui.confirm({
      title: 'Cancelar trabajo',
      message: 'Como administrador puedes cancelar este servicio. Se notificará a ambas partes.',
      confirmText: 'Cancelar trabajo', danger: true,
    });
    if (!ok) return;
    try {
      const job = await this._app.jobs.getById(jobId);
      await this._app.jobs.cancel(jobId, 'Cancelado por administración');
      await Promise.all([job.clientId, job.trabajadorId].filter(Boolean).map(uid => this._app.notif.notify({
        usuarioId: uid,
        title: 'Servicio cancelado por administración',
        desc: `El trabajo de ${job.service} fue cancelado.`,
        icon: 'fa-ban', color: '#A85B46', bg: 'rgba(168,91,70,.12)', link: 'jobs',
      })));
      this._ui.showToast('Trabajo cancelado.', 'success');
      this._reload();
    } catch (e) {
      this._ui.showToast(e.message, 'error');
    }
  }
}
