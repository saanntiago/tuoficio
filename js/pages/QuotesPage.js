/**
 * Cotizaciones y ofertas (RF06, RF15 / HU-09).
 *  - Empleador: publica solicitudes, revisa ofertas y contrata a un técnico.
 *  - Trabajador: ve solicitudes cercanas, envía ofertas y responde solicitudes directas.
 */
class QuotesPage extends BasePage {
  constructor(app, ui) {
    super(app, ui);
    this.tab = 'main';
    this.filter = 'all';
    this.offerFilter = 'all';
    this.quotes = [];
    this.offersByQuote = {};
    this.offers = [];
    this.suggestions = [];
    this.workers = [];
    this.workerById = {};
  }

  async render(container, params = {}) {
    container.innerHTML = '<div class="page-loading"><span class="spinner dark"></span></div>';
    try {
      this.workers = await this._app.workers.getAll();
      this.workerById = Object.fromEntries(this.workers.map(w => [w.id, w]));
      if (this.isClient) {
        this.quotes = await this._app.quotes.getByClient(this.uid);
        const offerLists = await Promise.all(this.quotes.map(q => this._app.quotes.getOffersForQuote(q.id)));
        this.offersByQuote = Object.fromEntries(this.quotes.map((q, i) => [q.id, offerLists[i]]));
        this.suggestions = await this._app.quotes.getSuggestionsByClient(this.uid);
      } else if (this.isWorker) {
        this.quotes = this._app.workers.recommendJobsForWorker(await this._app.quotes.getActive(), {
          trade: this.user.oficio, zone: this.user.zone,
          coverage: (this.workerById[this.uid]?.coverage || []),
        });
        this.offers = await this._app.quotes.getOffersByWorker(this.uid);
        this.suggestions = await this._app.quotes.getSuggestionsForWorker(this.uid);
      } else {
        this.quotes = await this._app.quotes.getActive();
      }
    } catch (e) {
      container.innerHTML = this._empty('fa-triangle-exclamation', 'No se pudieron cargar las cotizaciones', escapeHtml(e.message));
      return;
    }
    if (!this._alive) return;

    container.innerHTML = this.isWorker ? this._workerView() : this.isAdmin ? this._adminView() : this._clientView();
    if (this.isClient && this.tab === 'main' && this.filter === 'offers') this._expandClientOffers();
    if (params.new && this.isClient) this.openQuoteModal();
  }

  /* ── Empleador ──────────────────────────────────────────── */

  _clientView() {
    const active = this.quotes.filter(q => q.status === CHAMBAYA.QUOTE_STATUS.OPEN);
    const assigned = this.quotes.filter(q => q.status === CHAMBAYA.QUOTE_STATUS.ASSIGNED);
    const totalOffers = Object.values(this.offersByQuote).reduce((s, list) => s + list.filter(o => o.estado !== 'Rechazada').length, 0);
    const pendingSuggestions = this.suggestions.filter(s => (s.status || s.estado) === 'Enviada');
    return `
      ${this._header('Mis solicitudes', 'Publica lo que necesitas y recibe ofertas de técnicos verificados. También puedes enviar una solicitud directa desde cualquier perfil.',
        `<button class="btn btn-primary" onclick="ui._getPage('quotes').openQuoteModal()"><i class="fas fa-plus"></i> Nueva solicitud</button>`)}
      <div class="stats-grid">
        ${this._statCard('fa-file-circle-check', '#4E7A5C', 'rgba(78,122,92,.12)', active.length, 'Solicitudes activas', 'Esperando ofertas', "ui._getPage('quotes').showClientSection('open')", 'open', this.tab === 'main' && this.filter === 'open')}
        ${this._statCard('fa-hand-holding-dollar', '#B8914A', 'rgba(184,145,74,.14)', totalOffers, 'Ofertas recibidas', 'De técnicos interesados', "ui._getPage('quotes').showClientSection('offers')", 'offers', this.tab === 'main' && this.filter === 'offers')}
        ${this._statCard('fa-clipboard-check', '#3A3A38', 'rgba(58,58,56,.1)', assigned.length, 'Servicios contratados', 'Con técnico asignado', "ui._getPage('quotes').showClientSection('assigned')", 'assigned', this.tab === 'main' && this.filter === 'assigned')}
        ${this._statCard('fa-paper-plane', '#A85B46', 'rgba(168,91,70,.12)', pendingSuggestions.length, 'Solicitudes directas', 'Enviadas a un técnico', "ui._getPage('quotes').showClientSection('direct')", 'direct', this.tab === 'direct')}
      </div>
      <div class="tabs-bar">
        <button class="tab-btn ${this.tab === 'main' ? 'active' : ''}" onclick="ui._getPage('quotes').setTab('main')">Solicitudes publicadas</button>
        <button class="tab-btn ${this.tab === 'direct' ? 'active' : ''}" onclick="ui._getPage('quotes').setTab('direct')">Solicitudes directas ${pendingSuggestions.length ? `<span class="tab-count">${pendingSuggestions.length}</span>` : ''}</button>
      </div>
      <div id="quotesTabBody">${this.tab === 'direct' ? this._clientSuggestions() : this._clientQuotes()}</div>`;
  }

  _filteredClientQuotes() {
    if (this.filter === 'open') return this.quotes.filter(q => q.status === CHAMBAYA.QUOTE_STATUS.OPEN);
    if (this.filter === 'assigned') return this.quotes.filter(q => q.status === CHAMBAYA.QUOTE_STATUS.ASSIGNED);
    if (this.filter === 'offers') {
      return this.quotes.filter(q => (this.offersByQuote[q.id] || []).some(o => o.estado !== 'Rechazada'));
    }
    return this.quotes;
  }

  _clientQuotes() {
    if (!this.quotes.length) {
      return this._empty('fa-file-circle-plus', 'Todavía no has publicado solicitudes',
        'Cuéntanos qué necesitas y los técnicos de tu zona te enviarán sus ofertas.',
        '<button class="btn btn-primary" onclick="ui._getPage(\'quotes\').openQuoteModal()"><i class="fas fa-plus"></i> Crear mi primera solicitud</button>');
    }
    const quotes = this._filteredClientQuotes();
    const filterMeta = {
      open: { icon: 'fa-file-circle-check', label: 'solicitudes activas' },
      offers: { icon: 'fa-hand-holding-dollar', label: 'solicitudes con ofertas' },
      assigned: { icon: 'fa-clipboard-check', label: 'servicios contratados' },
    }[this.filter];
    if (!quotes.length) {
      return this._empty('fa-filter-circle-xmark', 'Sin resultados en este filtro',
        `No tienes ${filterMeta ? filterMeta.label : 'solicitudes que coincidan'} por ahora.`,
        '<button class="btn btn-secondary" onclick="ui._getPage(\'quotes\').showClientSection(\'all\')"><i class="fas fa-rotate-left"></i> Ver todas</button>');
    }
    const banner = filterMeta
      ? this._filterBanner(filterMeta.icon, filterMeta.label, quotes.length, "ui._getPage('quotes').showClientSection('all')")
      : '';
    return `${banner}<div class="quote-list">${quotes.map(q => {
      const offers = this.offersByQuote[q.id] || [];
      const open = q.status === CHAMBAYA.QUOTE_STATUS.OPEN;
      return `<article class="quote-card ${open ? '' : 'closed'}">
        <div class="quote-card-head">
          <div class="quote-icon"><i class="fas ${tradeIcon(q.service)}"></i></div>
          <div class="quote-head-body">
            <div class="quote-title">${escapeHtml(q.service)} <span class="quote-zone"><i class="fas fa-location-dot"></i> ${escapeHtml(q.zona || '')}</span></div>
            <div class="quote-sub">Publicada ${timeAgo(q.createdAt)} · ${escapeHtml(q.address || '')}</div>
          </div>
          ${this._statusPill(q.status || 'Activa')}
        </div>
        <p class="quote-desc">${escapeHtml(q.description || '')}</p>
        <div class="quote-meta">
          <span><i class="fas fa-calendar"></i> ${formatDate(q.fecha)} ${escapeHtml(q.hora || '')}</span>
          <span><i class="fas fa-wallet"></i> Presupuesto ${formatMoney(q.budget)}</span>
          ${q.duracionEstimada ? `<span><i class="fas fa-clock"></i> ${escapeHtml(q.duracionEstimada)}</span>` : ''}
          ${q.urgencia ? `<span><i class="fas fa-bolt"></i> ${escapeHtml(q.urgencia)}</span>` : ''}
        </div>
        <div class="quote-card-foot">
          <button class="btn btn-sm btn-secondary" onclick="ui._getPage('quotes').toggleOffers('${q.id}', this)">
            <i class="fas fa-hand-holding-dollar"></i> ${offers.length} oferta${offers.length === 1 ? '' : 's'}
            <i class="fas fa-chevron-down"></i>
          </button>
          ${open ? `<button class="link-btn danger" onclick="ui._getPage('quotes').closeQuote('${q.id}')">Cerrar solicitud</button>` : ''}
        </div>
        <div class="offers-box hidden" id="offers-${q.id}">
          ${offers.length ? offers.map(o => this._offerRow(q, o)).join('') : '<p class="muted small">Aún no hay ofertas. Los técnicos de tu zona fueron notificados.</p>'}
        </div>
      </article>`;
    }).join('')}</div>`;
  }

  _offerRow(quote, offer) {
    const worker = this.workerById[offer.trabajadorId] || {};
    const canAccept = quote.status === CHAMBAYA.QUOTE_STATUS.OPEN && offer.estado !== 'Rechazada' && offer.estado !== 'Aceptada';
    const statusPill = offer.estado === 'Aceptada'
      ? this._statusPill('Contratada', 'verified')
      : offer.estado === 'Rechazada'
        ? this._statusPill('No seleccionada', 'rejected')
        : this._statusPill('Recibida', 'pending');
    return `<div class="offer-row">
      ${this._avatar(offer.trabajadorNombre || worker.name, worker.avatarColor || '#3A3A38', 40, worker.avatarUrl, 12)}
      <div class="offer-body">
        <div class="offer-name">${escapeHtml(offer.trabajadorNombre || worker.name || 'Técnico')}
          ${worker.badgeVerified ? '<i class="fas fa-circle-check verified-icon" title="Verificado"></i>' : ''}
          ${worker.stars ? `<span class="offer-rating">${worker.stars.toFixed(1)}★</span>` : ''}
        </div>
        <div class="offer-message">${escapeHtml(offer.mensaje || 'Sin mensaje adicional.')}</div>
        <div class="offer-meta">${offer.tiempoEstimado ? `<span><i class="fas fa-clock"></i> ${escapeHtml(offer.tiempoEstimado)}</span>` : ''} ${statusPill}</div>
      </div>
      <div class="offer-side">
        <div class="offer-price">${formatMoney(offer.precio)}</div>
        ${canAccept ? `<button class="btn btn-sm btn-primary" onclick="ui._getPage('quotes').acceptOffer('${quote.id}', '${offer.id}', this)"><i class="fas fa-check"></i> Contratar</button>` : ''}
      </div>
    </div>`;
  }

  _clientSuggestions() {
    if (!this.suggestions.length) {
      return this._empty('fa-paper-plane', 'Sin solicitudes directas',
        'Entra al directorio, abre el perfil de un técnico y envíale una solicitud con fecha, hora, dirección y presupuesto.',
        '<button class="btn btn-primary" onclick="ui.navigateTo(\'workers\')"><i class="fas fa-search"></i> Buscar técnico</button>');
    }
    const sorted = [...this.suggestions].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    return `<div class="quote-list">${sorted.map(s => {
      const worker = this.workerById[s.trabajadorId] || {};
      const status = s.status || s.estado || 'Enviada';
      return `<article class="quote-card">
        <div class="quote-card-head">
          ${this._avatar(worker.name || 'Técnico', worker.avatarColor || '#3A3A38', 46, worker.avatarUrl, 12)}
          <div class="quote-head-body">
            <div class="quote-title">${escapeHtml(worker.name || 'Técnico')} <span class="quote-zone">${escapeHtml(worker.trade || s.service || '')}</span></div>
            <div class="quote-sub">Enviada ${timeAgo(s.createdAt)} · ${escapeHtml(s.service || '')}</div>
          </div>
          ${this._statusPill(status, status === 'Aceptada' ? 'verified' : status === 'Rechazada' ? 'rejected' : 'pending')}
        </div>
        <p class="quote-desc">${escapeHtml(s.description || '')}</p>
        <div class="quote-meta">
          <span><i class="fas fa-calendar"></i> ${formatDate(s.fecha)} ${escapeHtml(s.hora || '')}</span>
          <span><i class="fas fa-location-dot"></i> ${escapeHtml(s.address || s.zone || '')}</span>
          <span><i class="fas fa-wallet"></i> ${formatMoney(s.budget)}</span>
        </div>
      </article>`;
    }).join('')}</div>`;
  }

  /* ── Trabajador ─────────────────────────────────────────── */

  _workerView() {
    const myQuoteIds = new Set(this.offers.map(o => o.cotizacionId));
    const pendingSuggestions = this.suggestions.filter(s => (s.status || s.estado) === 'Enviada');
    return `
      ${this._header('Solicitudes y ofertas', 'Encuentra trabajos compatibles con tu oficio y tu zona. Envía una oferta con tu precio y tiempo estimado.',
        `<button class="btn btn-secondary" onclick="ui.navigateTo('availability')"><i class="fas fa-clock"></i> Mi disponibilidad</button>`)}
      <div class="stats-grid">
        ${this._statCard('fa-briefcase', '#4E7A5C', 'rgba(78,122,92,.12)', this.quotes.length, 'Solicitudes cercanas', 'Según oficio y zona', "ui._getPage('quotes').showWorkerSection('nearby')", 'nearby', this.tab === 'main')}
        ${this._statCard('fa-paper-plane', '#B8914A', 'rgba(184,145,74,.14)', this.offers.length, 'Ofertas enviadas', 'En espera de respuesta', "ui._getPage('quotes').showWorkerSection('offers')", 'offers', this.tab === 'offers' && this.offerFilter === 'all')}
        ${this._statCard('fa-envelope-open-text', '#3A3A38', 'rgba(58,58,56,.1)', pendingSuggestions.length, 'Solicitudes directas', 'Clientes interesados', "ui._getPage('quotes').showWorkerSection('direct')", 'direct', this.tab === 'direct')}
        ${this._statCard('fa-handshake', '#A85B46', 'rgba(168,91,70,.12)', this.offers.filter(o => o.estado === 'Aceptada').length, 'Ofertas aceptadas', 'Trabajos ganados', "ui._getPage('quotes').showWorkerSection('accepted')", 'accepted', this.tab === 'offers' && this.offerFilter === 'accepted')}
      </div>
      <div class="tabs-bar">
        <button class="tab-btn ${this.tab === 'main' ? 'active' : ''}" onclick="ui._getPage('quotes').setTab('main')">Cercanas a mí</button>
        <button class="tab-btn ${this.tab === 'offers' ? 'active' : ''}" onclick="ui._getPage('quotes').setTab('offers')">Mis postulaciones</button>
        <button class="tab-btn ${this.tab === 'direct' ? 'active' : ''}" onclick="ui._getPage('quotes').setTab('direct')">Solicitudes directas ${pendingSuggestions.length ? `<span class="tab-count">${pendingSuggestions.length}</span>` : ''}</button>
      </div>
      <div id="quotesTabBody">${this.tab === 'offers' ? this._workerOffers() : this.tab === 'direct' ? this._workerSuggestions() : this._workerNearby(myQuoteIds)}</div>`;
  }

  _workerNearby(myQuoteIds) {
    if (!this.quotes.length) {
      return this._empty('fa-location-dot', 'No hay solicitudes en tu zona',
        'Cuando un cliente publique un trabajo de tu oficio cerca, aparecerá aquí. Mantén tu disponibilidad activa.',
        '<button class="btn btn-secondary" onclick="ui.navigateTo(\'workers\')">Ver directorio</button>');
    }
    return `<div class="quote-list">${this.quotes.map(q => {
      const sent = myQuoteIds.has(q.id);
      return `<article class="quote-card">
        <div class="quote-card-head">
          <div class="quote-icon"><i class="fas ${tradeIcon(q.service)}"></i></div>
          <div class="quote-head-body">
            <div class="quote-title">${escapeHtml(q.service)} <span class="quote-zone"><i class="fas fa-location-dot"></i> ${escapeHtml(q.zona || '')}</span></div>
            <div class="quote-sub">${escapeHtml(q.clienteNombre || 'Cliente')} · publicada ${timeAgo(q.createdAt)}</div>
          </div>
          <div class="quote-budget">${formatMoney(q.budget)}</div>
        </div>
        <p class="quote-desc">${escapeHtml(q.description || '')}</p>
        <div class="quote-meta">
          <span><i class="fas fa-calendar"></i> ${formatDate(q.fecha)} ${escapeHtml(q.hora || '')}</span>
          <span><i class="fas fa-location-dot"></i> ${escapeHtml(q.address || '')}</span>
          ${q.urgencia ? `<span><i class="fas fa-bolt"></i> ${escapeHtml(q.urgencia)}</span>` : ''}
        </div>
        <div class="quote-card-foot">
          <span class="muted small">${q.ofertasCount || 0} oferta(s) recibida(s)</span>
          ${sent
            ? '<span class="status-pill pending"><i class="fas fa-check"></i> Oferta enviada</span>'
            : `<button class="btn btn-sm btn-primary" onclick="ui._getPage('quotes').openOffer('${q.id}')"><i class="fas fa-paper-plane"></i> Enviar oferta</button>`}
        </div>
      </article>`;
    }).join('')}</div>`;
  }

  _workerOffers() {
    const onlyAccepted = this.offerFilter === 'accepted';
    if (!this.offers.length) {
      return this._empty(onlyAccepted ? 'fa-handshake' : 'fa-paper-plane',
        onlyAccepted ? 'Aún no tienes ofertas aceptadas' : 'Aún no has enviado ofertas',
        onlyAccepted ? 'Cuando un cliente acepte una de tus propuestas, la verás aquí.' : 'Explora las solicitudes cercanas y envía tu propuesta con precio y tiempo estimado.');
    }
    const offers = onlyAccepted ? this.offers.filter(o => o.estado === 'Aceptada') : this.offers;
    if (!offers.length) {
      return this._empty('fa-handshake', 'Aún no tienes ofertas aceptadas',
        'Cuando un cliente acepte una de tus propuestas, la verás aquí y el trabajo aparecerá en Mis trabajos.',
        '<button class="btn btn-secondary" onclick="ui._getPage(\'quotes\').showWorkerSection(\'offers\')"><i class="fas fa-rotate-left"></i> Ver todas mis ofertas</button>');
    }
    const banner = onlyAccepted
      ? this._filterBanner('fa-handshake', 'ofertas aceptadas', offers.length, "ui._getPage('quotes').showWorkerSection('offers')")
      : '';
    const sorted = [...offers].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    return `${banner}<div class="quote-list">${sorted.map(o => {
      const status = o.estado || 'Enviada';
      return `<article class="quote-card">
        <div class="quote-card-head">
          <div class="quote-icon"><i class="fas fa-paper-plane"></i></div>
          <div class="quote-head-body">
            <div class="quote-title">Oferta enviada</div>
            <div class="quote-sub">${timeAgo(o.createdAt)} · ${escapeHtml(o.tiempoEstimado || 'Tiempo a convenir')}</div>
          </div>
          ${this._statusPill(status, status === 'Aceptada' ? 'verified' : status === 'Rechazada' ? 'rejected' : 'pending')}
        </div>
        <p class="quote-desc">${escapeHtml(o.mensaje || 'Sin mensaje adicional.')}</p>
        <div class="quote-meta"><span><i class="fas fa-wallet"></i> Mi propuesta: ${formatMoney(o.precio)}</span></div>
      </article>`;
    }).join('')}</div>`;
  }

  _workerSuggestions() {
    if (!this.suggestions.length) {
      return this._empty('fa-envelope-open-text', 'Sin solicitudes directas', 'Cuando un cliente te contacte desde tu perfil, verás aquí la fecha, hora, dirección y presupuesto.');
    }
    const sorted = [...this.suggestions].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    return `<div class="quote-list">${sorted.map(s => {
      const status = s.status || s.estado || 'Enviada';
      return `<article class="quote-card">
        <div class="quote-card-head">
          <div class="quote-icon"><i class="fas fa-envelope-open-text"></i></div>
          <div class="quote-head-body">
            <div class="quote-title">${escapeHtml(s.service || 'Servicio')} <span class="quote-zone"><i class="fas fa-location-dot"></i> ${escapeHtml(s.zone || '')}</span></div>
            <div class="quote-sub">${escapeHtml(s.employerName || 'Cliente')} · ${timeAgo(s.createdAt)}</div>
          </div>
          ${this._statusPill(status, status === 'Aceptada' ? 'verified' : status === 'Rechazada' ? 'rejected' : 'pending')}
        </div>
        <p class="quote-desc">${escapeHtml(s.description || '')}</p>
        <div class="quote-meta">
          <span><i class="fas fa-calendar"></i> ${formatDate(s.fecha)} ${escapeHtml(s.hora || '')}</span>
          <span><i class="fas fa-location-dot"></i> ${escapeHtml(s.address || '')}</span>
          <span><i class="fas fa-wallet"></i> ${formatMoney(s.budget)}</span>
        </div>
        ${status === 'Enviada' ? `<div class="quote-card-foot">
          <button class="btn btn-sm btn-secondary" onclick="ui._getPage('quotes').rejectSuggestion('${s.id}', this)">No puedo</button>
          <button class="btn btn-sm btn-primary" onclick="ui._getPage('quotes').acceptSuggestion('${s.id}', this)"><i class="fas fa-handshake"></i> Aceptar trabajo</button>
        </div>` : ''}
      </article>`;
    }).join('')}</div>`;
  }

  _adminView() {
    return `${this._header('Cotizaciones activas', 'Solicitudes publicadas por los empleadores en toda la ciudad.')}
      ${this.quotes.length ? `<div class="quote-list">${this.quotes.map(q => `
        <article class="quote-card">
          <div class="quote-card-head">
            <div class="quote-icon"><i class="fas ${tradeIcon(q.service)}"></i></div>
            <div class="quote-head-body">
              <div class="quote-title">${escapeHtml(q.service)} <span class="quote-zone">${escapeHtml(q.zona || '')}</span></div>
              <div class="quote-sub">${escapeHtml(q.clienteNombre || 'Cliente')} · ${timeAgo(q.createdAt)}</div>
            </div>
            <div class="quote-budget">${formatMoney(q.budget)}</div>
          </div>
          <p class="quote-desc">${escapeHtml(q.description || '')}</p>
        </article>`).join('')}</div>` : this._empty('fa-file-circle-xmark', 'Sin cotizaciones activas', 'No hay solicitudes abiertas en este momento.')}`;
  }

  /* ── Interacción ────────────────────────────────────────── */

  setTab(tab) {
    this.tab = tab;
    this.filter = 'all';
    this.offerFilter = 'all';
    this._renderTabBody();
  }

  showClientSection(section) {
    if (!this.isClient) return;
    this.tab = section === 'direct' ? 'direct' : 'main';
    this.filter = this.tab === 'main' ? section : 'all';
    this._renderTabBody();
    this._scrollToTabBody();
    if (this.filter === 'offers') this._expandClientOffers();
  }

  showWorkerSection(section) {
    if (!this.isWorker) return;
    this.tab = section === 'nearby' ? 'main' : section === 'accepted' ? 'offers' : section;
    this.offerFilter = section === 'accepted' ? 'accepted' : 'all';
    this._renderTabBody();
    this._scrollToTabBody();
  }

  _renderTabBody() {
    const body = document.getElementById('quotesTabBody');
    if (!body) return;
    if (this.isClient) body.innerHTML = this.tab === 'direct' ? this._clientSuggestions() : this._clientQuotes();
    else body.innerHTML = this.tab === 'offers' ? this._workerOffers() : this.tab === 'direct' ? this._workerSuggestions() : this._workerNearby(new Set(this.offers.map(o => o.cotizacionId)));
    document.querySelectorAll('.tabs-bar .tab-btn').forEach(b => b.classList.toggle('active', b.getAttribute('onclick')?.includes(`'${this.tab}'`)));
    const activeKey = this.isClient
      ? (this.tab === 'direct' ? 'direct' : this.filter)
      : this.isWorker
        ? (this.tab === 'direct' ? 'direct' : this.tab === 'offers' ? (this.offerFilter === 'accepted' ? 'accepted' : 'offers') : 'nearby')
        : '';
    this._syncStatCards(activeKey);
  }

  _scrollToTabBody() {
    requestAnimationFrame(() => document.getElementById('quotesTabBody')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  }

  _expandClientOffers() {
    requestAnimationFrame(() => {
      document.querySelectorAll('#quotesTabBody .offers-box').forEach(box => {
        box.classList.remove('hidden');
        box.closest('.quote-card')?.querySelector('.quote-card-foot .btn')?.classList.add('open');
      });
    });
  }

  toggleOffers(quoteId, btn) {
    const box = document.getElementById(`offers-${quoteId}`);
    if (!box) return;
    const hidden = box.classList.toggle('hidden');
    btn?.classList.toggle('open', !hidden);
  }

  openQuoteModal() {
    this._ui.openModal(`
      <div class="modal-header">
        <div class="modal-title">Nueva solicitud de servicio</div>
        <button class="modal-close" onclick="ui.closeModal()"><i class="fas fa-times"></i></button>
      </div>
      <p class="modal-copy">Describe el trabajo y recibe ofertas de técnicos cercanos. La fecha, hora y dirección se comparten con los interesados.</p>
      <div class="form-row">
        <div class="form-group"><label>Servicio *</label>
          <select class="form-input" id="qService">${CHAMBAYA.TRADES.map(t => `<option>${t}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Zona *</label>
          <select class="form-input" id="qZone">${CHAMBAYA.ZONES.map(z => `<option ${z.name === this.user.zone ? 'selected' : ''}>${z.name}</option>`).join('')}</select>
        </div>
      </div>
      <div class="form-group"><label>Descripción del trabajo *</label>
        <textarea class="form-input" id="qDescription" rows="3" placeholder="Ej.: Se filtra agua debajo del lavaplatos. Necesito revisión y arreglo."></textarea>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Fecha *</label><input class="form-input" id="qDate" type="date" min="${this._todayIso()}" value="${this._todayIso()}"></div>
        <div class="form-group"><label>Hora *</label><input class="form-input" id="qTime" type="time" value="09:00"></div>
      </div>
      <div class="form-group"><label>Dirección *</label><input class="form-input" id="qAddress" placeholder="Calle 45 #12-30, Chapinero Alto"></div>
      <div class="form-row">
        <div class="form-group"><label>Presupuesto estimado (COP) *</label><input class="form-input" id="qBudget" type="number" min="0" step="5000" placeholder="150000"></div>
        <div class="form-group"><label>Urgencia</label>
          <select class="form-input" id="qUrgency"><option>Flexible</option><option>Esta semana</option><option>Urgente</option></select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Duración estimada</label><input class="form-input" id="qDuration" placeholder="2 horas"></div>
        <div class="form-group"></div>
      </div>
      <div class="form-error" id="qError" style="display:none"></div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="ui.closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="qSubmit" onclick="ui._getPage('quotes').submitQuote(this)"><i class="fas fa-paper-plane"></i> Publicar solicitud</button>
      </div>`);
  }

  async submitQuote(btn) {
    const err = document.getElementById('qError');
    const fail = msg => { if (err) { err.textContent = msg; err.style.display = 'block'; } this._ui.showToast(msg, 'error'); };
    const service = document.getElementById('qService').value;
    const zone = document.getElementById('qZone').value;
    const description = document.getElementById('qDescription').value.trim();
    const fecha = document.getElementById('qDate').value;
    const hora = document.getElementById('qTime').value;
    const address = document.getElementById('qAddress').value.trim();
    const budget = Number(document.getElementById('qBudget').value);
    if (!description || !fecha || !hora || !address || !budget) return fail('Completa descripción, fecha, hora, dirección y presupuesto.');
    this._setBusy(btn, true, 'Publicando...');
    try {
      await this._app.quotes.create({
        clientId: this.uid,
        clienteNombre: this.user.name,
        service, description, zone, zona: zone, address, fecha, hora, budget,
        urgencia: document.getElementById('qUrgency').value,
        duracionEstimada: document.getElementById('qDuration').value.trim(),
      });
      const matches = this.workers.filter(w => w.trade === service && w.active !== false).slice(0, 12);
      await Promise.all(matches.map(w => this._app.notif.notify({
        usuarioId: w.id,
        title: 'Nueva solicitud cerca',
        desc: `${this.user.name} busca ${service} en ${zone} para el ${formatDate(fecha)}.`,
        icon: 'fa-briefcase', color: '#3A3A38', bg: 'rgba(58,58,56,.1)', link: 'quotes',
      })));
      this._ui.closeModal();
      this._ui.showToast('Solicitud publicada. Los técnicos de tu zona fueron notificados.', 'success', 5000);
      this._reload();
    } catch (e) {
      fail(e.message);
    } finally {
      this._setBusy(btn, false);
    }
  }

  async closeQuote(quoteId) {
    const ok = await this._ui.confirm({
      title: 'Cerrar solicitud',
      message: '¿Cerrar esta solicitud? Los técnicos ya no podrán enviar ofertas.',
      confirmText: 'Cerrar solicitud', danger: true,
    });
    if (!ok) return;
    await this._app.quotes.close(quoteId);
    this._ui.showToast('Solicitud cerrada.', 'success');
    this._reload();
  }

  async acceptOffer(quoteId, offerId, btn) {
    const quote = await this._app.quotes.getById(quoteId);
    const offers = await this._app.quotes.getOffersForQuote(quoteId);
    const offer = offers.find(o => o.id === offerId);
    if (!quote || !offer) return this._ui.showToast('La oferta ya no está disponible.', 'error');
    const ok = await this._ui.confirm({
      title: 'Contratar técnico',
      message: `Vas a contratar a ${offer.trabajadorNombre} por ${formatMoney(offer.precio)}. El trabajo quedará en "Mis trabajos" para hacer seguimiento.`,
      confirmText: 'Contratar',
    });
    if (!ok) return;
    this._setBusy(btn, true, 'Contratando...');
    try {
      const jobId = await this._app.jobs.create({
        cotizacionId: quoteId,
        clientId: quote.clientId,
        clienteNombre: quote.clienteNombre,
        trabajadorId: offer.trabajadorId,
        trabajadorNombre: offer.trabajadorNombre,
        service: quote.service,
        description: quote.description,
        address: quote.address,
        zona: quote.zona,
        presupuesto: offer.precio,
        fecha: quote.fecha,
        hora: quote.hora,
      });
      await this._app.quotes.updateOffer(offer.id, { estado: 'Aceptada', trabajoId: jobId });
      await Promise.all(offers.filter(o => o.id !== offer.id).map(o => this._app.quotes.updateOffer(o.id, { estado: 'Rechazada' })));
      await this._app.db.update(CHAMBAYA.COLLECTIONS.QUOTES, quoteId, {
        status: CHAMBAYA.QUOTE_STATUS.ASSIGNED,
        estado: CHAMBAYA.QUOTE_STATUS.ASSIGNED,
        trabajadorAsignadoId: offer.trabajadorId,
        trabajoId: jobId,
      });
      await this._app.notif.notify({
        usuarioId: offer.trabajadorId,
        title: '¡Te contrataron!',
        desc: `${quote.clienteNombre} aceptó tu oferta para ${quote.service} el ${formatDate(quote.fecha)}.`,
        icon: 'fa-handshake', color: '#4E7A5C', bg: 'rgba(78,122,92,.12)', link: 'jobs',
      });
      await this._app.notif.notify({
        usuarioId: quote.clientId,
        title: 'Servicio contratado',
        desc: `${offer.trabajadorNombre} realizará ${quote.service}. Revisa el detalle en Mis trabajos.`,
        icon: 'fa-clipboard-check', color: '#3A3A38', bg: 'rgba(58,58,56,.1)', link: 'jobs',
      });
      this._ui.showToast(`Contrataste a ${offer.trabajadorNombre}.`, 'success', 5000);
      this._ui.navigateTo('jobs');
    } catch (e) {
      this._ui.showToast(e.message, 'error');
    } finally {
      this._setBusy(btn, false);
    }
  }

  openOffer(quoteId) {
    const quote = this.quotes.find(q => q.id === quoteId);
    if (!quote) return;
    this._ui.openModal(`
      <div class="modal-header">
        <div class="modal-title">Enviar oferta</div>
        <button class="modal-close" onclick="ui.closeModal()"><i class="fas fa-times"></i></button>
      </div>
      <div class="offer-context">
        <strong>${escapeHtml(quote.service)} · ${escapeHtml(quote.zona || '')}</strong>
        <p>${escapeHtml(quote.description || '')}</p>
        <span class="muted small">Presupuesto del cliente: ${formatMoney(quote.budget)}</span>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Mi precio (COP) *</label><input class="form-input" id="oPrice" type="number" min="0" step="5000" value="${Number(quote.budget) || ''}"></div>
        <div class="form-group"><label>Tiempo estimado</label><input class="form-input" id="oTime" placeholder="Ej.: 2 horas"></div>
      </div>
      <div class="form-group"><label>Mensaje para el cliente</label>
        <textarea class="form-input" id="oMessage" rows="3" placeholder="Cuéntale cómo resolverás el trabajo y cuándo puedes ir..."></textarea>
      </div>
      <div class="form-error" id="oError" style="display:none"></div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="ui.closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="oSubmit" onclick="ui._getPage('quotes').submitOffer('${quoteId}', this)"><i class="fas fa-paper-plane"></i> Enviar oferta</button>
      </div>`);
  }

  async submitOffer(quoteId, btn) {
    const err = document.getElementById('oError');
    const fail = msg => { if (err) { err.textContent = msg; err.style.display = 'block'; } this._ui.showToast(msg, 'error'); };
    const precio = Number(document.getElementById('oPrice').value);
    const tiempo = document.getElementById('oTime').value.trim();
    const mensaje = document.getElementById('oMessage').value.trim();
    if (!precio) return fail('Ingresa tu precio.');
    this._setBusy(btn, true, 'Enviando...');
    try {
      const { quote } = await this._app.quotes.sendOffer({
        quoteId, workerId: this.uid, workerName: this.user.name,
        precio, tiempoEstimado: tiempo, mensaje,
      });
      await this._app.notif.notify({
        usuarioId: quote.clientId,
        title: 'Nueva oferta recibida',
        desc: `${this.user.name} envió una oferta de ${formatMoney(precio)} para ${quote.service}.`,
        icon: 'fa-hand-holding-dollar', color: '#B8914A', bg: 'rgba(184,145,74,.16)', link: 'quotes',
      });
      this._ui.closeModal();
      this._ui.showToast('Oferta enviada al cliente.', 'success');
      this._reload();
    } catch (e) {
      fail(e.message);
    } finally {
      this._setBusy(btn, false);
    }
  }

  async acceptSuggestion(id, btn) {
    const suggestion = this.suggestions.find(s => s.id === id);
    if (!suggestion) return;
    const ok = await this._ui.confirm({
      title: 'Aceptar trabajo',
      message: `Aceptarás el servicio de ${suggestion.service} en ${suggestion.zone} por ${formatMoney(suggestion.budget)}. El cliente verá el trabajo activo.`,
      confirmText: 'Aceptar',
    });
    if (!ok) return;
    this._setBusy(btn, true, 'Aceptando...');
    try {
      const jobId = await this._app.jobs.create({
        cotizacionId: null,
        clientId: suggestion.employerId,
        clienteNombre: suggestion.employerName,
        trabajadorId: this.uid,
        trabajadorNombre: this.user.name,
        service: suggestion.service,
        description: suggestion.description,
        address: suggestion.address,
        zona: suggestion.zone,
        presupuesto: suggestion.budget,
        fecha: suggestion.fecha,
        hora: suggestion.hora,
      });
      await this._app.quotes.updateSuggestion(id, { status: 'Aceptada', estado: 'Aceptada', trabajoId: jobId });
      await this._app.notif.notify({
        usuarioId: suggestion.employerId,
        title: 'Solicitud aceptada',
        desc: `${this.user.name} aceptó tu solicitud de ${suggestion.service} para el ${formatDate(suggestion.fecha)}.`,
        icon: 'fa-handshake', color: '#4E7A5C', bg: 'rgba(78,122,92,.12)', link: 'jobs',
      });
      this._ui.showToast('Trabajo aceptado. Revísalo en Mis trabajos.', 'success');
      this._ui.navigateTo('jobs');
    } catch (e) {
      this._ui.showToast(e.message, 'error');
    } finally {
      this._setBusy(btn, false);
    }
  }

  async rejectSuggestion(id, btn) {
    const ok = await this._ui.confirm({
      title: 'Rechazar solicitud',
      message: '¿Indicar al cliente que no puedes tomar este trabajo?',
      confirmText: 'Sí, rechazar', danger: true,
    });
    if (!ok) return;
    const suggestion = this.suggestions.find(s => s.id === id);
    this._setBusy(btn, true, 'Enviando...');
    try {
      await this._app.quotes.updateSuggestion(id, { status: 'Rechazada', estado: 'Rechazada' });
      if (suggestion) {
        await this._app.notif.notify({
          usuarioId: suggestion.employerId,
          title: 'Solicitud no aceptada',
          desc: `${this.user.name} no puede tomar el servicio de ${suggestion.service}. Puedes buscar otro técnico.`,
          icon: 'fa-circle-xmark', color: '#A85B46', bg: 'rgba(168,91,70,.12)', link: 'workers',
        });
      }
      this._ui.showToast('Respuesta enviada al cliente.', 'success');
      this._reload();
    } catch (e) {
      this._ui.showToast(e.message, 'error');
    } finally {
      this._setBusy(btn, false);
    }
  }
}
