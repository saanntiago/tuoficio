/**
 * Almacenamiento de archivos.
 *
 * Modo Firebase: sube las imágenes y videos a Cloud Storage y devuelve la URL
 * de descarga. Las imágenes se comprimen antes de subirlas para respetar los
 * límites de tamaño y mantener livianos los documentos de Firestore.
 *
 * Modo local: conserva el Data URL para que el modo demostración siga
 * funcionando sin backend.
 *
 * Rutas:
 *   users/{uid}/public/{carpeta}/...   → avatar y portafolio (lectura pública)
 *   users/{uid}/private/{carpeta}/...  → documento y selfie (solo dueño/admin)
 */
class StorageService {
  constructor(mode = 'firebase') {
    this.mode = mode;
    this.lastError = '';
    /** Tiempo máximo de espera para una imagen antes de usar el respaldo local. */
    this.uploadTimeoutMs = 20000;
  }

  get isLocal() {
    return this.mode === 'local';
  }

  get enabled() {
    return !this.isLocal &&
      typeof firebase !== 'undefined' &&
      typeof firebase.storage === 'function' &&
      Boolean(window.ChambaStorage);
  }

  /**
   * Valida y comprime una imagen JPG/PNG y la sube a Storage.
   * Si Storage no está habilitado en el proyecto, devuelve el Data URL
   * comprimido para no romper el flujo (el archivo queda pequeño).
   */
  async uploadImage(file, {
    ownerId,
    folder = 'images',
    visibility = 'public',
    maxMb = CHAMBAYA.LIMITS.IMAGE_MB,
    maxSide = 1000,
    quality = 0.72,
    strict = false,
  } = {}) {
    this._assertImage(file, maxMb);
    const dataUrl = await compressImage(file, maxSide, quality);

    if (this.isLocal || !this.enabled) return dataUrl;

    try {
      return await this._uploadDataUrl(dataUrl, { ownerId, folder, visibility });
    } catch (error) {
      this.lastError = error.message || String(error);
      console.warn('TuOficio: no se pudo subir la imagen a Storage; se guardará comprimida.', error);
      if (strict) throw new Error('No se pudo subir la imagen a Firebase Storage. Revisa que Storage esté habilitado y las reglas publicadas.');
      return dataUrl;
    }
  }

  /** Sube un video corto (MP4/WebM/MOV). En modo local devuelve Data URL. */
  async uploadVideo(file, {
    ownerId,
    folder = 'videos',
    visibility = 'public',
    maxMb = CHAMBAYA.LIMITS.VIDEO_MB,
  } = {}) {
    this._assertVideo(file, maxMb);

    if (this.isLocal) return readFileAsDataUrl(file);

    if (!this.enabled) {
      throw new Error('Firebase Storage no está disponible. Habilita Storage en Firebase o pega un enlace al video.');
    }

    // Los videos son más pesados: se da margen según el tamaño (mínimo 60 s,
    // ~128 KB/s) para no cancelar subidas legítimas en conexiones lentas.
    const timeoutMs = Math.max(60000, Math.ceil(file.size / (128 * 1024)) * 1000);
    return this._uploadFile(file, this._buildPath({ ownerId, folder, visibility, file }), timeoutMs);
  }

  /** Borra un archivo de Storage a partir de su URL de descarga. */
  async deleteByUrl(url) {
    if (!url || this.isLocal || !this.enabled) return false;
    if (!String(url).includes('firebasestorage')) return false;
    let timer = null;
    try {
      await Promise.race([
        firebase.storage().refFromURL(url).delete(),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('storage/timeout')), this.uploadTimeoutMs);
        }),
      ]);
      return true;
    } catch (error) {
      console.warn('TuOficio: no se pudo eliminar el archivo de Storage.', error.message);
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  _assertImage(file, maxMb) {
    if (!file) throw new Error('Selecciona una imagen.');
    if (!/^image\/(jpeg|png)$/.test(file.type || '')) {
      throw new Error('La imagen debe ser JPG o PNG.');
    }
    if (file.size > maxMb * 1024 * 1024) {
      throw new Error(`La imagen supera ${maxMb} MB.`);
    }
  }

  _assertVideo(file, maxMb) {
    if (!file) throw new Error('Selecciona un video.');
    if (!/^video\/(mp4|webm|quicktime)$/.test(file.type || '')) {
      throw new Error('El video debe ser MP4, WebM o MOV.');
    }
    if (file.size > maxMb * 1024 * 1024) {
      throw new Error(`El video supera ${maxMb} MB.`);
    }
  }

  async _uploadDataUrl(dataUrl, { ownerId, folder, visibility }) {
    if (!ownerId) throw new Error('No hay un usuario autenticado para subir el archivo.');
    const blob = this._dataUrlToBlob(dataUrl);
    const file = new File([blob], `image.${blob.type === 'image/png' ? 'png' : 'jpg'}`, { type: blob.type });
    return this._uploadFile(file, this._buildPath({ ownerId, folder, visibility, file }));
  }

  async _uploadFile(file, path, timeoutMs = this.uploadTimeoutMs) {
    const ref = firebase.storage().ref(path);

    let task;
    try {
      task = ref.put(file, {
        contentType: file.type,
        cacheControl: 'public,max-age=31536000',
      });
    } catch (error) {
      throw this._storageError(error);
    }

    // Firebase Storage reintenta solo los errores de red, así que un bucket
    // inexistente puede dejar la promesa pendiente para siempre. El límite de
    // tiempo corta la espera y permite que la app muestre el error o use el
    // respaldo comprimido en lugar de quedarse "cargando".
    let timer = null;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        try { task.cancel(); } catch (e) { /* la tarea ya terminó */ }
        const error = new Error(
          `Storage no respondió en ${Math.round(timeoutMs / 1000)} s. ` +
          'Revisa que Cloud Storage esté creado en Firebase Console y que las reglas estén publicadas.'
        );
        error.code = 'storage/timeout';
        reject(error);
      }, timeoutMs);
    });

    const upload = task
      .then(snapshot => snapshot.ref.getDownloadURL())
      .catch(error => { throw this._storageError(error); });

    try {
      return await Promise.race([upload, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  /** Traduce los errores de Storage a mensajes accionables. */
  _storageError(error) {
    if (error && error.code === 'storage/timeout') return error;
    const code = error && error.code ? String(error.code) : '';
    const map = {
      'storage/bucket-not-found': 'Cloud Storage no está creado en Firebase. Actívalo en Firebase Console → Storage.',
      'storage/unauthorized': 'Las reglas de Storage no permiten esta subida. Revisa storage.rules y que tu sesión esté activa.',
      'storage/retry-limit-exceeded': 'Storage no respondió. Revisa tu conexión y que Cloud Storage esté habilitado.',
      'storage/unknown': 'Storage devolvió un error desconocido. Revisa que el bucket exista y esté habilitado.',
    };
    const friendly = map[code];
    if (!friendly) return error instanceof Error ? error : new Error(String(error));
    const wrapped = new Error(friendly);
    wrapped.code = code;
    wrapped.original = error;
    return wrapped;
  }

  _buildPath({ ownerId, folder, visibility, file }) {
    if (!ownerId) throw new Error('No hay un usuario autenticado para subir el archivo.');
    const area = visibility === 'private' ? 'private' : 'public';
    const safeFolder = String(folder || 'files').replace(/[^a-z0-9_-]/gi, '');
    const ext = this._extension(file);
    const random = Math.random().toString(36).slice(2, 9);
    return `users/${ownerId}/${area}/${safeFolder}/${Date.now()}-${random}.${ext}`;
  }

  _extension(file) {
    const byType = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'video/quicktime': 'mov',
    };
    if (byType[file.type]) return byType[file.type];
    const name = String(file.name || '');
    const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : 'bin';
    return ext.replace(/[^a-z0-9]/g, '') || 'bin';
  }

  _dataUrlToBlob(dataUrl) {
    const match = /^data:([^;,]+);base64,(.+)$/.exec(String(dataUrl));
    if (!match) throw new Error('La imagen comprimida no tiene un formato válido.');
    const mime = match[1];
    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }
}
