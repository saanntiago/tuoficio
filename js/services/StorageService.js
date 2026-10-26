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

    return this._uploadFile(file, this._buildPath({ ownerId, folder, visibility, file }));
  }

  /** Borra un archivo de Storage a partir de su URL de descarga. */
  async deleteByUrl(url) {
    if (!url || this.isLocal || !this.enabled) return false;
    if (!String(url).includes('firebasestorage')) return false;
    try {
      await firebase.storage().refFromURL(url).delete();
      return true;
    } catch (error) {
      console.warn('TuOficio: no se pudo eliminar el archivo de Storage.', error.message);
      return false;
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

  async _uploadFile(file, path) {
    const ref = firebase.storage().ref(path);
    const snapshot = await ref.put(file, {
      contentType: file.type,
      cacheControl: 'public,max-age=31536000',
    });
    return snapshot.ref.getDownloadURL();
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
