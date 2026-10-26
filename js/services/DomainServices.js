class WorkerService {
  constructor(db) {
    this._db = db;
  }

  async getAll() {
    const workers = await this._db.getAll(this._db.COLLECTIONS.WORKERS);
    const users = await this._db.getAll(this._db.COLLECTIONS.USERS, [['rol', '==', 'trabajador']]);
    const byId = Object.fromEntries(users.map(u => [u.id, u]));
    return workers.map(w => {
      const u = byId[w.id] || {};
      return {
        ...w,
        name: u.nombre || w.nombre || 'Técnico',
        trade: w.oficio || u.oficio || 'Oficio',
        zone: w.zona || u.zona || '',
        stars: w.calificacionPromedio || 0,
        reviewCount: w.totalResenas || 0,
        availability: w.disponibilidad || 'Ocupado',
        visitFee: w.tarifas?.visitaDiagnostica || 0,
        hourlyFee: w.tarifas?.horaBase || 0,
        verified: Boolean(u.verificado || w.badgeVerified),
        badgeVerified: Boolean(w.badgeVerified || u.verificado),
        avatarColor: u.avatarColor || '#3A3A38',
        experience: w.experiencia || 0,
        description: w.descripcion || '',
        lat: w.ubicacion?.lat || zoneByName(w.zona || u.zona)?.lat,
        lng: w.ubicacion?.lng || zoneByName(w.zona || u.zona)?.lng,
      };
    });
  }

  nearby(workers, zoneName, radiusKm = 12) {
    const z = zoneByName(zoneName);
    if (!z) {
      const n = (zoneName || '').toLowerCase();
      return workers.filter(w => (w.zone || '').toLowerCase().includes(n));
    }
    return workers
      .map(w => {
        if (w.lat == null || w.lng == null) {
          return { ...w, distanceKm: (w.zone || '').toLowerCase() === z.name.toLowerCase() ? 0 : 99 };
        }
        return { ...w, distanceKm: this._haversine(z.lat, z.lng, w.lat, w.lng) };
      })
      .filter(w => w.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  recommendForEmployer(workers, { zone, trade, onlyAvailable = true }) {
    let list = this.nearby(workers, zone);
    if (trade) list = list.filter(w => w.trade === trade);
    if (onlyAvailable) list = list.filter(w => w.availability === 'Disponible');
    return list.sort((a, b) => (b.stars || 0) - (a.stars || 0) || (a.distanceKm || 0) - (b.distanceKm || 0));
  }

  recommendJobsForWorker(quotes, worker) {
    const zone = (worker.zone || '').toLowerCase();
    const trade = worker.trade || worker.oficio;
    return quotes
      .filter(q => q.status === 'Activa' || q.estado === 'pendiente' || q.estado === 'Activa')
      .filter(q => {
        const sameTrade = !trade || q.service === trade || q.categoria === trade;
        const sameZone = !zone || (q.address || q.zona || '').toLowerCase().includes(zone);
        return sameTrade || sameZone;
      })
      .slice(0, 8);
  }

  subscribeToWorkers(cb) {
    return this._db.subscribe(this._db.COLLECTIONS.WORKERS, [], async () => {
      cb(await this.getAll());
    });
  }

  async getReviewsByWorker(workerId) {
    return this._db.getAll(this._db.COLLECTIONS.REVIEWS, [['trabajadorId', '==', workerId]]);
  }

  async getPortfolio(workerId) {
    const w = await this._db.get(this._db.COLLECTIONS.WORKERS, workerId);
    return w?.portafolio || [];
  }

  async addReview({ workerId, clientId, clientName, clientColor, rating, text }) {
    await this._db.create(this._db.COLLECTIONS.REVIEWS, {
      trabajadorId: workerId,
      clienteId: clientId,
      clientName,
      clientColor,
      rating,
      text,
      date: new Date().toISOString().slice(0, 10),
    });
    const reviews = await this.getReviewsByWorker(workerId);
    const avg = reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length;
    await this._db.update(this._db.COLLECTIONS.WORKERS, workerId, {
      calificacionPromedio: Number(avg.toFixed(2)),
      totalResenas: reviews.length,
    });
  }

  async saveCv(uid, cv) {
    await this._db.set(this._db.COLLECTIONS.CVS, uid, cv);
    await this._db.set(this._db.COLLECTIONS.WORKERS, uid, {
      uid,
      oficio: cv.oficio,
      experiencia: cv.experiencia,
      descripcion: cv.descripcion,
      tipoHojaVida: cv.tipo,
      zona: cv.zona,
      zonasCobertura: [cv.zona].filter(Boolean),
      habilidades: cv.habilidades || [],
      disponibilidad: cv.disponibilidad || 'Disponible',
    });
    await this._db.update(this._db.COLLECTIONS.USERS, uid, {
      zona: cv.zona,
      oficio: cv.oficio,
    });
  }

  async updateAvailability(uid, status) {
    await this._db.update(this._db.COLLECTIONS.WORKERS, uid, { disponibilidad: status });
  }

  _haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}

class QuoteService {
  constructor(db) {
    this._db = db;
  }

  async create(data) {
    return this._db.create(this._db.COLLECTIONS.QUOTES, {
      ...data,
      estado: data.status || 'Activa',
      status: data.status || 'Activa',
      ofertas: [],
    });
  }

  async getByClient(clientId) {
    return this._db.getAll(this._db.COLLECTIONS.QUOTES, [['clientId', '==', clientId]]);
  }

  async getActive() {
    const all = await this._db.getAll(this._db.COLLECTIONS.QUOTES);
    return all.filter(q => q.status === 'Activa' || q.estado === 'pendiente' || q.estado === 'Activa');
  }

  async sendSuggestion({ employerId, employerName, workerId, service, description, zone, budget }) {
    const id = await this._db.create(this._db.COLLECTIONS.OFFERS, {
      empleadorId: employerId,
      employerName,
      trabajadorId: workerId,
      service,
      description,
      zone,
      budget,
      status: 'Enviada',
    });
    await this._db.create(this._db.COLLECTIONS.NOTIFICATIONS, {
      usuarioId: workerId,
      title: 'Nueva sugerencia de trabajo',
      desc: `${employerName} te propone: ${service}`,
      icon: 'fa-briefcase',
      color: '#3A3A38',
      bg: 'rgba(58,58,56,.1)',
      read: false,
      leida: false,
    });
    return id;
  }

  async getSuggestionsForWorker(workerId) {
    return this._db.getAll(this._db.COLLECTIONS.OFFERS, [['trabajadorId', '==', workerId]]);
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
      cb
    );
  }

  subscribeToConversation(uid, otherId, cb) {
    const cid = this._convId(uid, otherId);
    return this._db.subscribe(
      this._db.COLLECTIONS.MESSAGES,
      [['conversationId', '==', cid]],
      msgs => cb(msgs.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)))
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

  async openWith(from, to, firstMessage) {
    const cid = this._convId(from, to);
    const existing = await this._db.get(this._db.COLLECTIONS.CONVERSATIONS, cid);
    if (!existing) {
      await this._db.set(this._db.COLLECTIONS.CONVERSATIONS, cid, {
        participants: [from, to],
        lastMessage: firstMessage || '',
      });
    }
  }
}

class NotificationService {
  constructor(db) {
    this._db = db;
  }

  subscribe(uid, cb) {
    return this._db.subscribe(this._db.COLLECTIONS.NOTIFICATIONS, [['usuarioId', '==', uid]], cb);
  }

  async markRead(id) {
    await this._db.update(this._db.COLLECTIONS.NOTIFICATIONS, id, { read: true, leida: true });
  }

  async markAllRead(uid) {
    const all = await this._db.getAll(this._db.COLLECTIONS.NOTIFICATIONS, [['usuarioId', '==', uid]]);
    await Promise.all(all.filter(n => !n.read && !n.leida).map(n => this.markRead(n.id)));
  }
}

class ZoneService {
  density(workers) {
    return CHAMBAYA.ZONES.map(z => {
      const count = workers.filter(w => (w.zone || '').toLowerCase().includes(z.name.toLowerCase())).length;
      const available = workers.filter(w =>
        (w.zone || '').toLowerCase().includes(z.name.toLowerCase()) && w.availability === 'Disponible'
      ).length;
      return { ...z, count, available, score: available * 2 + count };
    }).sort((a, b) => b.score - a.score);
  }
}
