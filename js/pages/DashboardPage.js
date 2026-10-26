/**
 * Panel principal. Cambia por completo según el rol activo:
 *  - Cliente: recomendaciones por zona, solicitudes, trabajos y reseñas pendientes.
 *  - Trabajador: disponibilidad, perfil público, solicitudes cercanas y trabajos.
 *  - Administrador: verificaciones, reportes y métricas de la plataforma.
 */
class DashboardPage extends BasePage {
  async render(container) {
    const role = this.role;
    if (role === 'admin') return this._admin(container);
    if (role === 'trabajador') return this._worker(container);
    return this._client(container);
  }

  _greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }

  _firstName() {
    return String(this.user.name || this.user.nombre || 'vecino').split(' ')[0];
  }

  _hero(kicker, title, copy, actions) {
    return `<div class="dashboard-hero">
      <div>
        <div class="hero-kicker">${escapeHtml(kicker)}</div>
        <h2>${title}</h2>
        <p>${copy}</p>
      </div>
      <div class="hero-actions">${actions}</div>
    </div>`;
  }

  /* ── Cliente ────────────────────────────────────────────── */

  async _client(container) {
    container.innerHTML = '<div class="page-loading"><span class="spinner dark"></span></div>';
    const [allWorkers, jobs, quotes, favorites] = await Promise.all([
      this._app.workers.getAll({ onlyActive: true }),
      this._app.jobs.getForClient(this.uid),
      this._app.quotes.getByClient(this.uid),
      this._app.favorites.list(this.uid),
    ]);
    if (!this._alive) return;

    const near = this._app.workers.recommendForClient(allWorkers, { zone: this.user.zone, onlyAvailable: true });
    const activeJobs = jobs.filter(j => j.estado === CHAMBAYA.JOB_STATUS.ACTIVE);
    const activeQuotes = quotes.filter(q => q.status === CHAMBAYA.QUOTE_STATUS.OPEN);
    const pendingReviews = jobs.filter(j => this._app.jobs.canReview(j, this.uid));
    const inZone = this._app.workers.filter(allWorkers, { zone: this.user.zone, radiusKm: 25 });
    const available = inZone.filter(w => w.availability === 'Disponible').length;

    container.innerHTML = `
      ${this._hero('Panel del empleador', `${this._greeting()}, ${escapeHtml(this._firstName())}.`,
        `Estás en <strong>${escapeHtml(this.user.zone || 'tu zona')}</strong>. Tienes ${available} técnicos disponibles en un radio de 25 km.`,
        `<button class="btn btn-primary" onclick="ui.navigateTo('workers')"><i class="fas fa-search"></i> Buscar técnico</button>
         <button class="btn btn-secondary" onclick="ui.navigateTo('quotes')"><i class="fas fa-plus"></i> Nueva solicitud</button>`)}
      <div class="stats-grid">
        ${this._statCard('fa-user-check', '#4E7A5C', 'rgba(78,122,92,.12)', available, 'Disponibles en tu zona', 'Radio de 25 km')}
        ${this._statCard('fa-file-invoice', '#B8914A', 'rgba(184,145,74,.14)', activeQuotes.length, 'Solicitudes activas', `${quotes.length} en total`)}
        ${this._statCard('fa-clipboard-check', '#3A3A38', 'rgba(58,58,56,.1)', activeJobs.length, 'Trabajos en curso', `${jobs.length} históricos`)}
        ${this._statCard('fa-heart', '#A85B46', 'rgba(168,91,70,.12)', favorites.length, 'Técnicos favoritos', 'Guardados para después')}
      </div>
      ${pendingReviews.length ? `<div class="notice notice-warning">
        <i class="fas fa-star"></i>
        <div><strong>Tienes ${pendingReviews.length} servicio${pendingReviews.length > 1 ? 's' : ''} por calificar.</strong>
        Las reseñas solo se habilitan cuando el trabajo está finalizado.
        <button class="link-btn" onclick="ui.navigateTo('jobs')">Calificar ahora</button></div>
      </div>` : ''}
      ${activeJobs.length ? this._section('Servicios en curso', activeJobs.slice(0, 2).map(j => this._jobCard(j, `
        <button class="btn btn-sm btn-secondary" onclick="ui.navigateTo('jobs')">Ver detalle</button>
        <button class="btn btn-sm btn-secondary" onclick="ui.navigateTo('messages')"><i class="fas fa-comment"></i> Mensajes</button>
      `)).join(''), '<button class="card-action" onclick="ui.navigateTo(\'jobs\')">Ver todos</button>') : ''}
      ${this._section(`Recomendados en ${escapeHtml(this.user.zone || 'tu zona')}`,
        near.length ? `<div class="workers-grid compact">${near.slice(0, 6).map(w => this._workerCard(w)).join('')}</div>`
          : this._empty('fa-user-slash', 'Aún no hay técnicos disponibles', 'Prueba ampliando el radio de búsqueda o publicando una solicitud para recibir ofertas.',
            '<button class="btn btn-primary" onclick="ui.navigateTo(\'quotes\')">Publicar solicitud</button>'),
        '<button class="card-action" onclick="ui.navigateTo(\'workers\')">Ver directorio</button>')}
      <div class="content-grid">
        ${this._section('Últimas solicitudes', quotes.length ? `<div class="mini-list">${quotes.slice(0, 4).map(q => `
          <div class="mini-row" onclick="ui.navigateTo('quotes')">
            <div class="mini-icon"><i class="fas ${tradeIcon(q.service)}"></i></div>
            <div class="mini-body">
              <div class="mini-title">${escapeHtml(q.service)} · ${escapeHtml(q.zona || '')}</div>
              <div class="mini-sub">${formatDate(q.createdAt)} · ${q.ofertasCount || 0} oferta(s)</div>
            </div>
            ${this._statusPill(q.status || 'Activa')}
          </div>`).join('')}</div>` : this._empty('fa-file-circle-plus', 'Sin solicitudes', 'Publica lo que necesitas y recibe ofertas de técnicos cercanos.',
            '<button class="btn btn-primary btn-sm" onclick="ui.navigateTo(\'quotes\')">Crear solicitud</button>'),
          '<button class="card-action" onclick="ui.navigateTo(\'quotes\')">Gestionar</button>')}
        ${this._section('Zonas con más técnicos', this._zoneBars(allWorkers), '<button class="card-action" onclick="ui.navigateTo(\'map\')">Ver mapa</button>')}
      </div>`;
  }

  _zoneBars(workers) {
    const rows = CHAMBAYA.ZONES.map(z => ({
      label: z.name,
      value: workers.filter(w => w.zone === z.name || (w.coverage || []).includes(z.name)).length,
    })).filter(r => r.value > 0).sort((a, b) => b.value - a.value).slice(0, 6);
    const max = Math.max(...rows.map(r => r.value), 1);
    return `<div class="bar-chart">${rows.map(r => `
      <div class="bar-row">
        <div class="bar-label">${escapeHtml(r.label)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.round(r.value / max * 100)}%;background:var(--primary)"></div></div>
        <div class="bar-val">${r.value}</div>
      </div>`).join('') || '<p class="muted">Sin datos.</p>'}</div>`;
  }

  /* ── Trabajador ─────────────────────────────────────────── */

  async _worker(container) {
    container.innerHTML = '<div class="page-loading"><span class="spinner dark"></span></div>';
    const [worker, jobs, activeQuotes, offers, suggestions, reviews] = await Promise.all([
      this._app.workers.getById(this.uid),
      this._app.jobs.getForWorker(this.uid),
      this._app.quotes.getActive(),
      this._app.quotes.getOffersByWorker(this.uid),
      this._app.quotes.getSuggestionsForWorker(this.uid),
      this._app.workers.getReviewsByWorker(this.uid),
    ]);
    if (!this._alive) return;

    const w = worker || { id: this.uid, name: this.user.name, trade: this.user.oficio, zone: this.user.zone, availability: 'Ocupado', stars: 0, reviewCount: 0, tarifas: {}, experiencia: 0, portafolio: [], habilidades: [] };
    const nearby = this._app.workers.recommendJobsForWorker(activeQuotes, w);
    const activeJobs = jobs.filter(j => j.estado === CHAMBAYA.JOB_STATUS.ACTIVE);
    const doneJobs = jobs.filter(j => j.estado === CHAMBAYA.JOB_STATUS.DONE);
    const pendingSuggestions = suggestions.filter(s => s.status === 'Enviada' || s.estado === 'Enviada');
    const status = w.verificationStatus || CHAMBAYA.VERIFICATION_STATUS.NONE;
    const completeness = this._app.workers.completeness(
      { nombre: w.name, oficio: w.trade, zona: w.zone, descripcion: w.description, experiencia: w.experience, tarifas: w.tarifas, telefono: w.phone, habilidades: w.habilidades, portafolio: w.portafolio, horario: w.schedule },
      this.user
    );
    const verificationBanner = w.badgeVerified
      ? `<div class="notice notice-success"><i class="fas fa-circle-check"></i><div><strong>Perfil verificado.</strong> Tu insignia es visible en el directorio y en tu perfil público.</div></div>`
      : status === CHAMBAYA.VERIFICATION_STATUS.PENDING
        ? `<div class="notice notice-warning"><i class="fas fa-hourglass-half"></i><div><strong>Verificación en revisión.</strong> Tu solicitud está siendo evaluada por el equipo de TuOficioCol.</div></div>`
        : `<div class="notice notice-warning"><i class="fas fa-shield-halved"></i><div><strong>Aún no estás verificado.</strong> ${completeness.complete
          ? 'Envía tu documento y una foto de tu rostro para obtener la insignia.'
          : `Primero completa tu perfil (<strong>${completeness.percent}%</strong>). Te falta: ${escapeHtml(completeness.missing.join(', '))}.`}
          <button class="link-btn" onclick="ui.navigateTo('profile')">${completeness.complete ? 'Solicitar verificación' : 'Completar mi perfil'}</button></div></div>`;

    container.innerHTML = `
      ${this._hero('Panel del trabajador', `${this._greeting()}, ${escapeHtml(this._firstName())}.`,
        `Tu perfil acumula <strong>${w.views || 0} visitas</strong> y una calificación de <strong>${(w.stars || 0).toFixed(1)}</strong>. Mantén tu disponibilidad al día para recibir más solicitudes.`,
        `<button class="btn btn-primary" onclick="ui.navigateTo('quotes')"><i class="fas fa-briefcase"></i> Ver solicitudes (${nearby.length})</button>
         <button class="btn btn-secondary" onclick="ui._getPage('dashboard').shareProfile()"><i class="fas fa-share-nodes"></i> Compartir perfil</button>`)}
      ${verificationBanner}
      <div class="stats-grid">
        ${this._statCard('fa-star', '#B8914A', 'rgba(184,145,74,.14)', (w.stars || 0).toFixed(1), 'Calificación promedio', `${w.reviewCount || reviews.length} reseñas`)}
        ${this._statCard('fa-eye', '#4E7A5C', 'rgba(78,122,92,.12)', w.views || 0, 'Visitas al perfil', 'Acumuladas')}
        ${this._statCard('fa-clipboard-check', '#3A3A38', 'rgba(58,58,56,.1)', activeJobs.length, 'Trabajos activos', `${doneJobs.length} finalizados`)}
        ${this._statCard('fa-paper-plane', '#A85B46', 'rgba(168,91,70,.12)', offers.length + pendingSuggestions.length, 'Postulaciones', `${pendingSuggestions.length} solicitudes directas`)}
      </div>
      <div class="content-grid">
        ${this._section('Disponibilidad', `
          <p class="muted small">Cambia tu estado para aparecer en las búsquedas de tu zona.</p>
          <div class="availability-options">
            ${CHAMBAYA.AVAILABILITY.map(a => `<button class="availability-btn ${w.availability === a ? 'active' : ''}" onclick="ui._getPage('dashboard').setAvailability('${a}')">
              <span class="avail-dot ${availabilityClass(a)}"></span>${a}
            </button>`).join('')}
          </div>
          <div class="profile-progress">
            <div class="progress-head"><span>Perfil completo</span><strong>${completeness.percent}%</strong></div>
            <div class="progress-bar"><div class="progress-fill" style="width:${completeness.percent}%"></div></div>
            <p class="muted small">${completeness.done} de ${completeness.total} datos completos. Un perfil completo recibe hasta 3 veces más solicitudes.</p>
          </div>`, '<button class="card-action" onclick="ui.navigateTo(\'profile\')">Editar perfil</button>')}
        ${this._section('Solicitudes directas', pendingSuggestions.length ? `<div class="mini-list">${pendingSuggestions.slice(0, 4).map(s => `
          <div class="mini-row" onclick="ui.navigateTo('quotes')">
            <div class="mini-icon"><i class="fas fa-envelope-open-text"></i></div>
            <div class="mini-body">
              <div class="mini-title">${escapeHtml(s.employerName || 'Cliente')} · ${escapeHtml(s.service || '')}</div>
              <div class="mini-sub">${formatDate(s.fecha)} ${escapeHtml(s.hora || '')} · ${escapeHtml(s.zone || '')}</div>
            </div>
            <div class="mini-amount">${formatMoney(s.budget)}</div>
          </div>`).join('')}</div>` : this._empty('fa-inbox', 'Sin solicitudes directas', 'Cuando un cliente te contacte desde tu perfil, la solicitud aparecerá aquí.'), '<button class="card-action" onclick="ui.navigateTo(\'quotes\')">Ver todas</button>')}
      </div>
      ${this._section('Trabajos activos', activeJobs.length ? activeJobs.map(j => this._jobCard(j, `
        <button class="btn btn-sm btn-primary" onclick="ui._getPage('jobs').finish('${j.id}')"><i class="fas fa-check"></i> Marcar finalizado</button>
        <button class="btn btn-sm btn-secondary" onclick="ui.navigateTo('messages')"><i class="fas fa-comment"></i> Mensajes</button>
      `)).join('') : this._empty('fa-clipboard', 'No tienes trabajos activos', 'Acepta una solicitud cercana para comenzar.'), '<button class="card-action" onclick="ui.navigateTo(\'jobs\')">Ver historial</button>')}
      ${this._section('Solicitudes cerca de ti', nearby.length ? `<div class="quote-list">${nearby.slice(0, 4).map(q => `
        <div class="quote-row" onclick="ui.navigateTo('quotes')">
          <div class="mini-icon"><i class="fas ${tradeIcon(q.service)}"></i></div>
          <div class="mini-body">
            <div class="mini-title">${escapeHtml(q.service)} · ${escapeHtml(q.zona || '')}</div>
            <div class="mini-sub">${escapeHtml(q.description || '').slice(0, 95)}${(q.description || '').length > 95 ? '…' : ''}</div>
          </div>
          <div class="quote-row-side">
            <div class="mini-amount">${formatMoney(q.budget)}</div>
            <div class="mini-sub">${formatDate(q.fecha)}</div>
          </div>
        </div>`).join('')}</div>` : this._empty('fa-location-dot', 'Sin solicitudes en tu zona', 'Amplía tu cobertura o revisa más tarde.'), '<button class="card-action" onclick="ui.navigateTo(\'quotes\')">Ver todas</button>')}
      ${this._section('Últimas reseñas', reviews.length ? reviews.slice(0, 3).map(r => this._reviewItem(r)).join('') : this._empty('fa-star-half-stroke', 'Aún no tienes reseñas', 'Finaliza tu primer trabajo para que los clientes califiquen tu servicio.'), '<button class="card-action" onclick="ui.navigateTo(\'portfolio\')">Ver portafolio</button>')}`;
  }

  async setAvailability(status) {
    try {
      await this._app.workers.setAvailability(this.uid, status);
      this._ui.showToast(`Disponibilidad: ${status}`, 'success');
      this._reload();
    } catch (e) {
      this._ui.showToast(e.message, 'error');
    }
  }

  async shareProfile() {
    try {
      const w = await this._app.workers.getById(this.uid);
      if (!w) return;
      this.shareWorker(w);
    } catch (e) {
      this._ui.showToast(e.message, 'error');
    }
  }

  /* ── Administrador ──────────────────────────────────────── */

  async _admin(container) {
    container.innerHTML = '<div class="page-loading"><span class="spinner dark"></span></div>';
    const [users, workers, verifications, reports, jobs] = await Promise.all([
      this._app.db.getAll(CHAMBAYA.COLLECTIONS.USERS),
      this._app.workers.getAll(),
      this._app.verifications.listAll(),
      this._app.reports.listAll(),
      this._app.db.getAll(CHAMBAYA.COLLECTIONS.JOBS),
    ]);
    if (!this._alive) return;

    const pendingV = verifications.filter(v => v.estado === 'Pendiente');
    const pendingR = reports.filter(r => r.estado === 'Pendiente');
    const activeJobs = jobs.filter(j => j.estado === CHAMBAYA.JOB_STATUS.ACTIVE);
    const workersOnly = users.filter(u => u.rol === 'trabajador');
    const clients = users.filter(u => u.rol === 'cliente');
    const inactive = users.filter(u => u.activo === false);
    const pendingNames = pendingV.map(v => {
      const w = workers.find(x => x.id === v.trabajadorId);
      return { ...v, oficio: v.oficio || w?.trade || '' };
    });

    container.innerHTML = `
      ${this._hero('Administración', 'Centro de control de TuOficioCol',
        `Hay <strong>${pendingV.length} verificaciones</strong> y <strong>${pendingR.length} reportes</strong> esperando revisión.`,
        `<button class="btn btn-primary" onclick="ui.navigateTo('admin-verify')"><i class="fas fa-shield-halved"></i> Revisar verificaciones</button>
         <button class="btn btn-secondary" onclick="ui.navigateTo('admin-reports')"><i class="fas fa-flag"></i> Ver reportes</button>`)}
      <div class="stats-grid">
        ${this._statCard('fa-users', '#4E7A5C', 'rgba(78,122,92,.12)', users.length, 'Usuarios registrados', `${workersOnly.length} técnicos · ${clients.length} empleadores`)}
        ${this._statCard('fa-shield-halved', '#B8914A', 'rgba(184,145,74,.14)', pendingV.length, 'Verificaciones pendientes', `${verifications.length} solicitudes`)}
        ${this._statCard('fa-flag', '#A85B46', 'rgba(168,91,70,.12)', pendingR.length, 'Reportes abiertos', `${reports.length} en total`)}
        ${this._statCard('fa-clipboard-check', '#3A3A38', 'rgba(58,58,56,.1)', activeJobs.length, 'Trabajos en curso', `${inactive.length} cuentas inactivas`)}
      </div>
      <div class="content-grid">
        ${this._section('Verificaciones por revisar', pendingNames.length ? `<div class="mini-list">${pendingNames.slice(0, 5).map(v => `
          <div class="mini-row" onclick="ui.navigateTo('admin-verify')">
            <div class="mini-icon"><i class="fas fa-id-card"></i></div>
            <div class="mini-body">
              <div class="mini-title">${escapeHtml(v.nombre || 'Trabajador')}</div>
              <div class="mini-sub">${escapeHtml(v.oficio || '')} · ${timeAgo(v.createdAt)}</div>
            </div>
            ${this._statusPill('Pendiente')}
          </div>`).join('')}</div>` : this._empty('fa-circle-check', 'Todo al día', 'No hay verificaciones pendientes.'), '<button class="card-action" onclick="ui.navigateTo(\'admin-verify\')">Gestionar</button>')}
        ${this._section('Reportes recientes', pendingR.length ? `<div class="mini-list">${pendingR.slice(0, 5).map(r => `
          <div class="mini-row" onclick="ui.navigateTo('admin-reports')">
            <div class="mini-icon danger"><i class="fas fa-triangle-exclamation"></i></div>
            <div class="mini-body">
              <div class="mini-title">${escapeHtml(r.motivo || 'Reporte')}</div>
              <div class="mini-sub">${escapeHtml(r.reportadoNombre || '')} · ${timeAgo(r.createdAt)}</div>
            </div>
            ${this._statusPill('Pendiente')}
          </div>`).join('')}</div>` : this._empty('fa-flag', 'Sin reportes abiertos', 'La comunidad no tiene casos pendientes.'), '<button class="card-action" onclick="ui.navigateTo(\'admin-reports\')">Gestionar</button>')}
      </div>
      <div class="content-grid">
        ${this._section('Técnicos por oficio', this._tradeBars(workersOnly, workers))}
        ${this._section('Últimos registros', `<div class="mini-list">${users.slice().sort((a, b) => String(b.fechaRegistro || '').localeCompare(String(a.fechaRegistro || ''))).slice(0, 6).map(u => `
          <div class="mini-row" onclick="ui.navigateTo('admin-users')">
            ${this._avatar(u.nombre, u.avatarColor || '#3A3A38', 34, u.foto || '', 10)}
            <div class="mini-body">
              <div class="mini-title">${escapeHtml(u.nombre || 'Usuario')}</div>
              <div class="mini-sub">${escapeHtml(u.email || '')} · ${formatDate(u.fechaRegistro)}</div>
            </div>
            <span class="role-badge ${u.rol === 'trabajador' ? 'worker' : u.rol === 'admin' ? 'admin' : 'client'}">${u.rol === 'trabajador' ? 'Técnico' : u.rol === 'admin' ? 'Admin' : 'Empleador'}</span>
          </div>`).join('')}</div>`, '<button class="card-action" onclick="ui.navigateTo(\'admin-users\')">Ver usuarios</button>')}
      </div>`;
  }

  _tradeBars(workerUsers, workers) {
    const counts = {};
    workerUsers.forEach(u => {
      const w = workers.find(x => x.id === u.id);
      const trade = w?.trade || u.oficio || 'Otros';
      counts[trade] = (counts[trade] || 0) + 1;
    });
    const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const max = Math.max(...rows.map(r => r[1]), 1);
    return `<div class="bar-chart">${rows.map(([label, value]) => `
      <div class="bar-row">
        <div class="bar-label">${escapeHtml(label)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.round(value / max * 100)}%;background:var(--primary)"></div></div>
        <div class="bar-val">${value}</div>
      </div>`).join('') || '<p class="muted">Sin datos.</p>'}</div>`;
  }
}
