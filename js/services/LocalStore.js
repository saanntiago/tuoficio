/**
 * Almacén local (modo demostración).
 *
 * Implementa la misma interfaz que DatabaseService, pero guarda todo en
 * localStorage. Se activa automáticamente cuando Firestore no responde
 * (por ejemplo, si las reglas todavía no se publicaron), de forma que la
 * plataforma siga siendo navegable y evaluable.
 */
class LocalStore {
  constructor(key = 'tuoficio_db_v1') {
    this._key = key;
    this._listeners = {};
    this._db = this._read();
  }

  _read() {
    try {
      const raw = localStorage.getItem(this._key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {
      console.warn('TuOficio: no se pudo leer el almacén local.', e.message);
    }
    const seeded = JSON.parse(JSON.stringify(TuOficioSeed));
    try { localStorage.setItem(this._key, JSON.stringify(seeded)); } catch (e) { /* ignorar */ }
    return seeded;
  }

  _persist() {
    try {
      localStorage.setItem(this._key, JSON.stringify(this._db));
    } catch (e) {
      const err = new Error('El almacenamiento local está lleno. Elimina algún proyecto del portafolio e inténtalo de nuevo.');
      err.code = 'quota';
      throw err;
    }
  }

  _rows(col) {
    if (!this._db[col]) this._db[col] = [];
    return this._db[col];
  }

  _emit(col) {
    (this._listeners[col] || []).forEach(fn => {
      try { fn(this.getAllSync(col)); } catch (e) { console.warn(e); }
    });
  }

  getAllSync(col) {
    return JSON.parse(JSON.stringify(this._rows(col)));
  }

  async get(col, id) {
    const row = this._rows(col).find(r => r.id === id);
    return row ? JSON.parse(JSON.stringify(row)) : null;
  }

  async getAll(col, filters = []) {
    let rows = this._rows(col);
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
    return JSON.parse(JSON.stringify(rows));
  }

  async create(col, data, id = null) {
    const rows = this._rows(col);
    const newId = id || `${col.slice(0, 3)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    const payload = { ...data, id: newId, createdAt: data.createdAt || now, updatedAt: now };
    const existing = rows.findIndex(r => r.id === newId);
    if (existing >= 0) rows[existing] = { ...rows[existing], ...payload };
    else rows.push(payload);
    this._persist();
    this._emit(col);
    return newId;
  }

  async set(col, id, data, merge = true) {
    const rows = this._rows(col);
    const idx = rows.findIndex(r => r.id === id);
    const now = new Date().toISOString();
    if (idx >= 0) {
      rows[idx] = merge ? { ...rows[idx], ...data, updatedAt: now } : { ...data, id, updatedAt: now };
    } else {
      rows.push({ ...data, id, createdAt: data.createdAt || now, updatedAt: now });
    }
    this._persist();
    this._emit(col);
    return id;
  }

  async update(col, id, data) {
    const rows = this._rows(col);
    const idx = rows.findIndex(r => r.id === id);
    if (idx < 0) throw new Error('El documento no existe.');
    rows[idx] = { ...rows[idx], ...data, updatedAt: new Date().toISOString() };
    this._persist();
    this._emit(col);
    return id;
  }

  async remove(col, id) {
    const rows = this._rows(col);
    this._db[col] = rows.filter(r => r.id !== id);
    this._persist();
    this._emit(col);
  }

  subscribe(col, filters, callback) {
    const handler = () => {
      this.getAll(col, filters).then(callback);
    };
    if (!this._listeners[col]) this._listeners[col] = [];
    this._listeners[col].push(handler);
    this.getAll(col, filters).then(callback);
    return () => {
      this._listeners[col] = (this._listeners[col] || []).filter(fn => fn !== handler);
    };
  }

  /** Restablece los datos de demostración. */
  reset() {
    this._db = JSON.parse(JSON.stringify(TuOficioSeed));
    this._persist();
    Object.keys(this._db).forEach(col => this._emit(col));
  }

  /** Lee una colección sin instanciar el almacén (para páginas públicas). */
  static read(col) {
    try {
      const raw = localStorage.getItem('tuoficio_db_v1');
      const db = raw ? JSON.parse(raw) : TuOficioSeed;
      return JSON.parse(JSON.stringify(db[col] || []));
    } catch (e) {
      return [];
    }
  }

  /** ¿Existe una base local creada? */
  static hasData() {
    try {
      return Boolean(localStorage.getItem('tuoficio_db_v1'));
    } catch (e) {
      return false;
    }
  }
}
