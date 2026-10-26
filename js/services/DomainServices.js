/**
 * Servicios de dominio de TuOficioCol.
 *
 * Agrupan las reglas de negocio de cada requerimiento funcional:
 * trabajadores, cotizaciones, postulaciones, trabajos, reseñas,
 * verificaciones, reportes, favoritos y notificaciones.
 */

class WorkerService {
  constructor(db) {
    this._db = db;
  }

  _map(worker, user = {}) {
    const zone = worker.zona || user.zona || '';
    const z = zoneByName(zone);
    const ubicacion = worker.ubicacion || {};
    return {
      ...worker,
      name: worker.nombre || user.nombre || 'Técnico',
      trade: worker.oficio || user.oficio || 'Oficio',
      zone,
      stars: Number(worker.calificacionPromedio) || 0,
      reviewCount: Number(worker.totalResenas) || 0,
      availability: worker.disponibilidad || 'Ocupado',
      visitFee: worker.tarifas?.visitaDiagnostica ?? 0,
      hourlyFee: worker.tarifas?.horaBase ?? 0,
      tarifas: worker.tarifas || { visitaDiagnostica: 0, horaBase: 0 },
      verified: Boolean(worker.badgeVerified || user.verificado),
      badgeVerified: Boolean(worker.badgeVerified),
      verificationStatus: worker.verificacionEstado || CHAMBAYA.VERIFICATION_STATUS.NONE,
      avatarColor: user.avatarColor || '#3A3A38',
      avatarUrl: user.foto || '',
      experience: Number(worker.experiencia) || 0,
      description: worker.descripcion || '',
      habilidades: worker.habilidades || [],
      coverage: worker.zonasCobertura?.length ? worker.zonasCobertura : (zone ? [zone] : []),
      contactVisible: worker.contactoVisible !== false,
      phone: worker.telefono || user.telefono || '',
      whatsapp: worker.whatsapp || user.whatsapp || user.telefono || '',
      email: user.email || '',
      lat: ubicacion.lat ?? worker.lat ?? z?.lat ?? null,
      lng: ubicacion.lng ?? worker.lng ?? z?.lng ?? null,
      schedule: worker.horario || null,
      portfolioCount: (worker.portafolio || []).length,
      typeCv: worker.tipoHojaVida || '',
      views: Number(worker.vistas) || 0,
      active: worker.activo !== false && user.activo !== false,
    };
  }

  async getAll({ onlyActive = false } = {}) {
    const [workers, users] = await Promise.all([
      this._db.getAll(this._db.COLLECTIONS.WORKERS),
      this._db.getAll(this._db.COLLECTIONS.USERS, [['rol', '==', 'trabajador']]),
    ]);
    const byId = Object.fromEntries(users.map(u => [u.id, u]));
    const mapped = workers.map(w => this._map(w, byId[w.id] || {}));
    return onlyActive ? mapped.filter(w => w.active) : mapped;
  }

  async getById(workerId) {
    const [worker, user] = await Promise.all([
      this._db.get(this._db.COLLECTIONS.WORKERS, workerId),
      this._db.get(this._db.COLLECTIONS.USERS, workerId),
    ]);
    if (!worker && !user) return null;
    return this._map(worker || {}, user || {});
  }

  subscribeToWorkers(cb) {
    return this._db.subscribe(this._db.COLLECTIONS.WORKERS, [], async () => {
      cb(await this.getAll());
    });
  }

  nearby(workers, zoneName, radiusKm = 12) {
    const z = zoneByName(zoneName);
    if (!z) {
      const n = String(zoneName || '').toLowerCase();
      return workers.map(w => ({ ...w, distanceKm: (w.zone || '').toLowerCase() === n ? 0 : null }));
    }
    return workers
      .map(w => {
        if (w.lat == null || w.lng == null) {
          return { ...w, distanceKm: (w.zone || '').toLowerCase() === z.name.toLowerCase() ? 0 : 99 };
        }
        return { ...w, distanceKm: haversineKm(z.lat, z.lng, w.lat, w.lng) };
      })
      .filter(w => w.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  /** Filtros combinados del catálogo (RF03) con orden configurable. */
  filter(workers, {
    trade = '', zone = '', minRating = 0, onlyVerified = false,
    onlyAvailable = false, query = '', radiusKm = 0, sort = 'relevance',
  } = {}) {
    let list = [...workers];
    if (trade) list = list.filter(w => w.trade === trade);
    if (zone) {
      list = this.nearby(list, zone, radiusKm > 0 ? radiusKm : 60);
    } else if (radiusKm > 0) {
      list = list.filter(w => w.distanceKm == null || w.distanceKm <= radiusKm);
    }
    if (minRating > 0) list = list.filter(w => (w.stars || 0) >= minRating);
    if (onlyVerified) list = list.filter(w => w.badgeVerified);
    if (onlyAvailable) list = list.filter(w => w.availability === 'Disponible');
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(w =>
        (w.name || '').toLowerCase().includes(q) ||
        (w.trade || '').toLowerCase().includes(q) ||
        (w.zone || '').toLowerCase().includes(q) ||
        (w.habilidades || []).join(' ').toLowerCase().includes(q)
      );
    }
    const sorters = {
      rating: (a, b) => (b.stars || 0) - (a.stars || 0) || (b.reviewCount || 0) - (a.reviewCount || 0),
      distance: (a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999),
      price: (a, b) => (a.visitFee || 0) - (b.visitFee || 0),
      experience: (a, b) => (b.experience || 0) - (a.experience || 0),
      relevance: (a, b) =>
        (b.badgeVerified ? 1 : 0) - (a.badgeVerified ? 1 : 0) ||
        (b.stars || 0) - (a.stars || 0) ||
        (a.distanceKm ?? 999) - (b.distanceKm ?? 999),
    };
    return list.sort(sorters[sort] || sorters.relevance);
  }

  recommendForClient(workers, { zone, trade, onlyAvailable = true } = {}) {
    const list = this.filter(workers, { zone, trade, onlyAvailable, radiusKm: 25, sort: 'relevance' });
    return list.slice(0, 8);
  }

  /** Compatibilidad con el chatbot. */
  recommendForEmployer(workers, opts = {}) {
    return this.recommendForClient(workers, opts);
  }

  recommendJobsForWorker(quotes, worker) {
    const trade = worker.trade || worker.oficio || '';
    const zone = (worker.zone || worker.zona || '').toLowerCase();
    const coverage = (worker.coverage || []).map(z => String(z).toLowerCase());
    return quotes
      .filter(q => q.status === CHAMBAYA.QUOTE_STATUS.OPEN || q.estado === 'Activa')
      .filter(q => {
        const sameTrade = !trade || q.service === trade;
        const qZone = String(q.zona || q.address || '').toLowerCase();
        const sameZone = !zone || qZone.includes(zone) || coverage.some(z => qZone.includes(z));
        return sameTrade && (sameZone || !zone);
      })
      .slice(0, 20);
  }

  async updateProfile(uid, data) {
    const workerFields = [
      'oficio', 'experiencia', 'descripcion', 'zona', 'zonasCobertura', 'ubicacion',
      'horario', 'tarifas', 'telefono', 'whatsapp', 'contactoVisible', 'habilidades',
      'tipoHojaVida', 'nombre',
    ];
    const workerPayload = {};
    workerFields.forEach(k => { if (data[k] !== undefined) workerPayload[k] = data[k]; });
    if (data.zona) {
      const z = zoneByName(data.zona);
      if (z) workerPayload.ubicacion = { lat: z.lat, lng: z.lng };
    }
    await this._db.set(this._db.COLLECTIONS.WORKERS, uid, workerPayload);
    const userPayload = {};
    ['nombre', 'zona', 'oficio', 'telefono', 'whatsapp', 'documento', 'preferencias'].forEach(k => {
      if (data[k] !== undefined) userPayload[k] = data[k];
    });
    if (data.zona) userPayload.zona = data.zona;
    if (Object.keys(userPayload).length) {
      await this._db.update(this._db.COLLECTIONS.USERS, uid, userPayload);
    }
  }

  async setAvailability(uid, status) {
    await this._db.update(this._db.COLLECTIONS.WORKERS, uid, { disponibilidad: status });
  }

  /** Guarda la hoja de vida creada desde el chatbot. */
  async saveCv(uid, cv = {}) {
    await this.updateProfile(uid, {
      oficio: cv.oficio || '',
      experiencia: Number(cv.experiencia) || 0,
      zona: cv.zona || '',
      descripcion: cv.descripcion || '',
      habilidades: cv.habilidades || [],
      tipoHojaVida: cv.tipo || 'informal',
    });
    if (cv.disponibilidad) await this.setAvailability(uid, cv.disponibilidad);
  }

  async registerView(workerId) {
    try {
      const w = await this._db.get(this._db.COLLECTIONS.WORKERS, workerId);
      if (w) await this._db.update(this._db.COLLECTIONS.WORKERS, workerId, { vistas: (Number(w.vistas) || 0) + 1 });
    } catch (e) { /* la vista es un dato accesorio */ }
  }

  /* ── Reseñas (RF11) ─────────────────────────────────────── */

  async getReviewsByWorker(workerId) {
    const rows = await this._db.getAll(this._db.COLLECTIONS.REVIEWS, [['trabajadorId', '==', workerId]]);
    return rows.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }

  async addReview({ workerId, clientId, clientName, clientColor, rating, text, trabajoId }) {
    const value = Math.max(1, Math.min(5, Number(rating) || 5));
    const id = await this._db.create(this._db.COLLECTIONS.REVIEWS, {
      trabajadorId: workerId,
      clienteId: clientId,
      clientName,
      clientColor,
      rating: value,
      text,
      trabajoId: trabajoId || null,
      date: new Date().toISOString().slice(0, 10),
    });
    const reviews = await this.getReviewsByWorker(workerId);
    const avg = reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / (reviews.length || 1);
    await this._db.set(this._db.COLLECTIONS.WORKERS, workerId, {
      calificacionPromedio: Number(avg.toFixed(2)),
      totalResenas: reviews.length,
    });
    return id;
  }

  /* ── Portafolio (RF07) ──────────────────────────────────── */

  async getPortfolio(workerId) {
    const w = await this._db.get(this._db.COLLECTIONS.WORKERS, workerId);
    return (w?.portafolio || []).slice().sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
  }

  async addPortfolioItem(workerId, item) {
    const w = await this._db.get(this._db.COLLECTIONS.WORKERS, workerId) || {};
    const portafolio = [...(w.portafolio || []), { ...item, id: `pf-${Date.now().toString(36)}` }];
    await this._db.set(this._db.COLLECTIONS.WORKERS, workerId, { portafolio });
    return portafolio;
  }

  async removePortfolioItem(workerId, itemId) {
    const w = await this._db.get(this._db.COLLECTIONS.WORKERS, workerId) || {};
    const portafolio = (w.portafolio || []).filter(p => p.id !== itemId);
    await this._db.set(this._db.COLLECTIONS.WORKERS, workerId, { portafolio });
    return portafolio;
  }

  /* ── Perfil ─────────────────────────────────────────────── */

  completeness(worker = {}, user = {}) {
    const checks = [
      Boolean(worker.nombre || user.nombre),
      Boolean(worker.oficio || user.oficio),
      Boolean(worker.zona || user.zona),
      Boolean(worker.descripcion),
      Number(worker.experiencia) > 0,
      Boolean(worker.tarifas?.visitaDiagnostica || worker.tarifas?.horaBase),
      Boolean(worker.telefono || user.telefono),
      (worker.habilidades || []).length > 0,
      (worker.portafolio || []).length > 0,
      Boolean(worker.horario?.dias?.length),
    ];
    const done = checks.filter(Boolean).length;
    return { done, total: checks.length, percent: Math.round((done / checks.length) * 100) };
  }
}

class QuoteService {
  constructor(db) {
    this._db = db;
  }

  async create(data) {
    return this._db.create(this._db.COLLECTIONS.QUOTES, {
      ...data,
      estado: CHAMBAYA.QUOTE_STATUS.OPEN,
      status: CHAMBAYA.QUOTE_STATUS.OPEN,
      ofertasCount: 0,
    });
  }

  async getByClient(clientId) {
    const rows = await this._db.getAll(this._db.COLLECTIONS.QUOTES, [['clientId', '==', clientId]]);
    return rows.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  }

  async getById(id) {
    return this._db.get(this._db.COLLECTIONS.QUOTES, id);
  }

  async getActive() {
    const all = await this._db.getAll(this._db.COLLECTIONS.QUOTES);
    return all.filter(q => q.status === CHAMBAYA.QUOTE_STATUS.OPEN);
  }

  async close(id) {
    await this._db.update(this._db.COLLECTIONS.QUOTES, id, {
      status: CHAMBAYA.QUOTE_STATUS.CLOSED,
      estado: CHAMBAYA.QUOTE_STATUS.CLOSED,
    });
  }

  /* ── Postulaciones de trabajadores a una solicitud (RF15) ── */

  async sendOffer({ quoteId, workerId, workerName, precio, tiempoEstimado, mensaje }) {
    const quote = await this.getById(quoteId);
    if (!quote) throw new Error('La solicitud ya no existe.');
    const existing = await this._db.getAll(this._db.COLLECTIONS.OFFERS, [
      ['cotizacionId', '==', quoteId],
    ]);
    if (existing.some(o => o.trabajadorId === workerId)) {
      throw new Error('Ya enviaste una oferta para esta solicitud.');
    }
    const id = await this._db.create(this._db.COLLECTIONS.OFFERS, {
      cotizacionId: quoteId,
      trabajadorId: workerId,
      trabajadorNombre: workerName,
      precio: Number(precio) || 0,
      tiempoEstimado: tiempoEstimado || '',
      mensaje: mensaje || '',
      estado: 'Enviada',
    });
    await this._db.update(this._db.COLLECTIONS.QUOTES, quoteId, {
      ofertasCount: (Number(quote.ofertasCount) || 0) + 1,
    });
    return { id, quote };
  }

  async getOffersForQuote(quoteId) {
    return this._db.getAll(this._db.COLLECTIONS.OFFERS, [['cotizacionId', '==', quoteId]]);
  }

  async getOffersByWorker(workerId) {
    const rows = await this._db.getAll(this._db.COLLECTIONS.OFFERS, [['trabajadorId', '==', workerId]]);
    return rows.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  }

  async updateOffer(id, data) {
    await this._db.update(this._db.COLLECTIONS.OFFERS, id, data);
  }

  /* ── Sugerencias directas de un cliente a un técnico ─────── */

  async sendSuggestion({ employerId, employerName, workerId, service, description, zone, budget, address, fecha, hora }) {
    const id = await this._db.create(this._db.COLLECTIONS.SUGGESTIONS, {
      empleadorId: employerId,
      employerName: employerName,
      trabajadorId: workerId,
      service,
      description,
      zone,
      address: address || zone,
      fecha: fecha || '',
      hora: hora || '',
      budget,
      status: 'Enviada',
      estado: 'Enviada',
    });
    return id;
  }

  async getSuggestionsForWorker(workerId) {
    return this._db.getAll(this._db.COLLECTIONS.SUGGESTIONS, [['trabajadorId', '==', workerId]]);
  }

  async getSuggestionsByClient(clientId) {
    return this._db.getAll(this._db.COLLECTIONS.SUGGESTIONS, [['empleadorId', '==', clientId]]);
  }

  async updateSuggestion(id, data) {
    await this._db.update(this._db.COLLECTIONS.SUGGESTIONS, id, data);
  }
}

class JobService {
  constructor(db) {
    this._db = db;
  }

  async create(data) {
    return this._db.create(this._db.COLLECTIONS.JOBS, {
      ...data,
      estado: CHAMBAYA.JOB_STATUS.ACTIVE,
      resenaId: null,
    });
  }

  async getById(id) {
    return this._db.get(this._db.COLLECTIONS.JOBS, id);
  }

  async getForClient(clientId) {
    const rows = await this._db.getAll(this._db.COLLECTIONS.JOBS, [['clientId', '==', clientId]]);
    return rows.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  }

  async getForWorker(workerId) {
    const rows = await this._db.getAll(this._db.COLLECTIONS.JOBS, [['trabajadorId', '==', workerId]]);
    return rows.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  }

  async finish(id) {
    const job = await this.getById(id);
    if (!job) throw new Error('El trabajo no existe.');
    await this._db.update(this._db.COLLECTIONS.JOBS, id, {
      estado: CHAMBAYA.JOB_STATUS.DONE,
      finalizadoEn: new Date().toISOString(),
    });
    return job;
  }

  async cancel(id, motivo = '') {
    await this._db.update(this._db.COLLECTIONS.JOBS, id, {
      estado: CHAMBAYA.JOB_STATUS.CANCELLED,
      motivoCancelacion: motivo,
    });
  }

  canReview(job, uid) {
    return Boolean(job) &&
      job.clientId === uid &&
      job.estado === CHAMBAYA.JOB_STATUS.DONE &&
      !job.resenaId;
  }

  /** RF13 / HU-16 / HU-17: solo durante el servicio o en las 24 h posteriores. */
  canReport(job, uid) {
    if (!job) return false;
    if (job.clientId !== uid && job.trabajadorId !== uid) return false;
    if (job.estado === CHAMBAYA.JOB_STATUS.ACTIVE) return true;
    if (job.estado === CHAMBAYA.JOB_STATUS.DONE) {
      return hoursSince(job.finalizadoEn) <= CHAMBAYA.LIMITS.REPORT_WINDOW_HOURS;
    }
    return false;
  }

  async markReviewed(id, reviewId) {
    await this._db.update(this._db.COLLECTIONS.JOBS, id, { resenaId: reviewId });
  }
}

class VerificationService {
  constructor(db) {
    this._db = db;
  }

  async request(uid, data) {
    const existing = await this.getMine(uid);
    if (existing && existing.estado === 'Pendiente') {
      throw new Error('Ya tienes una solicitud en revisión.');
    }
    const id = await this._db.create(this._db.COLLECTIONS.VERIFICATIONS, {
      ...data,
      trabajadorId: uid,
      estado: 'Pendiente',
      observacion: '',
      createdAt: new Date().toISOString(),
    });
    await this._db.set(this._db.COLLECTIONS.WORKERS, uid, {
      verificacionEstado: CHAMBAYA.VERIFICATION_STATUS.PENDING,
      badgeVerified: false,
    });
    return id;
  }

  async getMine(uid) {
    const rows = await this._db.getAll(this._db.COLLECTIONS.VERIFICATIONS, [['trabajadorId', '==', uid]]);
    return rows.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))[0] || null;
  }

  async listAll() {
    const rows = await this._db.getAll(this._db.COLLECTIONS.VERIFICATIONS);
    return rows.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  }

  async listPending() {
    const rows = await this.listAll();
    return rows.filter(v => v.estado === 'Pendiente');
  }

  async approve(id, adminName, observation = '') {
    const req = await this._db.get(this._db.COLLECTIONS.VERIFICATIONS, id);
    if (!req) throw new Error('La solicitud no existe.');
    await this._db.update(this._db.COLLECTIONS.VERIFICATIONS, id, {
      estado: 'Aprobado',
      observacion: observation,
      revisadoPor: adminName,
      revisadoEn: new Date().toISOString(),
    });
    await this._db.set(this._db.COLLECTIONS.WORKERS, req.trabajadorId, {
      badgeVerified: true,
      verificacionEstado: CHAMBAYA.VERIFICATION_STATUS.APPROVED,
    });
    await this._db.update(this._db.COLLECTIONS.USERS, req.trabajadorId, { verificado: true });
    return req;
  }

  async reject(id, adminName, observation = '') {
    const req = await this._db.get(this._db.COLLECTIONS.VERIFICATIONS, id);
    if (!req) throw new Error('La solicitud no existe.');
    await this._db.update(this._db.COLLECTIONS.VERIFICATIONS, id, {
      estado: 'Rechazado',
      observacion: observation,
      revisadoPor: adminName,
      revisadoEn: new Date().toISOString(),
    });
    await this._db.set(this._db.COLLECTIONS.WORKERS, req.trabajadorId, {
      badgeVerified: false,
      verificacionEstado: CHAMBAYA.VERIFICATION_STATUS.REJECTED,
    });
    return req;
  }
}

class ReportService {
  constructor(db) {
    this._db = db;
  }

  async create({ reportanteId, reportanteRol, reportanteNombre, reportadoId, reportadoRol, reportadoNombre, trabajoId, motivo, detalle }) {
    return this._db.create(this._db.COLLECTIONS.REPORTS, {
      reportanteId, reportanteRol, reportanteNombre,
      reportadoId, reportadoRol, reportadoNombre,
      trabajoId: trabajoId || null,
      motivo, detalle,
      estado: 'Pendiente',
    });
  }

  async listAll() {
    const rows = await this._db.getAll(this._db.COLLECTIONS.REPORTS);
    return rows.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  }

  async listPending() {
    return (await this.listAll()).filter(r => r.estado === 'Pendiente');
  }

  async resolve(id, { estado, sancionTipo, dias = 0, observacion = '', adminName = '' }) {
    const report = await this._db.get(this._db.COLLECTIONS.REPORTS, id);
    if (!report) throw new Error('El reporte no existe.');
    const patch = {
      estado,
      observacion,
      resueltoPor: adminName,
      resueltoEn: new Date().toISOString(),
    };
    if (sancionTipo && sancionTipo !== 'ninguna') {
      patch.sancion = { tipo: sancionTipo, dias: Number(dias) || 0 };
    }
    await this._db.update(this._db.COLLECTIONS.REPORTS, id, patch);
    return report;
  }

  /** Aplica la sanción al usuario reportado (HU-14). */
  async sanction(userId, tipo, dias, motivo) {
    if (!userId) return;
    const user = await this._db.get(this._db.COLLECTIONS.USERS, userId);
    if (!user) return;
    if (tipo === 'baneo') {
      await this._db.update(this._db.COLLECTIONS.USERS, userId, {
        activo: false,
        sancion: { tipo: 'baneo', motivo, desde: new Date().toISOString() },
      });
      if (user.rol === 'trabajador') {
        await this._db.set(this._db.COLLECTIONS.WORKERS, userId, { activo: false });
      }
      return;
    }
    if (tipo === 'suspension') {
      const days = Number(dias) || 3;
      const hasta = new Date(Date.now() + days * 86400000).toISOString();
      await this._db.update(this._db.COLLECTIONS.USERS, userId, {
        activo: false,
        sancion: { tipo: 'suspension', dias: days, desde: new Date().toISOString(), hasta, motivo },
      });
      if (user.rol === 'trabajador') {
        await this._db.set(this._db.COLLECTIONS.WORKERS, userId, { activo: false });
      }
      return;
    }
    await this._db.update(this._db.COLLECTIONS.USERS, userId, {
      sancion: { tipo: 'advertencia', motivo, desde: new Date().toISOString() },
    });
  }
}

class FavoriteService {
  constructor(db) {
    this._db = db;
  }

  async list(uid) {
    const doc = await this._db.get(this._db.COLLECTIONS.FAVORITES, uid);
    return doc?.trabajadores || [];
  }

  async toggle(uid, workerId) {
    const current = await this.list(uid);
    const has = current.includes(workerId);
    const next = has ? current.filter(id => id !== workerId) : [...current, workerId];
    await this._db.set(this._db.COLLECTIONS.FAVORITES, uid, { trabajadores: next });
    return { added: !has, list: next };
  }
}

class MessageService {
  constructor(db) {
    this._db = db;
  }

  _convId(a, b) {
    return [a, b].sort().join('_');
  }

  subscribeToConversationList(uid, cb) {
    return this._db.subscribe(
      this._db.COLLECTIONS.CONVERSATIONS,
      [['participants', 'array-contains', uid]],
      convs => cb(convs.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))))
    );
  }

  subscribeToConversation(uid, otherId, cb) {
    const cid = this._convId(uid, otherId);
    return this._db.subscribe(
      this._db.COLLECTIONS.MESSAGES,
      [['conversationId', '==', cid]],
      msgs => cb(msgs.sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || ''))))
    );
  }

  async send(from, to, text) {
    const cid = this._convId(from, to);
    await this._db.set(this._db.COLLECTIONS.CONVERSATIONS, cid, {
      participants: [from, to],
      lastMessage: text,
      unreadFor: to,
    });
    await this._db.create(this._db.COLLECTIONS.MESSAGES, {
      conversationId: cid,
      from,
      to,
      text,
      time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
    });
  }

  async markRead(uid, otherId) {
    const cid = this._convId(uid, otherId);
    const conv = await this._db.get(this._db.COLLECTIONS.CONVERSATIONS, cid);
    if (conv?.unreadFor === uid) {
      await this._db.update(this._db.COLLECTIONS.CONVERSATIONS, cid, { unreadFor: null });
    }
  }

  async openWith(from, to, firstMessage = '') {
    const cid = this._convId(from, to);
    const existing = await this._db.get(this._db.COLLECTIONS.CONVERSATIONS, cid);
    if (!existing) {
      await this._db.set(this._db.COLLECTIONS.CONVERSATIONS, cid, {
        participants: [from, to],
        lastMessage: firstMessage,
      });
    }
    return cid;
  }
}

class NotificationService {
  constructor(db) {
    this._db = db;
  }

  subscribe(uid, cb) {
    return this._db.subscribe(
      this._db.COLLECTIONS.NOTIFICATIONS,
      [['usuarioId', '==', uid]],
      rows => cb(rows.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))))
    );
  }

  async notify({ usuarioId, title, desc, icon = 'fa-bell', color = '#3A3A38', bg = 'rgba(58,58,56,.1)', link = '' }) {
    if (!usuarioId) return null;
    return this._db.create(this._db.COLLECTIONS.NOTIFICATIONS, {
      usuarioId, title, desc, icon, color, bg, link, read: false,
    });
  }

  async notifyMany(users, payload) {
    await Promise.all(users.filter(Boolean).map(u => this.notify({ ...payload, usuarioId: u })));
  }

  async markRead(id) {
    await this._db.update(this._db.COLLECTIONS.NOTIFICATIONS, id, { read: true });
  }

  async markAllRead(uid) {
    const all = await this._db.getAll(this._db.COLLECTIONS.NOTIFICATIONS, [['usuarioId', '==', uid]]);
    await Promise.all(all.filter(n => !n.read).map(n => this.markRead(n.id)));
  }
}

class ZoneService {
  density(workers) {
    return CHAMBAYA.ZONES.map(z => {
      const inZone = workers.filter(w =>
        (w.zone || '').toLowerCase().includes(z.name.toLowerCase()) ||
        (w.coverage || []).some(c => String(c).toLowerCase().includes(z.name.toLowerCase()))
      );
      const available = inZone.filter(w => w.availability === 'Disponible').length;
      return { ...z, count: inZone.length, available, score: available * 2 + inZone.length };
    }).sort((a, b) => b.score - a.score);
  }
}
