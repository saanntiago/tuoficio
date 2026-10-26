class DatabaseService {
  constructor() {
    this.COLLECTIONS = CHAMBAYA.COLLECTIONS;
  }

  get _db() {
    if (!window.ChambaDB) throw new Error('Firestore no está inicializado.');
    return window.ChambaDB;
  }

  async get(col, id) {
    const snap = await this._db.collection(col).doc(id).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  }

    async getAll(col, filters = []) {
    let q = this._db.collection(col);
    filters.forEach(([field, op, val]) => { q = q.where(field, op, val); });
    try {
      const snap = await q.get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('Consulta Firestore', col, e.message);
      const snap = await this._db.collection(col).get();
      let rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      filters.forEach(([field, op, val]) => {
        rows = rows.filter(r => {
          if (op === '==') return r[field] === val;
          return true;
        });
      });
      return rows;
    }
  }

  async create(col, data, id = null) {
    const payload = { ...data, createdAt: firebase.firestore.FieldValue.serverTimestamp() };
    if (id) {
      await this._db.collection(col).doc(id).set(payload, { merge: true });
      return id;
    }
    const ref = await this._db.collection(col).add(payload);
    return ref.id;
  }

  async update(col, id, data) {
    await this._db.collection(col).doc(id).update({
      ...data,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  async set(col, id, data, merge = true) {
    await this._db.collection(col).doc(id).set({
      ...data,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge });
  }

  subscribe(col, filters, callback) {
    let q = this._db.collection(col);
    (filters || []).forEach(([field, op, val]) => { q = q.where(field, op, val); });
    return q.onSnapshot(snap => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }
}
