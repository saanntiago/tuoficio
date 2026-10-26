/**
 * Capa pública de TuOficioCol.
 *
 * La usan las páginas abiertas (index.html, buscar.html y perfil.html) para
 * leer únicamente información publicable: el directorio de técnicos y sus
 * reseñas. Si Firestore está disponible se consulta la base real; si no, se
 * lee el mismo almacén local que usa el modo demostración de la aplicación.
 *
 * Nunca escribe datos ni importa servicios de autenticación.
 */
const PublicData = (() => {
  const PALETTE = ['#4E7A5C', '#33503E', '#A89878', '#6E6B64', '#3E6B4F', '#8C8C88', '#5A5A56', '#6B5E45'];

  let mode = 'local';
  let db = null;
  let workersCache = null;
  const reviewsCache = new Map();

  function colorFor(id) {
    const s = String(id || '');
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return PALETTE[h % PALETTE.length];
  }

  function normalize(row) {
    const zone = row.zona || '';
    const z = zoneByName(zone);
    const ubicacion = row.ubicacion || {};
    const lat = ubicacion.lat ?? row.lat ?? z?.lat ?? null;
    const lng = ubicacion.lng ?? row.lng ?? z?.lng ?? null;
    return {
      id: row.id,
      name: row.nombre || 'Técnico de oficio',
      trade: row.oficio || '',
      experience: Number(row.experiencia) || 0,
      description: row.descripcion || '',
      zone,
      coverage: Array.isArray(row.zonasCobertura) && row.zonasCobertura.length
        ? row.zonasCobertura
        : (zone ? [zone] : []),
      lat: lat == null ? null : Number(lat),
      lng: lng == null ? null : Number(lng),
      availability: row.disponibilidad || 'Ocupado',
      schedule: row.horario || null,
      visitFee: Number(row.tarifas?.visitaDiagnostica) || 0,
      hourlyFee: Number(row.tarifas?.horaBase) || 0,
      feeNote: row.tarifas?.nota || '',
      phone: row.telefono || '',
      whatsapp: row.whatsapp || row.telefono || '',
      contactVisible: row.contactoVisible !== false,
      stars: Number(row.calificacionPromedio) || 0,
      reviewCount: Number(row.totalResenas) || 0,
      verified: Boolean(row.badgeVerified),
      verification: row.verificacionEstado || CHAMBAYA.VERIFICATION_STATUS.NONE,
      skills: Array.isArray(row.habilidades) ? row.habilidades : [],
      cvType: row.tipoHojaVida || 'profesional',
      views: Number(row.vistas) || 0,
      avatarUrl: row.foto || '',
      avatarColor: row.avatarColor || colorFor(row.id),
      portfolio: Array.isArray(row.portafolio) ? row.portafolio : [],
      active: row.activo !== false,
    };
  }

  async function init() {
    if (db) return mode;
    try {
      mode = await DatabaseService.probe(5000);
    } catch (e) {
      mode = 'local';
    }
    db = new DatabaseService(mode);
    document.documentElement.setAttribute('data-mode', mode);
    return mode;
  }

  async function workers({ force = false } = {}) {
    await init();
    if (workersCache && !force) return workersCache;
    try {
      const rows = await db.getAll(CHAMBAYA.COLLECTIONS.WORKERS);
      workersCache = rows
        .filter(r => r && r.activo !== false && r.rol !== 'admin')
        .map(normalize);
    } catch (e) {
      console.warn('TuOficio público: no se pudo leer el directorio.', e.message);
      workersCache = [];
    }
    return workersCache;
  }

  async function worker(id) {
    if (!id) return null;
    await init();
    try {
      const row = await db.get(CHAMBAYA.COLLECTIONS.WORKERS, id);
      if (row && row.rol !== 'admin') return normalize(row);
    } catch (e) {
      console.warn('TuOficio público: no se pudo leer el perfil.', e.message);
    }
    return (await workers()).find(w => w.id === id) || null;
  }

  async function reviews(workerId) {
    if (!workerId) return [];
    await init();
    if (reviewsCache.has(workerId)) return reviewsCache.get(workerId);
    let rows = [];
    try {
      rows = await db.getAll(CHAMBAYA.COLLECTIONS.REVIEWS, [['trabajadorId', '==', workerId]]);
    } catch (e) {
      console.warn('TuOficio público: no se pudieron leer las reseñas.', e.message);
    }
    rows = rows
      .filter(r => r && r.trabajadorId === workerId)
      .sort((a, b) => String(b.date || b.createdAt || '').localeCompare(String(a.date || a.createdAt || '')));
    reviewsCache.set(workerId, rows);
    return rows;
  }

  /** Promedio y cantidad reales a partir de las reseñas visibles. */
  function ratingOf(w, reviewRows) {
    const list = Array.isArray(reviewRows) ? reviewRows : [];
    if (list.length) {
      const avg = list.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / list.length;
      return { stars: avg, count: list.length };
    }
    return { stars: Number(w?.stars) || 0, count: Number(w?.reviewCount) || 0 };
  }

  /**
   * Filtro combinado del directorio público.
   * La distancia se calcula con Haversine desde el centro de la zona elegida.
   */
  function filter(list, {
    query = '', trade = '', zone = '', radiusKm = 5, minRating = 0,
    onlyVerified = false, onlyAvailable = false, sort = 'relevance',
  } = {}) {
    const origin = zoneByName(zone);
    let rows = list.map(w => ({
      ...w,
      distanceKm: origin && w.lat != null && w.lng != null
        ? haversineKm(origin.lat, origin.lng, w.lat, w.lng)
        : null,
    }));

    if (trade) rows = rows.filter(w => w.trade === trade);

    if (origin) {
      const radius = Number(radiusKm) || 0;
      rows = rows.filter(w => {
        if (radius <= 0 || radius >= 999) return true;
        if (w.distanceKm == null) return w.coverage.includes(origin.name);
        return w.distanceKm <= radius;
      });
    } else if (zone) {
      const z = String(zone).toLowerCase();
      rows = rows.filter(w => w.zone.toLowerCase() === z ||
        w.coverage.some(c => c.toLowerCase() === z));
    }

    if (Number(minRating) > 0) rows = rows.filter(w => (w.stars || 0) >= Number(minRating));
    if (onlyVerified) rows = rows.filter(w => w.verified);
    if (onlyAvailable) rows = rows.filter(w => w.availability === 'Disponible');

    if (query) {
      const q = String(query).toLowerCase().trim();
      if (q) {
        rows = rows.filter(w => [w.name, w.trade, w.zone, w.description, ...(w.skills || []), ...(w.coverage || [])]
          .join(' ').toLowerCase().includes(q));
      }
    }

    const sorters = {
      relevance: (a, b) => (b.verified - a.verified) || (b.reviewCount - a.reviewCount) || (b.stars - a.stars) || (a.distanceKm ?? 999) - (b.distanceKm ?? 999),
      rating: (a, b) => (b.stars || 0) - (a.stars || 0) || (b.reviewCount || 0) - (a.reviewCount || 0),
      distance: (a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999),
      price: (a, b) => (a.visitFee ?? 999999) - (b.visitFee ?? 999999),
      experience: (a, b) => (b.experience || 0) - (a.experience || 0),
    };
    return rows.sort(sorters[sort] || sorters.relevance);
  }

  /** Totales que se muestran en la portada, siempre calculados con datos reales. */
  async function stats() {
    const list = await workers();
    const verified = list.filter(w => w.verified).length;
    const available = list.filter(w => w.availability === 'Disponible').length;
    const ratingRows = await Promise.all(list.map(async w => (await reviews(w.id)).length));
    const totalReviews = ratingRows.reduce((a, b) => a + b, 0);
    return {
      workers: list.length,
      verified,
      available,
      totalReviews,
      trades: [...new Set(list.map(w => w.trade).filter(Boolean))].length,
      zones: [...new Set(list.map(w => w.zone).filter(Boolean))].length,
    };
  }

  function queryParam(name) {
    try {
      return new URLSearchParams(location.search).get(name) || '';
    } catch (e) {
      return '';
    }
  }

  return {
    init,
    get mode() { return mode; },
    workers,
    worker,
    reviews,
    ratingOf,
    filter,
    stats,
    queryParam,
    normalize,
  };
})();

/* ── Utilidades de interfaz para las páginas públicas ──────── */

const PublicUI = (() => {
  function toast(message, type = 'success', ms = 3200) {
    let host = document.getElementById('publicToast');
    if (!host) {
      host = document.createElement('div');
      host.id = 'publicToast';
      host.className = 'pub-toast';
      document.body.appendChild(host);
    }
    host.className = `pub-toast show ${type}`;
    host.innerHTML = `<i class="fa-solid ${type === 'error' ? 'fa-circle-exclamation' : type === 'info' ? 'fa-circle-info' : 'fa-circle-check'}"></i><span>${escapeHtml(message)}</span>`;
    clearTimeout(host._timer);
    host._timer = setTimeout(() => host.classList.remove('show'), ms);
  }

  function mark() {
    const initials = initialsOf(this.name);
    if (this.avatarUrl) {
      return `<img src="${escapeHtml(this.avatarUrl)}" alt="${escapeHtml(this.name)}"/>`;
    }
    return `<span>${escapeHtml(initials)}</span>`;
  }

  function avatar(w, size = 64) {
    const content = w.avatarUrl
      ? `<img src="${escapeHtml(w.avatarUrl)}" alt="${escapeHtml(w.name)}"/>`
      : `<span>${escapeHtml(initialsOf(w.name))}</span>`;
    return `<div class="pub-avatar" style="width:${size}px;height:${size}px;background:${escapeHtml(w.avatarColor || '#4E7A5C')};font-size:${Math.round(size * 0.32)}px">${content}</div>`;
  }

  function availability(w) {
    const cls = availabilityClass(w.availability);
    const label = w.availability || 'No disponible';
    return `<span class="avail ${cls === 'available' ? 'on' : cls === 'partial' ? 'part' : 'busy'}"><span class="dot"></span>${escapeHtml(label)}</span>`;
  }

  function verified(w) {
    return w.verified
      ? '<span class="pcard-verify"><i class="fa-solid fa-shield-halved"></i> Verificado</span>'
      : '';
  }

  function stars(rating, count, size = 12) {
    const value = Number(rating) || 0;
    return `<div class="pub-rating">${starsHtml(value, size)}<b>${value.toFixed(1)}</b><span>(${Number(count) || 0} ${Number(count) === 1 ? 'reseña' : 'reseñas'})</span></div>`;
  }

  function card(w) {
    const tone = w.avatarColor || '#4E7A5C';
    const price = w.visitFee > 0
      ? `Desde ${formatMoney(w.visitFee)} <small>visita</small>`
      : 'Sin costo de visita <small>diagnóstico</small>';
    const distance = w.distanceKm != null
      ? `<span class="pc-distance"><i class="fa-solid fa-location-crosshairs"></i> ${w.distanceKm.toFixed(1)} km</span>`
      : '';
    return `
      <article class="pcard pub-card" onclick="location.href='perfil.html?id=${encodeURIComponent(w.id)}'">
        <div class="pcard-media">
          <div class="pc-art" style="--tone:${escapeHtml(tone)}">
            <i class="fa-solid ${tradeIcon(w.trade)}"></i>
            <span class="pc-ava">${escapeHtml(initialsOf(w.name))}</span>
          </div>
          ${verified(w)}
          ${distance}
        </div>
        <div class="pcard-body">
          <div class="pcard-name">${escapeHtml(w.name)}</div>
          <div class="pcard-trade">${escapeHtml(w.trade)}${w.experience ? ` · ${w.experience} años` : ''}</div>
          ${stars(w.stars, w.reviewCount)}
          <div class="pcard-foot">
            <div class="pcard-price">${price}</div>
            ${availability(w)}
          </div>
          <span class="pcard-cta">Ver perfil <i class="fa-solid fa-arrow-right"></i></span>
        </div>
      </article>`;
  }

  async function share(w) {
    const url = publicProfileUrl(w.id);
    const title = `${w.name} · ${w.trade} en TuOficioCol`;
    const text = `Mira el perfil de ${w.name} (${w.trade}) en TuOficioCol.`;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast('Enlace del perfil copiado.', 'success');
    } catch (e) {
      window.prompt('Copia el enlace del perfil:', url);
    }
  }

  /** Ajusta el enlace de cuenta según la sesión local. */
  function sessionLink() {
    let hasSession = false;
    try { hasSession = Boolean(localStorage.getItem('tuoficio_session_uid')); } catch (e) { /* ignorar */ }
    document.querySelectorAll('[data-account-link]').forEach(a => {
      a.textContent = hasSession ? 'Mi cuenta' : 'Ingresar';
    });
  }

  function modeNote() {
    const host = document.getElementById('modeNote');
    if (!host) return;
    host.textContent = PublicData.mode === 'local'
      ? 'Modo demostración · datos guardados en este navegador'
      : 'Datos en vivo de Firestore';
  }

  /** Revela los bloques .reveal aunque IntersectionObserver no exista. */
  function reveal() {
    const els = [...document.querySelectorAll('.reveal')];
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(el => io.observe(el));
    setTimeout(() => els.forEach(el => el.classList.add('in')), 1800);
  }

  async function boot() {
    await PublicData.init();
    sessionLink();
    modeNote();
    reveal();
  }

  return { boot, toast, avatar, availability, verified, stars, card, share, sessionLink, modeNote, reveal };
})();
