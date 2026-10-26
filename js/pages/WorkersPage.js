/**
 * Directorio público de técnicos (RF03).
 * Búsqueda combinada por oficio, zona, radio (Haversine), calificación,
 * verificación y disponibilidad, con vista de lista y mapa.
 */
class WorkersPage extends BasePage {
  constructor(app, ui) {
    super(app, ui);
    this.workers = [];
    this.filters = {
      query: '',
      trade: '',
      zone: app.auth.currentUser?.zone || '',
      radius: 5,
      minRating: 0,
      onlyVerified: false,
      onlyAvailable: false,
      sort: 'relevance',
    };
    this.view = 'grid';
    this._map = null;
    this._lastList = [];
  }

  async render(container, params = {}) {
    if (params.query) this.filters.query = params.query;
    if (params.zone) this.filters.zone = params.zone;
    if (params.trade) this.filters.trade = params.trade;
    container.innerHTML = '<div class="page-loading"><span class="spinner dark"></span></div>';
    try {
      this.workers = await this._app.workers.getAll({ onlyActive: true });
    } catch (e) {
      container.innerHTML = this._empty('fa-triangle-exclamation', 'No se pudo cargar el directorio', escapeHtml(e.message));
      return;
    }
    if (!this._alive) return;

    container.innerHTML = `
      ${this._header('Directorio de técnicos', `${this.workers.length} profesionales activos en Bogotá. Filtra por oficio, zona y radio de distancia.`,
        `<button class="btn btn-secondary" id="viewToggleBtn" onclick="ui._getPage('workers').toggleView()"><i class="fas fa-map"></i> Ver mapa</button>
         ${this.isClient ? '<button class="btn btn-primary" onclick="ui.navigateTo(\'quotes\', { new: true })"><i class="fas fa-plus"></i> Publicar solicitud</button>' : ''}`)}
      <div class="filter-panel">
        <div class="filter-search">
          <i class="fas fa-search"></i>
          <input id="workerSearch" type="search" placeholder="Buscar por nombre, oficio, barrio o habilidad..."
            value="${escapeHtml(this.filters.query)}" oninput="ui._getPage('workers').search(this.value)"/>
        </div>
        <div class="filter-row">
          <label class="filter-field"><span>Oficio</span>
            <select onchange="ui._getPage('workers').setFilter('trade', this.value)">
              <option value="">Todos los oficios</option>
              ${CHAMBAYA.TRADES.map(t => `<option ${this.filters.trade === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </label>
          <label class="filter-field"><span>Zona</span>
            <select onchange="ui._getPage('workers').setFilter('zone', this.value)">
              <option value="">Todas las zonas</option>
              ${CHAMBAYA.ZONES.map(z => `<option value="${z.name}" ${this.filters.zone === z.name ? 'selected' : ''}>${z.name}</option>`).join('')}
            </select>
          </label>
          <label class="filter-field"><span>Radio</span>
            <select onchange="ui._getPage('workers').setFilter('radius', this.value)">
              ${[5, 10, 25, 50, 999].map(r => `<option value="${r}" ${Number(this.filters.radius) === r ? 'selected' : ''}>${r === 999 ? 'Sin límite' : `${r} km`}</option>`).join('')}
            </select>
          </label>
          <label class="filter-field"><span>Calificación</span>
            <select onchange="ui._getPage('workers').setFilter('minRating', this.value)">
              <option value="0">Cualquiera</option>
              ${[3, 4, 4.5].map(r => `<option value="${r}" ${Number(this.filters.minRating) === r ? 'selected' : ''}>${r}★ o más</option>`).join('')}
            </select>
          </label>
          <label class="filter-field"><span>Ordenar por</span>
            <select onchange="ui._getPage('workers').setFilter('sort', this.value)">
              <option value="relevance" ${this.filters.sort === 'relevance' ? 'selected' : ''}>Relevancia</option>
              <option value="distance" ${this.filters.sort === 'distance' ? 'selected' : ''}>Más cercano</option>
              <option value="rating" ${this.filters.sort === 'rating' ? 'selected' : ''}>Mejor calificado</option>
              <option value="price" ${this.filters.sort === 'price' ? 'selected' : ''}>Visita más económica</option>
              <option value="experience" ${this.filters.sort === 'experience' ? 'selected' : ''}>Más experiencia</option>
            </select>
          </label>
        </div>
        <div class="filter-row toggles">
          <label class="switch-label"><input type="checkbox" ${this.filters.onlyVerified ? 'checked' : ''} onchange="ui._getPage('workers').setFilter('onlyVerified', this.checked)"/> Solo verificados</label>
          <label class="switch-label"><input type="checkbox" ${this.filters.onlyAvailable ? 'checked' : ''} onchange="ui._getPage('workers').setFilter('onlyAvailable', this.checked)"/> Solo disponibles</label>
          <button class="link-btn" onclick="ui._getPage('workers').resetFilters()"><i class="fas fa-rotate-left"></i> Limpiar filtros</button>
        </div>
      </div>
      <div class="results-head">
        <div id="resultsCount" class="results-count"></div>
        <div id="resultsOrigin" class="results-origin"></div>
      </div>
      <div id="workersList" class="workers-grid"></div>
      <div id="workersMap" class="map-panel hidden"></div>`;

    this._applyFilters();
    if (params.openWorkerId) this.openProfile(params.openWorkerId);
  }

  destroy() {
    if (this._map) {
      try { this._map.remove(); } catch (e) { /* ignorar */ }
      this._map = null;
    }
    super.destroy();
  }

  search(value) {
    this.filters.query = value;
    this._applyFilters(true);
  }

  setFilter(name, value) {
    if (name === 'radius' || name === 'minRating') value = Number(value);
    this.filters[name] = value;
    this._applyFilters();
  }

  resetFilters() {
    this.filters = {
      query: '', trade: '', zone: this.user.zone || '', radius: 5,
      minRating: 0, onlyVerified: false, onlyAvailable: false, sort: 'relevance',
    };
    this._ui.navigateTo('workers');
  }

  _origin() {
    return this.filters.zone || this.user.zone || '';
  }

  _applyFilters(onlyList = false) {
    const origin = this._origin();
    const radius = Number(this.filters.radius) || 999;
    let list = this._app.workers.filter(this.workers, {
      trade: this.filters.trade,
      zone: origin,
      radiusKm: radius,
      minRating: Number(this.filters.minRating) || 0,
      onlyVerified: this.filters.onlyVerified,
      onlyAvailable: this.filters.onlyAvailable,
      query: this.filters.query,
      sort: this.filters.sort,
    });
    this._lastList = list;
    if (!onlyList) {
      const count = document.getElementById('resultsCount');
      const originEl = document.getElementById('resultsOrigin');
      if (count) count.innerHTML = `<strong>${list.length}</strong> técnico${list.length === 1 ? '' : 's'} encontrado${list.length === 1 ? '' : 's'}`;
      if (originEl) {
        originEl.innerHTML = origin
          ? `<i class="fas fa-location-crosshairs"></i> Distancias calculadas desde <strong>${escapeHtml(origin)}</strong> · radio ${radius >= 999 ? 'sin límite' : `${radius} km`}`
          : '<i class="fas fa-location-crosshairs"></i> Selecciona una zona para calcular distancias.';
      }
    }
    this._renderList(list);
    if (this.view === 'map') this._renderMap(list);
  }

  _renderList(list) {
    const host = document.getElementById('workersList');
    if (!host) return;
    if (!list.length) {
      host.innerHTML = this._empty('fa-magnifying-glass', 'No encontramos técnicos con esos filtros',
        'Prueba con otro oficio, amplía el radio de búsqueda o desactiva los filtros de verificación y disponibilidad.',
        `<button class="btn btn-secondary" onclick="ui._getPage('workers').setFilter('radius', 50)">Ampliar a 50 km</button>
         <button class="btn btn-primary" onclick="ui._getPage('workers').resetFilters()">Limpiar filtros</button>`);
      return;
    }
    host.innerHTML = list.map(w => this._workerCard(w)).join('');
  }

  toggleView() {
    this.view = this.view === 'grid' ? 'map' : 'grid';
    const list = document.getElementById('workersList');
    const map = document.getElementById('workersMap');
    const btn = document.getElementById('viewToggleBtn');
    if (!list || !map) return;
    const isMap = this.view === 'map';
    list.classList.toggle('hidden', isMap);
    map.classList.toggle('hidden', !isMap);
    if (btn) btn.innerHTML = isMap ? '<i class="fas fa-list"></i> Ver lista' : '<i class="fas fa-map"></i> Ver mapa';
    if (isMap) this._renderMap(this._lastList);
  }

  _renderMap(list) {
    const host = document.getElementById('workersMap');
    if (!host) return;
    if (typeof L === 'undefined') {
      host.innerHTML = `<div class="map-fallback">
        <i class="fas fa-map-location-dot"></i>
        <h3>Mapa no disponible sin conexión</h3>
        <p>Estos son los técnicos encontrados por zona:</p>
        <div class="mini-list">${this._groupByZone(list).map(g => `
          <div class="mini-row"><div class="mini-icon"><i class="fas fa-location-dot"></i></div>
          <div class="mini-body"><div class="mini-title">${escapeHtml(g.zone)}</div>
          <div class="mini-sub">${g.workers.map(w => w.name).join(', ')}</div></div>
          <div class="mini-amount">${g.workers.length}</div></div>`).join('')}</div>
      </div>`;
      return;
    }
    host.innerHTML = '<div id="leafletWorkers" class="leaflet-host"></div><div class="map-legend"><span><span class="avail-dot available"></span> Disponible</span><span><span class="avail-dot partial"></span> Medio tiempo</span><span><span class="avail-dot busy"></span> Ocupado</span></div>';
    if (this._map) {
      try { this._map.remove(); } catch (e) { /* ignorar */ }
      this._map = null;
    }
    const origin = zoneByName(this._origin());
    const center = origin ? [origin.lat, origin.lng] : [4.65, -74.09];
    this._map = L.map('leafletWorkers', { scrollWheelZoom: false }).setView(center, 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap', maxZoom: 18,
    }).addTo(this._map);
    if (origin) {
      L.circle([origin.lat, origin.lng], {
        radius: (Number(this.filters.radius) >= 999 ? 25 : Number(this.filters.radius)) * 1000,
        color: '#4E7A5C', fillColor: '#4E7A5C', fillOpacity: .06, weight: 1.5, dashArray: '5 5',
      }).addTo(this._map).bindPopup(`Radio de búsqueda: ${escapeHtml(origin.name)}`);
      L.marker([origin.lat, origin.lng], {
        icon: L.divIcon({ className: 'origin-pin', html: '<i class="fas fa-crosshairs"></i>', iconSize: [26, 26] }),
      }).addTo(this._map).bindPopup('Tu zona de búsqueda');
    }
    const colors = { Disponible: '#3E6B4F', 'Medio tiempo': '#B8914A', Ocupado: '#A85B46' };
    const groups = {};
    list.forEach(w => {
      if (w.lat == null || w.lng == null) return;
      const key = `${w.lat.toFixed(4)},${w.lng.toFixed(4)}`;
      groups[key] = (groups[key] || 0) + 1;
      const jitter = (groups[key] - 1) * 0.0021;
      const marker = L.circleMarker([w.lat + jitter, w.lng + jitter], {
        radius: 10, color: '#F7F6F2', weight: 2.5,
        fillColor: colors[w.availability] || '#3A3A38', fillOpacity: .95,
      }).addTo(this._map);
      marker.bindPopup(`
        <div class="map-popup">
          <div class="map-popup-name">${escapeHtml(w.name)}</div>
          <div class="map-popup-sub">${escapeHtml(w.trade)} · ${escapeHtml(w.zone)}</div>
          <div class="map-popup-stars">${starsHtml(w.stars, 11)} ${(w.stars || 0).toFixed(1)}</div>
          <button class="map-popup-btn" onclick="ui.viewWorker('${w.id}')">Ver perfil</button>
        </div>`);
    });
    if (list.length === 1 && list[0].lat != null) {
      this._map.setView([list[0].lat, list[0].lng], 13);
    }
    setTimeout(() => { try { this._map && this._map.invalidateSize(); } catch (e) { /* ignorar */ } }, 250);
  }

  _groupByZone(list) {
    const map = {};
    list.forEach(w => {
      const z = w.zone || 'Sin zona';
      map[z] = map[z] || { zone: z, workers: [] };
      map[z].workers.push(w);
    });
    return Object.values(map).sort((a, b) => b.workers.length - a.workers.length);
  }

  /* ── Perfil público (modal) ─────────────────────────────── */

  async openProfile(workerId) {
    this._ui.openModal('<div class="page-loading"><span class="spinner dark"></span></div>', { wide: true });
    try {
      const [w, reviews, favorites, jobs] = await Promise.all([
        this._app.workers.getById(workerId),
        this._app.workers.getReviewsByWorker(workerId),
        this.isClient ? this._app.favorites.list(this.uid) : Promise.resolve([]),
        this.isClient ? this._app.jobs.getForClient(this.uid) : Promise.resolve([]),
      ]);
      if (!w) {
        this._ui.closeModal();
        this._ui.showToast('El perfil ya no está disponible.', 'error');
        return;
      }
      const fav = favorites.includes(workerId);
      const workerJobs = jobs.filter(j => j.trabajadorId === workerId);
      const reviewable = workerJobs.find(j => this._app.jobs.canReview(j, this.uid));
      const reviewed = workerJobs.some(j => j.resenaId);
      const portfolio = w.portfolioCount ? await this._app.workers.getPortfolio(workerId) : [];

      this._ui.openModal(`
        <div class="modal-header">
          <div class="modal-title">Perfil del técnico</div>
          <button class="modal-close" onclick="ui.closeModal()"><i class="fas fa-times"></i></button>
        </div>
        <div class="profile-modal-head">
          ${this._avatar(w.name, w.avatarColor, 78, w.avatarUrl, 20)}
          <div class="profile-modal-info">
            <div class="profile-name-row">
              <h2>${escapeHtml(w.name)}</h2>
              ${w.badgeVerified ? '<span class="verified-badge"><i class="fas fa-check-circle"></i> Verificado</span>' : ''}
            </div>
            <div class="profile-role"><i class="fas ${tradeIcon(w.trade)}"></i> ${escapeHtml(w.trade)} · ${w.experience || 0} años de experiencia</div>
            <div class="profile-rating">${starsHtml(w.stars, 14)} <strong>${(w.stars || 0).toFixed(1)}</strong> <span>(${w.reviewCount || reviews.length} reseñas)</span></div>
            <div class="worker-tags">
              <span class="tag"><i class="fas fa-location-dot"></i> ${escapeHtml(w.zone || 'Sin zona')}</span>
              <span class="tag"><span class="avail-dot ${availabilityClass(w.availability)}"></span>${escapeHtml(w.availability)}</span>
              <span class="tag"><i class="fas fa-eye"></i> ${w.views || 0} visitas</span>
            </div>
          </div>
          ${this.isClient ? `<button class="icon-btn ${fav ? 'on' : ''}" id="favBtn" title="Favorito"
            onclick="ui._getPage('workers').toggleFavorite('${w.id}', this)"><i class="fas fa-heart"></i></button>` : ''}
        </div>
        <p class="profile-description">${escapeHtml(w.description || 'Este técnico aún no ha agregado una descripción.')}</p>

        <div class="detail-grid">
          <div class="detail-box">
            <div class="detail-label">Visita diagnóstica</div>
            <div class="detail-value">${w.visitFee ? formatMoney(w.visitFee) : 'No cobra'}</div>
          </div>
          <div class="detail-box">
            <div class="detail-label">Hora de trabajo</div>
            <div class="detail-value">${w.hourlyFee ? formatMoney(w.hourlyFee) : 'A convenir'}</div>
          </div>
          <div class="detail-box">
            <div class="detail-label">Cobertura</div>
            <div class="detail-value small">${escapeHtml((w.coverage || []).join(', ') || w.zone || '—')}</div>
          </div>
          <div class="detail-box">
            <div class="detail-label">Horario</div>
            <div class="detail-value small">${w.schedule?.dias?.length ? `${escapeHtml(w.schedule.dias.join(', '))}<br>${escapeHtml(w.schedule.inicio || '')} – ${escapeHtml(w.schedule.fin || '')}` : 'A convenir'}</div>
          </div>
        </div>
        ${w.tarifas?.nota ? `<div class="notice notice-info"><i class="fas fa-circle-info"></i><div><strong>Nota del técnico:</strong> ${escapeHtml(w.tarifas.nota)}</div></div>` : ''}

        ${w.habilidades?.length ? `<div class="detail-section"><h3>Habilidades</h3><div class="worker-tags">${w.habilidades.map(h => `<span class="tag">${escapeHtml(h)}</span>`).join('')}</div></div>` : ''}

        ${portfolio.length ? `<div class="detail-section"><h3>Portafolio (antes y después)</h3>
          <div class="portfolio-strip">${portfolio.slice(0, 4).map(p => `
            <button class="portfolio-thumb" onclick="ui.openImage('${String(p.despues || p.antes || '').replace(/'/g, '%27')}', '${escapeHtml(p.titulo || '')}')">
              <img src="${escapeHtml(p.despues || p.antes || placeholderImage('Trabajo'))}" alt="${escapeHtml(p.titulo || '')}"/>
              <span>${escapeHtml(p.titulo || 'Trabajo')}</span>
            </button>`).join('')}</div>
          ${w.portfolioCount > 4 ? `<p class="muted small">y ${w.portfolioCount - 4} trabajos más en su perfil público.</p>` : ''}
        </div>` : ''}

        <div class="detail-section">
          <h3>Reseñas ${reviews.length ? `(${reviews.length})` : ''}</h3>
          ${reviews.length ? reviews.slice(0, 3).map(r => this._reviewItem(r)).join('')
            : '<p class="muted small">Este técnico aún no tiene reseñas publicadas.</p>'}
          ${reviewable
            ? `<div class="notice notice-success"><i class="fas fa-star"></i><div><strong>Tu servicio con ${escapeHtml(w.name.split(' ')[0])} está finalizado.</strong> Puedes calificarlo desde Mis trabajos.
              <button class="link-btn" onclick="ui.closeModal(); ui.navigateTo('jobs')">Calificar ahora</button></div></div>`
            : reviewed
              ? '<p class="muted small"><i class="fas fa-circle-check"></i> Ya calificaste un servicio de este técnico.</p>'
              : this.isClient
                ? '<p class="muted small"><i class="fas fa-lock"></i> Las reseñas se habilitan cuando un trabajo con este técnico está finalizado.</p>'
                : ''}
        </div>

        ${this.isClient ? `<div class="modal-actions wrap sticky-actions">
          ${w.contactVisible && (w.whatsapp || w.phone)
            ? `<a class="btn btn-whatsapp" href="${whatsappLink(w.whatsapp || w.phone, `Hola ${w.name}, te contacto desde TuOficioCol por un servicio de ${w.trade}.`)}" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> WhatsApp</a>`
            : `<button class="btn btn-secondary" disabled title="El técnico prefiere recibir solicitudes"><i class="fas fa-phone-slash"></i> Contacto privado</button>`}
          <button class="btn btn-secondary" onclick="ui.closeModal(); ui._getPage('workers')._openChat('${w.id}')"><i class="fas fa-comment"></i> Mensaje</button>
          <button class="btn btn-secondary" onclick="ui._getPage('workers').shareById('${w.id}')"><i class="fas fa-share-nodes"></i> Compartir</button>
          <button class="btn btn-primary" onclick="ui._getPage('workers').openRequest('${w.id}', '${escapeHtml(w.name)}')"><i class="fas fa-calendar-plus"></i> Solicitar cotización</button>
        </div>` : `<div class="modal-actions wrap"><button class="btn btn-secondary" onclick="ui.closeModal()">Cerrar</button></div>`}
      `, { wide: true });
    } catch (e) {
      this._ui.closeModal();
      this._ui.showToast(e.message || 'No se pudo abrir el perfil.', 'error');
    }
  }

  async toggleFavorite(workerId, btn) {
    const added = await this._toggleFavorite(workerId);
    btn?.classList.toggle('on', added);
  }

  async shareById(workerId) {
    const w = await this._app.workers.getById(workerId);
    if (w) this.shareWorker(w);
  }

  /* ── Solicitud directa (RF09 / HU-09) ───────────────────── */

  openRequest(workerId, workerName) {
    this._ui.openModal(`
      <div class="modal-header">
        <div class="modal-title">Solicitar cotización</div>
        <button class="modal-close" onclick="ui.closeModal()"><i class="fas fa-times"></i></button>
      </div>
      <p class="modal-copy">Cuéntale a <strong>${escapeHtml(workerName)}</strong> qué necesitas. Recibirá una notificación con la fecha, hora y dirección del servicio.</p>
      <div class="form-group"><label>Servicio</label>
        <select class="form-input" id="reqService">${CHAMBAYA.TRADES.map(t => `<option>${t}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label>Descripción del trabajo *</label>
        <textarea class="form-input" id="reqDescription" rows="3" placeholder="Ej.: Se filtra el lavaplatos y necesito revisión de la tubería."></textarea>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Fecha *</label><input class="form-input" id="reqDate" type="date" min="${this._todayIso()}" value="${this._todayIso()}"></div>
        <div class="form-group"><label>Hora *</label><input class="form-input" id="reqTime" type="time" value="09:00"></div>
      </div>
      <div class="form-group"><label>Dirección *</label><input class="form-input" id="reqAddress" placeholder="Calle 45 #12-30, Chapinero Alto"></div>
      <div class="form-row">
        <div class="form-group"><label>Zona</label>
          <select class="form-input" id="reqZone">${CHAMBAYA.ZONES.map(z => `<option ${z.name === this.user.zone ? 'selected' : ''}>${z.name}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Presupuesto (COP) *</label><input class="form-input" id="reqBudget" type="number" min="0" step="5000" placeholder="150000"></div>
      </div>
      <div class="form-error" id="reqError" style="display:none"></div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="ui.closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="reqSubmit" onclick="ui._getPage('workers').submitRequest('${workerId}', '${escapeHtml(workerName)}', this)">
          <i class="fas fa-paper-plane"></i> Enviar solicitud
        </button>
      </div>`);
  }

  async submitRequest(workerId, workerName, btn) {
    const err = document.getElementById('reqError');
    const service = document.getElementById('reqService').value;
    const description = document.getElementById('reqDescription').value.trim();
    const date = document.getElementById('reqDate').value;
    const time = document.getElementById('reqTime').value;
    const address = document.getElementById('reqAddress').value.trim();
    const zone = document.getElementById('reqZone').value;
    const budget = Number(document.getElementById('reqBudget').value);
    const fail = msg => {
      if (err) { err.textContent = msg; err.style.display = 'block'; }
      this._ui.showToast(msg, 'error');
    };
    if (!description || !date || !time || !address || !budget) return fail('Completa descripción, fecha, hora, dirección y presupuesto.');
    this._setBusy(btn, true, 'Enviando...');
    try {
      const id = await this._app.quotes.sendSuggestion({
        employerId: this.uid,
        employerName: this.user.name || this.user.nombre,
        workerId,
        service,
        description,
        zone,
        address,
        fecha: date,
        hora: time,
        budget,
      });
      await this._app.notif.notify({
        usuarioId: workerId,
        title: 'Nueva solicitud directa',
        desc: `${this.user.name} solicita ${service} en ${zone} para el ${formatDate(date)} a las ${time}.`,
        icon: 'fa-calendar-plus', color: '#4E7A5C', bg: 'rgba(78,122,92,.12)', link: 'quotes',
      });
      this._ui.closeModal();
      this._ui.showToast(`Solicitud enviada a ${workerName}. Recibirá una notificación.`, 'success', 5000);
      if (!this.isAdmin) {
        setTimeout(() => this._ui.navigateTo('quotes'), 900);
      }
      return id;
    } catch (e) {
      fail(e.message);
    } finally {
      this._setBusy(btn, false);
    }
  }
}
