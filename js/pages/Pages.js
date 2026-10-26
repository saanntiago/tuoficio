class BasePage {
  constructor(app, ui) {
    this._app = app;
    this._ui = ui;
    this._subs = [];
  }
  render() { throw new Error('render() no implementado'); }
  destroy() {
    this._subs.forEach(fn => fn && fn());
    this._subs = [];
  }
  _role() {
    const r = this._app.auth.currentUser?.role;
    if (r === 'worker') return 'trabajador';
    if (r === 'client') return 'cliente';
    return r;
  }
  _uid() {
    return this._app.auth.currentUser?.uid;
  }
  _statCard(icon, color, bg, val, label, change, dir) {
    return `<div class="stat-card">
      <div class="stat-icon" style="background:${bg}"><i class="fas ${icon}" style="color:${color}"></i></div>
      <div class="stat-value">${val}</div>
      <div class="stat-label">${label}</div>
      <div class="stat-change ${dir}"><i class="fas fa-arrow-${dir}"></i> ${change}</div>
    </div>`;
  }
  _workerCard(w) {
    const stars = Array.from({ length: 5 }, (_, i) =>
      `<i class="fas fa-star" style="color:${i < Math.round(w.stars || 0) ? '#A89878' : 'var(--border)'}"></i>`
    ).join('');
    const availClass = { Disponible: 'available', Ocupado: 'busy', 'Medio tiempo': 'partial' }[w.availability] || 'busy';
    return `<div class="worker-card" onclick="ui._getPage('workers')._openModal('${w.id}')">
      <div class="worker-card-header">
        <div class="worker-avatar" style="background:${w.avatarColor || '#3A3A38'}">${escapeHtml(initialsOf(w.name))}</div>
        <div class="worker-info">
          <div class="worker-name">${escapeHtml(w.name)}</div>
          <div class="worker-trade">${escapeHtml(w.trade)} · ${w.experience || 0} años</div>
          ${w.badgeVerified ? '<span class="verified-badge"><i class="fas fa-check-circle"></i> Verificado</span>' : ''}
        </div>
      </div>
      <div class="worker-stars">${stars}<span>(${w.reviewCount || 0})</span></div>
      <div class="worker-tags">
        <span class="tag primary">${escapeHtml(w.trade)}</span>
        <span class="tag"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(w.zone || 'Sin zona')}</span>
        ${w.distanceKm != null && w.distanceKm < 90 ? `<span class="tag">${w.distanceKm.toFixed(1)} km</span>` : ''}
      </div>
      <div class="worker-footer">
        <div class="worker-price">$${formatCop(w.visitFee)} COP<span>/visita</span></div>
        <div><span class="avail-dot ${availClass}"></span><span class="avail-text">${escapeHtml(w.availability)}</span></div>
      </div>
    </div>`;
  }
  _reviewItem(r) {
    const stars = Array.from({ length: 5 }, (_, i) =>
      `<i class="fas fa-star" style="font-size:11px;color:${i < r.rating ? '#A89878' : 'var(--border)'}"></i>`
    ).join('');
    const name = r.clientName || 'Cliente';
    return `<div class="review-item">
      <div class="review-header">
        <div class="review-avatar" style="background:${r.clientColor || '#3A3A38'}">${escapeHtml(initialsOf(name))}</div>
        <div>
          <div class="review-name">${escapeHtml(name)}</div>
          <div style="display:flex;gap:2px;margin-top:2px">${stars}</div>
        </div>
        <div class="review-date" style="margin-left:auto">${escapeHtml(r.date || '')}</div>
      </div>
      <div class="review-text">${escapeHtml(r.text)}</div>
    </div>`;
  }
  _renderChart(labels, vals1, vals2) {
    const max = Math.max(...vals1, ...vals2, 1);
    const H = 160;
    const W = 700;
    const pts1 = vals1.map((v, i) => `${40 + i * (W / labels.length)},${H - (v / max * H)}`).join(' ');
    const pts2 = vals2.map((v, i) => `${40 + i * (W / labels.length)},${H - (v / max * H)}`).join(' ');
    const area1 = `40,${H} ${pts1} ${40 + (labels.length - 1) * (W / labels.length)},${H}`;
    const area2 = `40,${H} ${pts2} ${40 + (labels.length - 1) * (W / labels.length)},${H}`;
    return `<svg viewBox="0 0 750 180" width="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#3A3A38"/><stop offset="100%" stop-color="#3A3A38" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#8C8C88"/><stop offset="100%" stop-color="#8C8C88" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${[0, 25, 50, 75, 100].map(v =>
        `<line x1="30" y1="${H - (v / 100 * H)}" x2="720" y2="${H - (v / 100 * H)}" stroke="var(--border)" stroke-width=".7"/>`
      ).join('')}
      <polygon points="${area1}" fill="url(#g1)" opacity=".18"/>
      <polygon points="${area2}" fill="url(#g2)" opacity=".14"/>
      <polyline points="${pts1}" fill="none" stroke="#3A3A38" stroke-width="2.5"/>
      <polyline points="${pts2}" fill="none" stroke="#8C8C88" stroke-width="2.5"/>
      ${labels.map((l, i) => `<text x="${40 + i * (W / labels.length)}" y="178" text-anchor="middle" font-size="10" fill="var(--text4)">${l}</text>`).join('')}
    </svg>`;
  }
  _barRows(items) {
    const max = Math.max(...items.map(i => i.value), 1);
    return items.map(i => `
      <div class="bar-row">
        <div class="bar-label">${escapeHtml(i.label)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.round(i.value / max * 100)}%;background:${i.color || '#3A3A38'}"></div></div>
        <div class="bar-val">${i.value}</div>
      </div>`).join('') || '<p style="color:var(--text3);font-size:13px">Sin datos.</p>';
  }
  _formatTs(ts) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : (ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts));
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CO');
  }
}

class DashboardPage extends BasePage {
  render(container) {
    const user = this._app.auth.currentUser;
    if (!user) return;
    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title" id="dashTitle">Cargando...</div>
          <div class="page-subtitle" id="dashSubtitle"></div>
        </div>
        <div style="display:flex;gap:10px" id="dashActions"></div>
      </div>
      ${!user.verified && !user.googleAuth ? `
        <div class="verify-banner">
          <i class="fas fa-envelope"></i>
          Verifica tu correo para acceder a todas las funciones.
          <a onclick="app.auth.resendVerificationEmail().then(()=>ui.showToast('Correo enviado','success'))">Reenviar</a>
        </div>` : ''}
      <div class="stats-grid" id="statsGrid">${[1,2,3,4].map(() => '<div class="stat-card skeleton" style="height:120px"></div>').join('')}</div>
      <div class="content-grid" id="dashGrid">
        <div class="card skeleton" style="height:280px"></div>
        <div class="card skeleton" style="height:280px"></div>
      </div>`;
    this._load(user);
  }

  async _load(user) {
    const role = this._role();
    if (role === 'admin') await this._admin(user);
    else if (role === 'trabajador') await this._worker(user);
    else await this._client(user);
  }

  async _admin(user) {
    document.getElementById('dashTitle').textContent = 'Panel administrativo';
    document.getElementById('dashSubtitle').textContent = `Gestión de la app · ${user.name}`;
    const [workers, allUsers, reports, quotes, reviews] = await Promise.all([
      this._app.workers.getAll(),
      this._app.db.getAll(this._app.db.COLLECTIONS.USERS),
      this._app.db.getAll(this._app.db.COLLECTIONS.REPORTS),
      this._app.db.getAll(this._app.db.COLLECTIONS.QUOTES),
      this._app.db.getAll(this._app.db.COLLECTIONS.REVIEWS),
    ]);
    const clients = allUsers.filter(u => u.rol === 'cliente');
    const techs = allUsers.filter(u => u.rol === 'trabajador');
    const admins = allUsers.filter(u => u.rol === 'admin');
    const active = allUsers.filter(isUserActive);
    const inactive = allUsers.filter(u => !isUserActive(u));
    const pending = techs.filter(u => !u.verificado);
    const pendRep = reports.filter(r => r.status === 'Pendiente' || r.estado === 'pendiente');
    const available = workers.filter(w => w.availability === 'Disponible' || w.disponibilidad === 'Disponible');
    const now = new Date();
    const buckets = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('es-CO', { month: 'short' }), workers: 0, clients: 0 });
    }
    allUsers.forEach(u => {
      const ts = u.fechaRegistro;
      const d = ts?.toDate ? ts.toDate() : (ts?.seconds ? new Date(ts.seconds * 1000) : null);
      if (!d || Number.isNaN(d.getTime())) return;
      const b = buckets.find(x => x.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (!b) return;
      if (u.rol === 'trabajador') b.workers++;
      else if (u.rol === 'cliente') b.clients++;
    });
    const byTrade = {};
    workers.forEach(w => {
      const t = w.trade || w.oficio || 'Sin oficio';
      byTrade[t] = (byTrade[t] || 0) + 1;
    });
    const tradeRows = Object.entries(byTrade).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([label, value], i) => ({ label, value, color: ['#242422', '#3A3A38', '#4A4A47', '#6F6F6B', '#8C8C88', '#A8A8A2', '#5A5A56', '#C4C4BE'][i % 8] }));
    const dens = this._app.zones.density(workers);
    document.getElementById('statsGrid').innerHTML = `
      ${this._statCard('fa-users', '#3A3A38', 'rgba(58,58,56,.1)', allUsers.length, 'Registros totales', `${admins.length} admins`, 'up')}
      ${this._statCard('fa-user-check', '#6B736C', 'rgba(107,115,108,.12)', active.length, 'Usuarios activos', `${inactive.length} inactivos`, inactive.length ? 'down' : 'up')}
      ${this._statCard('fa-hard-hat', '#6B5E45', 'rgba(168,152,120,.16)', techs.length, 'Trabajadores', `${available.length} disponibles`, 'up')}
      ${this._statCard('fa-briefcase', '#6F6F6B', 'rgba(111,111,107,.14)', clients.length, 'Empleadores', 'Clientes registrados', 'up')}
      ${this._statCard('fa-file-alt', '#5A5A56', 'rgba(90,90,86,.12)', quotes.length, 'Solicitudes', `${reviews.length} reseñas`, 'up')}
      ${this._statCard('fa-flag', '#8F6A6A', 'rgba(143,106,106,.14)', pendRep.length, 'Reportes pendientes', `${pending.length} por verificar`, 'down')}`;
    document.getElementById('dashGrid').innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="card-title">Altas de trabajadores vs empleadores</div>
          <div style="display:flex;gap:12px;font-size:11px;color:var(--text3)">
            <span><i class="fas fa-circle" style="color:#3A3A38;font-size:8px"></i> Técnicos</span>
            <span><i class="fas fa-circle" style="color:#8C8C88;font-size:8px"></i> Empleadores</span>
          </div>
        </div>
        <div class="chart-container">${this._renderChart(buckets.map(b => b.label), buckets.map(b => b.workers), buckets.map(b => b.clients))}</div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Composición de la app</div></div>
        ${this._barRows([
          { label: 'Activos', value: active.length, color: '#6B736C' },
          { label: 'Inactivos', value: inactive.length, color: '#8F6A6A' },
          { label: 'Trabajadores', value: techs.length, color: '#6B5E45' },
          { label: 'Empleadores', value: clients.length, color: '#8C8C88' },
          { label: 'Admins', value: admins.length, color: '#3A3A38' },
        ])}
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Trabajadores por oficio</div>
          <div class="card-action" onclick="ui.navigateTo('workers')">Directorio</div></div>
        ${this._barRows(tradeRows)}
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Zonas con más técnicos</div>
          <div class="card-action" onclick="ui.navigateTo('map')">Mapa</div></div>
        ${this._barRows(dens.slice(0, 8).map((z, i) => ({
          label: z.name,
          value: z.count,
          color: i < 3 ? '#3A3A38' : '#8C8C88',
        })))}
      </div>
      <div class="card" style="grid-column:1/-1">
        <div class="card-header"><div class="card-title">Últimos registros</div>
          <div class="card-action" onclick="ui.navigateTo('admin-users')">Ver todos</div></div>
        <div style="overflow:auto">
          <table class="admin-table">
            <thead><tr><th>Nombre</th><th>Rol</th><th>Estado</th><th>Zona</th><th>Alta</th></tr></thead>
            <tbody>${[...allUsers].reverse().slice(0, 8).map(u => `
              <tr>
                <td>${escapeHtml(u.nombre || '—')}</td>
                <td>${escapeHtml(u.rol || '—')}</td>
                <td><span class="status-pill ${isUserActive(u) ? 'verified' : 'rejected'}">${isUserActive(u) ? 'Activo' : 'Inactivo'}</span></td>
                <td>${escapeHtml(u.zona || '—')}</td>
                <td>${this._formatTs(u.fechaRegistro)}</td>
              </tr>`).join('') || '<tr><td colspan="5" style="color:var(--text3)">Aún no hay usuarios.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  async _worker(user) {
    document.getElementById('dashTitle').textContent = 'Mi panel';
    document.getElementById('dashSubtitle').textContent = `Hola, ${(user.name || '').split(' ')[0]} — ofertas cerca de ${user.zone || 'tu zona'}`;
    const [reviews, quotes, suggestions] = await Promise.all([
      this._app.workers.getReviewsByWorker(user.uid),
      this._app.quotes.getActive(),
      this._app.quotes.getSuggestionsForWorker(user.uid),
    ]);
    const workers = await this._app.workers.getAll();
    const me = workers.find(w => w.id === user.uid) || { trade: user.oficio, zone: user.zone };
    const rec = this._app.workers.recommendJobsForWorker(quotes, me);
    const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '—';
    document.getElementById('statsGrid').innerHTML = `
      ${this._statCard('fa-star', '#A89878', 'rgba(168,152,120,.16)', avg, 'Calificación', `${reviews.length} reseñas`, 'up')}
      ${this._statCard('fa-briefcase', '#3A3A38', 'rgba(58,58,56,.1)', rec.length, 'Chambas cerca', user.zone || 'Sin zona', 'up')}
      ${this._statCard('fa-paper-plane', '#8C8C88', 'rgba(140,140,136,.14)', suggestions.length, 'Sugerencias', 'De empleadores', 'up')}
      ${this._statCard('fa-id-card', '#6B736C', 'rgba(107,115,108,.12)', me.tipoHojaVida || 'Pendiente', 'Hoja de vida', 'Usa el chatbot', 'up')}`;
    document.getElementById('dashGrid').innerHTML = `
      <div class="card">
        <div class="card-header"><div class="card-title">Trabajos recomendados en tu zona</div>
          <div class="card-action" onclick="ui.navigateTo('quotes')">Ver todos</div></div>
        ${rec.length ? rec.map(q => `
          <div style="padding:10px 0;border-bottom:1px solid var(--border)">
            <div style="font-weight:600">${escapeHtml(q.service || q.categoria)}</div>
            <div style="font-size:12px;color:var(--text3)">${escapeHtml(q.address || q.zona || '')} · $${formatCop(q.budget)}</div>
          </div>`).join('') : '<p style="color:var(--text3);font-size:13px">Aún no hay solicitudes cerca. Completa tu HV con el chatbot para aparecer en búsquedas.</p>'}
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Sugerencias de empleadores</div></div>
        ${suggestions.length ? suggestions.map(s => `
          <div style="padding:10px 0;border-bottom:1px solid var(--border)">
            <div style="font-weight:600">${escapeHtml(s.service)}</div>
            <div style="font-size:12px;color:var(--text3)">${escapeHtml(s.employerName)} · ${escapeHtml(s.zone || '')}</div>
          </div>`).join('') : '<p style="color:var(--text3);font-size:13px">Nadie te ha enviado una oferta todavía.</p>'}
      </div>`;
    document.getElementById('dashActions').innerHTML = `
      <button class="btn btn-primary btn-sm" onclick="ui.toggleChatbot()"><i class="fas fa-robot"></i> Armar / mejorar HV</button>
      <button class="btn btn-secondary btn-sm" onclick="ui.navigateTo('availability')"><i class="fas fa-clock"></i> Disponibilidad</button>`;
  }

  async _client(user) {
    document.getElementById('dashTitle').textContent = 'Encuentra chamba cerca';
    document.getElementById('dashSubtitle').textContent = `Hola ${(user.name || '').split(' ')[0]}, técnicos activos en ${user.zone || 'tu barrio'}`;
    const [workers, myQuotes] = await Promise.all([
      this._app.workers.getAll(),
      this._app.quotes.getByClient(user.uid),
    ]);
    const nearby = this._app.workers.nearby(workers, user.zone || 'Chapinero');
    const rec = this._app.workers.recommendForEmployer(workers, { zone: user.zone || 'Chapinero' });
    document.getElementById('statsGrid').innerHTML = `
      ${this._statCard('fa-users', '#3A3A38', 'rgba(58,58,56,.1)', nearby.filter(w => w.availability === 'Disponible').length, 'Disponibles cerca', user.zone || 'Define tu zona', 'up')}
      ${this._statCard('fa-file-alt', '#8C8C88', 'rgba(140,140,136,.14)', myQuotes.length, 'Mis solicitudes', 'Activas', 'up')}
      ${this._statCard('fa-shield-alt', '#6B736C', 'rgba(107,115,108,.12)', workers.filter(w => w.badgeVerified).length, 'Verificados', 'Plataforma', 'up')}
      ${this._statCard('fa-map-marker-alt', '#A89878', 'rgba(168,152,120,.16)', this._app.zones.density(workers)[0]?.name || '—', 'Zona más activa', 'Según técnicos', 'up')}`;
    document.getElementById('dashGrid').innerHTML = `
      <div class="card">
        <div class="card-header"><div class="card-title">Recomendados para ti</div>
          <div class="card-action" onclick="ui.navigateTo('workers')">Directorio</div></div>
        ${rec.slice(0, 5).map(w => `
          <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);cursor:pointer" onclick="ui.navigateTo('workers')">
            <div class="user-avatar" style="width:40px;height:40px;border-radius:12px;background:${w.avatarColor}">${escapeHtml(initialsOf(w.name))}</div>
            <div style="flex:1">
              <div style="font-size:13px;font-weight:700">${escapeHtml(w.name)}</div>
              <div style="font-size:11px;color:var(--text3)">${escapeHtml(w.trade)} · ${escapeHtml(w.zone)} ${w.distanceKm != null ? '· ' + w.distanceKm.toFixed(1) + ' km' : ''}</div>
            </div>
            <span class="avail-dot ${w.availability === 'Disponible' ? 'available' : 'busy'}"></span>
          </div>`).join('') || '<p style="color:var(--text3);font-size:13px">Aún no hay técnicos en tu zona. Invita trabajadores o publica una solicitud.</p>'}
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Mis solicitudes</div>
          <div class="card-action" onclick="ui.navigateTo('quotes')">Ver todas</div></div>
        ${myQuotes.length ? myQuotes.map(q => `
          <div style="padding:10px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between">
            <div>
              <div style="font-weight:600">${escapeHtml(q.service)}</div>
              <div style="font-size:11px;color:var(--text3)">${escapeHtml(q.address)} · ${escapeHtml(q.date || '')}</div>
            </div>
            <span class="status-pill active">${escapeHtml(q.status || q.estado)}</span>
          </div>`).join('') : `
          <div class="empty-state" style="padding:20px">
            <i class="fas fa-clipboard"></i><h3>Sin solicitudes</h3>
            <button class="btn btn-primary btn-sm" style="margin-top:8px" onclick="ui._getPage('quotes').openQuoteModal()">Publicar</button>
          </div>`}
      </div>`;
    document.getElementById('dashActions').innerHTML = `
      <button class="btn btn-secondary btn-sm" onclick="ui.navigateTo('map')"><i class="fas fa-map-marked-alt"></i> Mapa</button>
      <button class="btn btn-primary btn-sm" onclick="ui.navigateTo('workers')"><i class="fas fa-search"></i> Buscar</button>`;
  }
}

class WorkersPage extends BasePage {
  constructor(app, ui) {
    super(app, ui);
    this._allWorkers = [];
    this._activeFilter = 'all';
    this._activeZone = '';
    this._activeAvail = '';
    this._searchVal = '';
  }
  render(container) {
    const isClient = this._role() === 'cliente';
    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">Directorio local</div>
          <div class="page-subtitle">Técnicos más cercanos y activos en tu barrio</div>
        </div>
        ${isClient ? `<button class="btn btn-primary btn-sm" onclick="ui._getPage('workers').openQuoteModal()"><i class="fas fa-paper-plane"></i> Publicar solicitud</button>` : ''}
      </div>
      <div class="filters-bar">
        <div class="filter-chip active" onclick="ui._getPage('workers')._setFilter('all', this)">Todos</div>
        ${CHAMBAYA.TRADES.slice(0, 6).map(t => `<div class="filter-chip" onclick="ui._getPage('workers')._setFilter('${t}', this)">${t}</div>`).join('')}
        <select class="filter-select" onchange="ui._getPage('workers')._setZone(this.value)">
          <option value="">Todas las zonas</option>
          ${CHAMBAYA.ZONES.map(z => `<option>${z.name}</option>`).join('')}
        </select>
        <select class="filter-select" onchange="ui._getPage('workers')._setAvail(this.value)">
          <option value="">Disponibilidad</option>
          <option value="Disponible">Disponible ahora</option>
          <option value="Medio tiempo">Medio tiempo</option>
        </select>
      </div>
      <div class="workers-grid" id="workersGrid"></div>`;
    this._loadWorkers();
    this._subs.push(this._app.workers.subscribeToWorkers(workers => {
      this._allWorkers = workers;
      this._applyFilters();
    }));
  }
  async _loadWorkers() {
    this._allWorkers = await this._app.workers.getAll();
    const zone = this._app.auth.currentUser?.zone;
    if (zone) this._allWorkers = this._app.workers.nearby(this._allWorkers, zone, 25);
    this._applyFilters();
  }
  _applyFilters() {
    let workers = [...this._allWorkers];
    if (this._activeFilter !== 'all') workers = workers.filter(w => w.trade === this._activeFilter);
    if (this._activeZone) workers = workers.filter(w => (w.zone || '').toLowerCase().includes(this._activeZone.toLowerCase()));
    if (this._activeAvail) workers = workers.filter(w => w.availability === this._activeAvail);
    if (this._searchVal) {
      const q = this._searchVal;
      workers = workers.filter(w =>
        (w.name || '').toLowerCase().includes(q) ||
        (w.trade || '').toLowerCase().includes(q) ||
        (w.zone || '').toLowerCase().includes(q)
      );
    }
    const grid = document.getElementById('workersGrid');
    if (!grid) return;
    grid.innerHTML = workers.length
      ? workers.map(w => this._workerCard(w)).join('')
      : `<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-search"></i><h3>Sin resultados</h3><p>No hay técnicos activos con esos filtros.</p></div>`;
  }
  _setFilter(filter, el) {
    this._activeFilter = filter;
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    this._applyFilters();
  }
  _setZone(zone) { this._activeZone = zone; this._applyFilters(); }
  _setAvail(avail) { this._activeAvail = avail; this._applyFilters(); }
  search(val) { this._searchVal = val.toLowerCase(); this._applyFilters(); }

  async _openModal(workerId) {
    const w = this._allWorkers.find(x => x.id === workerId);
    if (!w) return;
    const reviews = await this._app.workers.getReviewsByWorker(workerId);
    const portfolio = await this._app.workers.getPortfolio(workerId);
    const user = this._app.auth.currentUser;
    const stars = Array.from({ length: 5 }, (_, i) =>
      `<i class="fas fa-star" style="color:${i < Math.round(w.stars || 0) ? '#A89878' : 'var(--border)'}"></i>`
    ).join('');
    this._ui.openModal(`
      <div class="modal-header">
        <div class="modal-title">Perfil</div>
        <button class="modal-close" onclick="ui.closeModal()"><i class="fas fa-times"></i></button>
      </div>
      <div class="worker-modal-header">
        <div class="worker-modal-avatar" style="background:${w.avatarColor}">${escapeHtml(initialsOf(w.name))}</div>
        <div>
          <div style="font-size:20px;font-weight:800">${escapeHtml(w.name)}</div>
          <div style="font-size:13px;color:var(--text3)">${escapeHtml(w.trade)} · ${w.experience || 0} años</div>
          <div style="display:flex;gap:3px;margin-top:4px">${stars}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
        <span class="info-chip"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(w.zone)}</span>
        <span class="info-chip">${escapeHtml(w.availability)}</span>
      </div>
      <div style="background:var(--bg);border-radius:8px;padding:14px;font-size:13.5px;margin-bottom:16px">${escapeHtml(w.description || 'Sin descripción.')}</div>
      ${portfolio.length ? `<div class="worker-tags" style="margin-bottom:16px">${portfolio.map(p => `<span class="tag">${escapeHtml(p.titulo || p.title || 'Trabajo')}</span>`).join('')}</div>` : ''}
      <div style="margin-bottom:16px">${reviews.slice(0, 2).map(r => this._reviewItem(r)).join('') || '<div style="color:var(--text3);font-size:13px">Sin reseñas.</div>'}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="ui._getPage('workers')._startChat('${w.id}')"><i class="fas fa-comment"></i> Mensaje</button>
        ${this._role() === 'cliente' ? `
          <button class="btn btn-secondary" onclick="ui._getPage('workers')._openOfferModal('${w.id}','${escapeHtml(w.name)}')"><i class="fas fa-briefcase"></i> Enviar chamba</button>
          <button class="btn btn-secondary" onclick="ui._getPage('workers')._openReviewModal('${w.id}')"><i class="fas fa-star"></i> Reseña</button>` : ''}
      </div>`);
  }

  async _startChat(workerId) {
    const uid = this._uid();
    await this._app.messages.openWith(uid, workerId, '');
    this._ui.closeModal();
    this._ui.navigateTo('messages');
  }

  _openOfferModal(workerId, workerName) {
    this._ui.openModal(`
      <div class="modal-header">
        <div class="modal-title">Sugerir trabajo a ${escapeHtml(workerName)}</div>
        <button class="modal-close" onclick="ui.closeModal()"><i class="fas fa-times"></i></button>
      </div>
      <div class="form-group"><label>Servicio</label>
        <select class="form-input" id="offService">${CHAMBAYA.TRADES.map(t => `<option>${t}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label>Descripción</label>
        <textarea class="form-input" id="offDesc" rows="3" placeholder="Qué necesitas y en qué barrio..."></textarea>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Presupuesto COP</label><input class="form-input" id="offBudget" type="number"></div>
        <div class="form-group"><label>Zona</label><input class="form-input" id="offZone" value="${escapeHtml(this._app.auth.currentUser.zone || '')}"></div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px">
        <button class="btn btn-secondary" onclick="ui.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="ui._getPage('workers')._submitOffer('${workerId}')">Enviar</button>
      </div>`);
  }

  async _submitOffer(workerId) {
    const desc = document.getElementById('offDesc')?.value.trim();
    if (!desc) { this._ui.showToast('Describe el trabajo', 'error'); return; }
    const user = this._app.auth.currentUser;
    await this._app.quotes.sendSuggestion({
      employerId: user.uid,
      employerName: user.name,
      workerId,
      service: document.getElementById('offService').value,
      description: desc,
      zone: document.getElementById('offZone').value,
      budget: parseInt(document.getElementById('offBudget').value, 10) || 0,
    });
    this._ui.closeModal();
    this._ui.showToast('Sugerencia enviada al trabajador', 'success');
  }

  _openReviewModal(workerId) {
    this._ui.openModal(`
      <div class="modal-header"><div class="modal-title">Dejar reseña</div>
        <button class="modal-close" onclick="ui.closeModal()"><i class="fas fa-times"></i></button></div>
      <div class="form-group"><label>Estrellas (1-5)</label>
        <input class="form-input" id="revStars" type="number" min="1" max="5" value="5"></div>
      <div class="form-group"><label>Comentario</label>
        <textarea class="form-input" id="reviewTextInput" rows="3"></textarea></div>
      <div style="display:flex;justify-content:flex-end;gap:8px">
        <button class="btn btn-secondary" onclick="ui.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="ui._getPage('workers')._submitReview('${workerId}')">Publicar</button>
      </div>`);
  }

  async _submitReview(workerId) {
    const text = document.getElementById('reviewTextInput')?.value.trim();
    if (!text) { this._ui.showToast('Escribe tu experiencia', 'error'); return; }
    const user = this._app.auth.currentUser;
    await this._app.workers.addReview({
      workerId,
      clientId: user.uid,
      clientName: user.name,
      clientColor: user.avatarColor,
      rating: parseInt(document.getElementById('revStars').value, 10) || 5,
      text,
    });
    this._ui.closeModal();
    this._ui.showToast('Reseña publicada', 'success');
  }

  openQuoteModal() {
    this._ui.openModal(`
      <div class="modal-header"><div class="modal-title">Publicar solicitud</div>
        <button class="modal-close" onclick="ui.closeModal()"><i class="fas fa-times"></i></button></div>
      <div class="form-group"><label>Servicio</label>
        <select class="form-input" id="qService">${CHAMBAYA.TRADES.map(t => `<option>${t}</option>`).join('')}</select></div>
      <div class="form-group"><label>Descripción</label>
        <textarea class="form-input" id="qDesc" rows="3"></textarea></div>
      <div class="form-row">
        <div class="form-group"><label>Presupuesto</label><input class="form-input" id="qBudget" type="number"></div>
        <div class="form-group"><label>Barrio / localidad</label><input class="form-input" id="qAddress" value="${escapeHtml(this._app.auth.currentUser.zone || '')}"></div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px">
        <button class="btn btn-secondary" onclick="ui.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="ui._getPage('workers')._submitQuote()">Publicar</button>
      </div>`);
  }

  async _submitQuote() {
    const desc = document.getElementById('qDesc')?.value.trim();
    if (!desc) { this._ui.showToast('Describe el trabajo', 'error'); return; }
    const user = this._app.auth.currentUser;
    await this._app.quotes.create({
      clientId: user.uid,
      service: document.getElementById('qService').value,
      description: desc,
      budget: parseInt(document.getElementById('qBudget').value, 10) || 0,
      address: document.getElementById('qAddress').value,
      status: 'Activa',
      date: new Date().toISOString().slice(0, 10),
    });
    this._ui.closeModal();
    this._ui.showToast('Solicitud publicada en tu zona', 'success');
  }
}

class MessagesPage extends BasePage {
  constructor(app, ui) {
    super(app, ui);
    this._activeConv = null;
    this._msgSub = null;
  }
  render(container) {
    container.innerHTML = `
      <div class="page-header"><div class="page-title">Mensajes</div></div>
      <div class="chat-layout">
        <div class="chat-list" id="chatList"><div style="padding:16px;color:var(--text3)">Cargando...</div></div>
        <div class="chat-window">
          <div class="chat-header" id="chatHeader"><div style="color:var(--text3)">Selecciona una conversación</div></div>
          <div class="chat-messages" id="chatMessages"></div>
          <div class="chat-input-bar" id="chatInputBar" style="display:none">
            <textarea class="chat-input" id="chatInput" rows="1" placeholder="Mensaje..."
              onkeydown="ui._getPage('messages')._keydown(event)"></textarea>
            <button class="btn btn-primary btn-sm" onclick="ui._getPage('messages')._send()"><i class="fas fa-paper-plane"></i></button>
          </div>
        </div>
      </div>`;
    const uid = this._uid();
    this._subs.push(this._app.messages.subscribeToConversationList(uid, convs => {
      const list = document.getElementById('chatList');
      if (!list) return;
      if (!convs.length) {
        list.innerHTML = `<div class="empty-state" style="padding:32px"><i class="fas fa-comment-slash"></i><h3>Sin chats</h3></div>`;
        return;
      }
      list.innerHTML = convs.map(c => {
        const otherId = (c.participants || []).find(p => p !== uid);
        return `<div class="chat-list-item" onclick="ui._getPage('messages')._openConv('${otherId}')">
          <div class="user-avatar" style="width:40px;height:40px;border-radius:12px;background:#3A3A38">${escapeHtml((otherId || '?').slice(0, 2))}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:600">${escapeHtml(otherId)}</div>
            <div style="font-size:12px;color:var(--text3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(c.lastMessage || '')}</div>
          </div>
        </div>`;
      }).join('');
    }));
  }
  async _openConv(otherId) {
    this._activeConv = otherId;
    const uid = this._uid();
    const contact = await this._app.db.get(this._app.db.COLLECTIONS.USERS, otherId);
    const name = contact?.nombre || otherId;
    document.getElementById('chatHeader').innerHTML = `<div style="font-weight:700">${escapeHtml(name)}</div>`;
    document.getElementById('chatInputBar').style.display = 'flex';
    if (this._msgSub) this._msgSub();
    this._msgSub = this._app.messages.subscribeToConversation(uid, otherId, msgs => {
      const el = document.getElementById('chatMessages');
      if (!el) return;
      el.innerHTML = msgs.map(m => `
        <div class="msg ${m.from === uid ? 'sent' : 'received'}">
          <div class="msg-bubble">${escapeHtml(m.text)}</div>
          <div class="msg-time">${escapeHtml(m.time || '')}</div>
        </div>`).join('');
      el.scrollTop = el.scrollHeight;
    });
    await this._app.messages.markRead(uid, otherId);
  }
  async _send() {
    const input = document.getElementById('chatInput');
    const text = input?.value.trim();
    if (!text || !this._activeConv) return;
    input.value = '';
    await this._app.messages.send(this._uid(), this._activeConv, text);
  }
  _keydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._send(); }
  }
  destroy() {
    if (this._msgSub) this._msgSub();
    super.destroy();
  }
}

class ProfilePage extends BasePage {
  render(container) {
    const u = this._app.auth.currentUser;
    const worker = this._role() === 'trabajador';
    container.innerHTML = `
      <div class="page-title">Mi perfil</div>
      <div class="card" style="margin-top:16px;max-width:640px">
        <div class="form-group"><label>Nombre</label><input class="form-input" id="pName" value="${escapeHtml(u.name || '')}"></div>
        <div class="form-group"><label>Zona / barrio</label>
          <select class="form-input" id="pZone">${CHAMBAYA.ZONES.map(z =>
            `<option ${u.zone === z.name ? 'selected' : ''}>${z.name}</option>`).join('')}</select></div>
        ${worker ? `<div class="form-group"><label>Oficio</label>
          <select class="form-input" id="pTrade">${CHAMBAYA.TRADES.map(t =>
            `<option ${u.oficio === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
          <div class="form-group"><label>Descripción / HV</label>
            <textarea class="form-input" id="pDesc" rows="4" placeholder="Tu experiencia..."></textarea></div>
          <p style="font-size:13px;color:var(--text3);margin-bottom:12px">También puedes armar la hoja de vida hablando con el chatbot (profesional o informal).</p>` : ''}
        <button class="btn btn-primary" onclick="ui._getPage('profile').save()"><i class="fas fa-save"></i> Guardar</button>
      </div>`;
    if (worker) this._fillWorker();
  }
  async _fillWorker() {
    const w = await this._app.db.get(this._app.db.COLLECTIONS.WORKERS, this._uid());
    const desc = document.getElementById('pDesc');
    if (desc && w) desc.value = w.descripcion || '';
  }
  async save() {
    const uid = this._uid();
    const zona = document.getElementById('pZone').value;
    const nombre = document.getElementById('pName').value.trim();
    await this._app.db.update(this._app.db.COLLECTIONS.USERS, uid, { nombre, zona });
    if (this._role() === 'trabajador') {
      await this._app.db.set(this._app.db.COLLECTIONS.WORKERS, uid, {
        oficio: document.getElementById('pTrade').value,
        zona,
        descripcion: document.getElementById('pDesc').value,
      });
    }
    this._app.auth.currentUser.zone = zona;
    this._app.auth.currentUser.name = nombre;
    this._ui.showToast('Perfil guardado', 'success');
  }
}

class PortfolioPage extends BasePage {
  render(container) {
    container.innerHTML = `
      <div class="page-header">
        <div class="page-title">Portafolio</div>
        <button class="btn btn-primary btn-sm" onclick="ui._getPage('portfolio').add()">Agregar trabajo</button>
      </div>
      <div class="workers-grid" id="portGrid"></div>`;
    this._load();
  }
  async _load() {
    const items = await this._app.workers.getPortfolio(this._uid());
    const grid = document.getElementById('portGrid');
    grid.innerHTML = items.length ? items.map(p => `
      <div class="card"><strong>${escapeHtml(p.titulo || 'Trabajo')}</strong>
        <p style="font-size:13px;color:var(--text3);margin-top:8px">${escapeHtml(p.descripcion || '')}</p></div>`).join('')
      : '<div class="empty-state" style="grid-column:1/-1"><h3>Vacío</h3><p>Agrega trabajos reales que hayas hecho.</p></div>';
  }
  add() {
    this._ui.openModal(`
      <div class="modal-header"><div class="modal-title">Nuevo trabajo</div>
        <button class="modal-close" onclick="ui.closeModal()"><i class="fas fa-times"></i></button></div>
      <div class="form-group"><label>Título</label><input class="form-input" id="ptTitle"></div>
      <div class="form-group"><label>Descripción</label><textarea class="form-input" id="ptDesc" rows="3"></textarea></div>
      <button class="btn btn-primary" onclick="ui._getPage('portfolio').save()">Guardar</button>`);
  }
  async save() {
    const titulo = document.getElementById('ptTitle').value.trim();
    const descripcion = document.getElementById('ptDesc').value.trim();
    const w = await this._app.db.get(this._app.db.COLLECTIONS.WORKERS, this._uid()) || {};
    const portafolio = [...(w.portafolio || []), { titulo, descripcion }];
    await this._app.db.set(this._app.db.COLLECTIONS.WORKERS, this._uid(), { portafolio });
    this._ui.closeModal();
    this._load();
  }
}

class AvailabilityPage extends BasePage {
  render(container) {
    container.innerHTML = `
      <div class="page-title">Disponibilidad</div>
      <div class="card" style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap">
        ${['Disponible', 'Ocupado', 'Medio tiempo'].map(s =>
          `<button class="btn btn-secondary" onclick="ui._getPage('availability').set('${s}')">${s}</button>`).join('')}
      </div>
      <p style="margin-top:12px;color:var(--text3);font-size:13px">Los empleadores de tu zona solo verán técnicos activos y cercanos.</p>`;
  }
  async set(status) {
    await this._app.workers.updateAvailability(this._uid(), status);
    this._ui.showToast(`Estado: ${status}`, 'success');
  }
}

class QuotesPage extends BasePage {
  async render(container) {
    const role = this._role();
    if (role === 'cliente') {
      const mine = await this._app.quotes.getByClient(this._uid());
      container.innerHTML = `
        <div class="page-header"><div class="page-title">Mis solicitudes</div>
          <button class="btn btn-primary btn-sm" onclick="ui._getPage('quotes').openQuoteModal()">Nueva</button></div>
        <div class="card">${mine.map(q => `<div style="padding:12px 0;border-bottom:1px solid var(--border)">
          <strong>${escapeHtml(q.service)}</strong>
          <div style="font-size:13px;color:var(--text3)">${escapeHtml(q.description || '')} · ${escapeHtml(q.address || '')}</div>
        </div>`).join('') || '<p style="color:var(--text3)">No has publicado solicitudes.</p>'}</div>`;
    } else {
      const quotes = await this._app.quotes.getActive();
      const suggestions = await this._app.quotes.getSuggestionsForWorker(this._uid());
      const me = (await this._app.workers.getAll()).find(w => w.id === this._uid()) || this._app.auth.currentUser;
      const rec = this._app.workers.recommendJobsForWorker(quotes, { trade: me.trade || me.oficio, zone: me.zone });
      container.innerHTML = `
        <div class="page-title">Chambas cerca de ti</div>
        <div class="content-grid" style="margin-top:16px">
          <div class="card"><div class="card-title">Solicitudes en tu zona</div>
            ${rec.map(q => `<div style="padding:10px 0;border-bottom:1px solid var(--border)">
              <strong>${escapeHtml(q.service || q.categoria)}</strong>
              <p style="font-size:13px;color:var(--text3)">${escapeHtml(q.description || '')}</p>
            </div>`).join('') || '<p style="color:var(--text3);margin-top:8px">Nada cerca aún.</p>'}
          </div>
          <div class="card"><div class="card-title">Sugerencias directas</div>
            ${suggestions.map(s => `<div style="padding:10px 0;border-bottom:1px solid var(--border)">
              <strong>${escapeHtml(s.service)}</strong>
              <p style="font-size:13px">${escapeHtml(s.description || '')}</p>
              <span class="tag">${escapeHtml(s.employerName || '')}</span>
            </div>`).join('') || '<p style="color:var(--text3);margin-top:8px">Sin sugerencias.</p>'}
          </div>
        </div>`;
    }
  }
  openQuoteModal() { this._ui._getPage('workers').openQuoteModal(); }
}

class FavoritesPage extends BasePage {
  async render(container) {
    const fav = await this._app.db.get(this._app.db.COLLECTIONS.FAVORITES, this._uid());
    const ids = fav?.trabajadores || [];
    const workers = (await this._app.workers.getAll()).filter(w => ids.includes(w.id));
    container.innerHTML = `<div class="page-title">Favoritos</div>
      <div class="workers-grid" style="margin-top:16px">${workers.map(w => this._workerCard(w)).join('') ||
        '<div class="empty-state" style="grid-column:1/-1"><h3>Sin favoritos</h3></div>'}</div>`;
  }
}

class MapPage extends BasePage {
  async render(container) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">Zonas de trabajo</div>
          <div class="page-subtitle">Densidad de técnicos activos por localidad. Con API de Google Maps (opcional) se carga Places; si no, OpenStreetMap.</div>
        </div>
      </div>
      <div class="content-grid">
        <div class="card" style="padding:0;overflow:hidden;min-height:420px"><div id="appMap" style="height:420px"></div></div>
        <div class="card" id="zoneList"></div>
      </div>`;
    const workers = await this._app.workers.getAll();
    const dens = this._app.zones.density(workers);
    document.getElementById('zoneList').innerHTML = `<div class="card-title" style="margin-bottom:12px">Ranking de zonas</div>` +
      dens.map(z => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
        <span>${escapeHtml(z.name)}</span><span class="tag primary">${z.available} activos</span></div>`).join('');
    if (window.L) {
      const map = L.map('appMap').setView([4.6097, -74.0817], 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OSM' }).addTo(map);
      dens.forEach(z => {
        const r = 8 + z.count * 4;
        L.circleMarker([z.lat, z.lng], {
          radius: Math.min(r, 28),
          color: z.available ? '#6B736C' : '#3A3A38',
          fillOpacity: 0.35,
        }).bindPopup(`${z.name}: ${z.available} disponibles, ${z.count} técnicos`).addTo(map);
      });
      workers.forEach(w => {
        if (w.lat && w.lng) {
          L.marker([w.lat, w.lng]).bindPopup(`${escapeHtml(w.name)} · ${escapeHtml(w.trade)}`).addTo(map);
        }
      });
    }
  }
}

class AdminUsersPage extends BasePage {
  async render(container) {
    const page = this._ui._currentPage;
    const filter = page === 'admin-active' ? 'activos' : page === 'admin-inactive' ? 'inactivos' : 'todos';
    const titles = {
      todos: ['Registros de usuarios', 'Todos los perfiles de la aplicación'],
      activos: ['Usuarios activos', 'Cuentas habilitadas para usar TuOficioCol'],
      inactivos: ['Usuarios inactivos', 'Cuentas suspendidas o deshabilitadas'],
    };
    const users = await this._app.db.getAll(this._app.db.COLLECTIONS.USERS);
    const filtered = users.filter(u => {
      if (filter === 'activos') return isUserActive(u);
      if (filter === 'inactivos') return !isUserActive(u);
      return true;
    });
    const techs = filtered.filter(u => u.rol === 'trabajador').length;
    const clients = filtered.filter(u => u.rol === 'cliente').length;
    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">${titles[filter][0]}</div>
          <div class="page-subtitle">${titles[filter][1]} · ${filtered.length} registros · ${techs} trabajadores · ${clients} empleadores</div>
        </div>
      </div>
      <div class="filter-tabs">
        <button class="filter-tab ${filter === 'todos' ? 'active' : ''}" onclick="ui.navigateTo('admin-users')">Todos</button>
        <button class="filter-tab ${filter === 'activos' ? 'active' : ''}" onclick="ui.navigateTo('admin-active')">Activos</button>
        <button class="filter-tab ${filter === 'inactivos' ? 'active' : ''}" onclick="ui.navigateTo('admin-inactive')">Inactivos</button>
      </div>
      <div class="card" style="overflow:auto">
        <table class="admin-table">
          <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Zona / oficio</th><th>Estado</th><th>Alta</th><th></th></tr></thead>
          <tbody>${filtered.map(u => {
            const active = isUserActive(u);
            const isAdmin = u.rol === 'admin';
            return `<tr>
              <td><strong>${escapeHtml(u.nombre || '—')}</strong></td>
              <td>${escapeHtml(u.email || '')}</td>
              <td>${escapeHtml(u.rol || '—')}</td>
              <td>${escapeHtml(u.zona || '—')}${u.oficio ? ' · ' + escapeHtml(u.oficio) : ''}</td>
              <td><span class="status-pill ${active ? 'verified' : 'rejected'}">${active ? 'Activo' : 'Inactivo'}</span></td>
              <td>${this._formatTs(u.fechaRegistro)}</td>
              <td>${isAdmin ? '<span class="tag">Admin</span>' : `
                <button class="btn btn-sm ${active ? 'btn-secondary' : 'btn-primary'}"
                  onclick="ui._getPage('${page}').toggleActive('${u.id}', ${active ? 'false' : 'true'})">
                  ${active ? 'Desactivar' : 'Activar'}
                </button>`}
              </td>
            </tr>`;
          }).join('') || '<tr><td colspan="7" style="color:var(--text3)">No hay usuarios en este filtro.</td></tr>'}
          </tbody>
        </table>
      </div>`;
  }
  async toggleActive(id, next) {
    const doc = await this._app.db.get(this._app.db.COLLECTIONS.USERS, id);
    if (!doc || doc.rol === 'admin') {
      this._ui.showToast('No se puede cambiar el estado de un administrador.', 'error');
      return;
    }
    await this._app.db.set(this._app.db.COLLECTIONS.USERS, id, { activo: next });
    if (doc.rol === 'trabajador') {
      await this._app.db.set(this._app.db.COLLECTIONS.WORKERS, id, { activo: next });
    }
    this._ui.showToast(next ? 'Usuario activado' : 'Usuario desactivado', 'success');
    this.render(document.getElementById('mainContent'));
  }
}
class AdminVerifyPage extends BasePage {
  async render(container) {
    const users = (await this._app.db.getAll(this._app.db.COLLECTIONS.USERS)).filter(u => u.rol === 'trabajador');
    container.innerHTML = `<div class="page-title">Verificaciones</div>
      <div class="card" style="margin-top:16px">${users.map(u => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
          <div>${escapeHtml(u.nombre)} · ${escapeHtml(u.oficio || '')}</div>
          <button class="btn btn-sm btn-primary" onclick="app.db.update(app.db.COLLECTIONS.USERS,'${u.id}',{verificado:true}).then(()=>app.db.set(app.db.COLLECTIONS.WORKERS,'${u.id}',{badgeVerified:true})).then(()=>ui.showToast('Verificado','success'))">Verificar</button>
        </div>`).join('')}</div>`;
  }
}
class AdminReportsPage extends BasePage {
  async render(container) {
    const reports = await this._app.db.getAll(this._app.db.COLLECTIONS.REPORTS);
    container.innerHTML = `<div class="page-title">Reportes</div>
      <div class="card" style="margin-top:16px">${reports.map(r => `<div style="padding:10px 0;border-bottom:1px solid var(--border)">
        ${escapeHtml(r.reason || r.motivo || '')} — ${escapeHtml(r.desc || r.descripcion || '')}
      </div>`).join('') || '<p style="color:var(--text3)">Sin reportes.</p>'}</div>`;
  }
}
class SettingsPage extends BasePage {
  render(container) {
    container.innerHTML = `<div class="page-title">Configuración</div>
      <div class="card" style="margin-top:16px">
        <p style="font-size:13px;color:var(--text3);line-height:1.6">
          El login de Google se verifica en los servidores de Google + Firebase Auth.
          Las claves del cliente van en <code>js/config/firebase-config.js</code>.
          No hay un “token secreto” en el navegador: el ID token lo emite Google al completar el popup.
        </p>
        <button class="btn btn-danger" style="margin-top:16px" onclick="ui.doLogout()">Cerrar sesión</button>
      </div>`;
  }
}
