/**
 * Capa de acceso a datos.
 *
 * Funciona con dos motores intercambiables:
 *  - firebase: Cloud Firestore (modo real).
 *  - local:    localStorage (modo demostración, sin conexión ni reglas).
 *
 * La aplicación decide el motor al arrancar con `DatabaseService.probe()`.
 */
class DatabaseService {
  constructor(mode = 'firebase') {
    this.mode = mode;
    this.local = mode === 'local' ? new LocalStore() : null;
    this.COLLECTIONS = CHAMBAYA.COLLECTIONS;
  }

  get isLocal() {
    return this.mode === 'local';
  }

  get _db() {
    if (!window.ChambaDB) throw new Error('Firestore no está inicializado.');
    return window.ChambaDB;
  }

  /**
   * Comprueba si Firestore está disponible y con permisos.
   * Si falla, la app continúa en modo local.
   */
  static async probe(timeoutMs = 7000) {
    try {
      if (typeof firebase === 'undefined') return 'local';
      initFirebase();
      const read = window.ChambaDB.collection(CHAMBAYA.COLLECTIONS.WORKERS).limit(1).get();
      const timeout = new Promise((_, reject) => {
        const t = setInterval(() => {}, 1000);
        setTimeout(() => { clearInterval(t); reject(new Error('timeout')); }, timeoutMs);
      });
      await Promise.race([read, timeout]);
      return 'firebase';
    } catch (e) {
      console.warn('TuOficio: Firestore no disponible, se activa el modo demostración local.', e.message);
      return 'local';
    }
  }

  async get(col, id) {
    if (this.local) return this.local.get(col, id);
    const snap = await this._db.collection(col).doc(id).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  }

  async getAll(col, filters = []) {
    if (this.local) return this.local.getAll(col, filters);
    let q = this._db.collection(col);
    filters.forEach(([field, op, val]) => { q = q.where(field, op, val); });
    try {
      const snap = await q.get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      // Algunas consultas compuestas requieren índice; se resuelve en cliente.
      console.warn('Consulta Firestore', col, e.message);
      const snap = await this._db.collection(col).get();
      let rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      filters.forEach(([field, op, val]) => {
        rows = rows.filter(r => {
          if (op === '==') return r[field] === val;
          if (op === '!=') return r[field] !== val;
          if (op === '>') return r[field] > val;
          if (op === '>=') return r[field] >= val;
          if (op === '<') return r[field] < val;
          if (op === '<=') return r[field] <= val;
          if (op === 'in') return Array.isArray(val) && val.includes(r[field]);
          if (op === 'array-contains') return Array.isArray(r[field]) && r[field].includes(val);
          return true;
        });
      });
      return rows;
    }
  }

  async create(col, data, id = null) {
    if (this.local) return this.local.create(col, data, id);
    const payload = { ...data, createdAt: firebase.firestore.FieldValue.serverTimestamp() };
    if (id) {
      await this._db.collection(col).doc(id).set(payload, { merge: true });
      return id;
    }
    const ref = await this._db.collection(col).add(payload);
    return ref.id;
  }

  async update(col, id, data) {
    if (this.local) return this.local.update(col, id, data);
    await this._db.collection(col).doc(id).update({
      ...data,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    return id;
  }

  async set(col, id, data, merge = true) {
    if (this.local) return this.local.set(col, id, data, merge);
    await this._db.collection(col).doc(id).set({
      ...data,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge });
    return id;
  }

  async remove(col, id) {
    if (this.local) return this.local.remove(col, id);
    await this._db.collection(col).doc(id).delete();
    return id;
  }

  subscribe(col, filters, callback) {
    if (this.local) return this.local.subscribe(col, filters, callback);
    let q = this._db.collection(col);
    (filters || []).forEach(([field, op, val]) => { q = q.where(field, op, val); });
    return q.onSnapshot(
      snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err => console.warn('Suscripción Firestore', col, err.message)
    );
  }

  resetDemo() {
    if (this.local) this.local.reset();
  }
}
