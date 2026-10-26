/**
 * Portafolio del trabajador (RF07 / HU-04).
 * Cada proyecto muestra el antes y el después, permite adjuntar un video corto
 * y valida formato y peso (JPG/PNG ≤ 5 MB; video ≤ 50 MB).
 */
class PortfolioPage extends BasePage {
  constructor(app, ui) {
    super(app, ui);
    this.items = [];
    this.worker = null;
  }

  async render(container) {
    if (!this.isWorker) {
      container.innerHTML = this._empty('fa-lock', 'Sección para trabajadores', 'El portafolio solo está disponible para cuentas de técnico.');
      return;
    }
    container.innerHTML = '<div class="page-loading"><span class="spinner dark"></span></div>';
    try {
      [this.items, this.worker] = await Promise.all([
        this._app.workers.getPortfolio(this.uid),
        this._app.workers.getById(this.uid),
      ]);
    } catch (e) {
      container.innerHTML = this._empty('fa-triangle-exclamation', 'No se pudo cargar el portafolio', escapeHtml(e.message));
      return;
    }
    if (!this._alive) return;

    container.innerHTML = `
      ${this._header('Portafolio de trabajos', 'Muestra tus mejores resultados con fotos de antes y después. Los clientes valoran la evidencia real.',
        `<button class="btn btn-primary" onclick="ui._getPage('portfolio').openAdd()"><i class="fas fa-plus"></i> Agregar trabajo</button>`)}
      <div class="notice notice-info">
        <i class="fas fa-images"></i>
        <div><strong>Requisitos:</strong> cada proyecto debe incluir una foto del <em>antes</em> y otra del <em>después</em> en JPG o PNG de máximo 5 MB. El video es opcional (máx. 50 MB) y se muestra junto al proyecto.</div>
      </div>
      ${this.items.length ? `<div class="portfolio-grid">${this.items.map(item => this._portfolioCard(item)).join('')}</div>`
        : `<div class="portfolio-empty">
            <div class="portfolio-empty-art"><i class="fas fa-images"></i></div>
            ${this._empty('fa-camera-retro', 'Tu portafolio está vacío', 'Agrega tu primer trabajo con una foto del antes y otra del después. Los perfiles con portafolio reciben más solicitudes.',
              '<button class="btn btn-primary" onclick="ui._getPage(\'portfolio\').openAdd()"><i class="fas fa-plus"></i> Agregar mi primer trabajo</button>')}
          </div>`}`;
  }

  _portfolioCard(item) {
    const before = item.antes || placeholderImage('Antes', '#6E6B64');
    const after = item.despues || placeholderImage('Después', '#4E7A5C');
    const video = item.video || '';
    return `<article class="portfolio-card">
      <div class="portfolio-pair">
        <figure class="portfolio-figure">
          <img src="${escapeHtml(before)}" alt="Antes: ${escapeHtml(item.titulo || '')}" loading="lazy"/>
          <figcaption><span class="phase before">Antes</span></figcaption>
        </figure>
        <figure class="portfolio-figure">
          <img src="${escapeHtml(after)}" alt="Después: ${escapeHtml(item.titulo || '')}" loading="lazy"/>
          <figcaption><span class="phase after">Después</span></figcaption>
        </figure>
      </div>
      <div class="portfolio-body">
        <div class="portfolio-title-row">
          <h3>${escapeHtml(item.titulo || 'Trabajo sin título')}</h3>
          <button class="icon-btn danger" title="Eliminar" onclick="ui._getPage('portfolio').remove('${item.id}')"><i class="fas fa-trash"></i></button>
        </div>
        <p>${escapeHtml(item.descripcion || 'Sin descripción.')}</p>
        <div class="portfolio-meta">
          <span><i class="fas fa-calendar"></i> ${formatDate(item.fecha)}</span>
          ${video ? '<span><i class="fas fa-video"></i> Video adjunto</span>' : ''}
        </div>
        ${video ? (String(video).startsWith('data:video')
          ? `<video class="portfolio-video" src="${escapeHtml(video)}" controls preload="metadata"></video>`
          : `<a class="btn btn-secondary btn-sm" href="${escapeHtml(video)}" target="_blank" rel="noopener"><i class="fas fa-play"></i> Ver video del trabajo</a>`) : ''}
      </div>
    </article>`;
  }

  openAdd() {
    this._ui.openModal(`
      <div class="modal-header">
        <div class="modal-title">Agregar trabajo al portafolio</div>
        <button class="modal-close" onclick="ui.closeModal()"><i class="fas fa-times"></i></button>
      </div>
      <div class="form-group"><label>Título del trabajo *</label>
        <input class="form-input" id="pfTitle" maxlength="90" placeholder="Ej.: Cambio de tablero eléctrico">
      </div>
      <div class="form-group"><label>Descripción</label>
        <textarea class="form-input" id="pfDesc" rows="3" maxlength="300" placeholder="Qué hiciste, materiales y tiempo del trabajo..."></textarea>
      </div>
      <div class="form-group"><label>Fecha del trabajo</label>
        <input class="form-input" id="pfDate" type="date" max="${this._todayIso()}" value="${this._todayIso()}">
      </div>
      <div class="upload-pair">
        <label class="upload-box" id="boxBefore">
          <i class="fas fa-cloud-arrow-up"></i>
          <strong>Foto del antes *</strong>
          <span>JPG o PNG · máx. 5 MB</span>
          <input type="file" id="pfBefore" accept="image/png,image/jpeg" hidden onchange="ui._getPage('portfolio').preview(this, 'before')">
          <img class="upload-preview" id="prevBefore" alt="" hidden>
        </label>
        <label class="upload-box" id="boxAfter">
          <i class="fas fa-cloud-arrow-up"></i>
          <strong>Foto del después *</strong>
          <span>JPG o PNG · máx. 5 MB</span>
          <input type="file" id="pfAfter" accept="image/png,image/jpeg" hidden onchange="ui._getPage('portfolio').preview(this, 'after')">
          <img class="upload-preview" id="prevAfter" alt="" hidden>
        </label>
      </div>
      <div class="form-group" style="margin-top:16px"><label>Video corto (opcional)</label>
        <input class="form-input" id="pfVideo" type="file" accept="video/mp4,video/webm,video/quicktime" onchange="ui._getPage('portfolio').checkVideo(this)">
        <div class="field-hint">MP4, WebM o MOV · máximo 50 MB. ${this.isLocal ? 'En modo demostración el video debe pesar menos de 4 MB para guardarse en el navegador.' : ''}</div>
      </div>
      <div class="form-group"><label>O pega un enlace al video (opcional)</label>
        <input class="form-input" id="pfVideoUrl" placeholder="https://...">
      </div>
      <div class="form-error" id="pfError" style="display:none"></div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="ui.closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="pfSubmit" onclick="ui._getPage('portfolio').save(this)"><i class="fas fa-floppy-disk"></i> Guardar trabajo</button>
      </div>`, { wide: true });
  }

  preview(input, kind) {
    const file = input.files?.[0];
    if (!file) return;
    const img = document.getElementById(kind === 'before' ? 'prevBefore' : 'prevAfter');
    if (!/^image\/(jpeg|png)$/.test(file.type)) {
      input.value = '';
      return this._ui.showToast('La foto debe ser JPG o PNG.', 'error');
    }
    if (file.size > CHAMBAYA.LIMITS.IMAGE_MB * 1024 * 1024) {
      input.value = '';
      return this._ui.showToast(`La foto supera ${CHAMBAYA.LIMITS.IMAGE_MB} MB.`, 'error');
    }
    if (img) {
      img.src = URL.createObjectURL(file);
      img.hidden = false;
      img.parentElement.querySelector('i')?.classList.add('hidden');
      img.parentElement.querySelector('span')?.classList.add('hidden');
    }
  }

  checkVideo(input) {
    const file = input.files?.[0];
    if (!file) return;
    const maxMb = this.isLocal ? 4 : CHAMBAYA.LIMITS.VIDEO_MB;
    if (file.size > maxMb * 1024 * 1024) {
      input.value = '';
      return this._ui.showToast(
        this.isLocal
          ? 'En modo demostración el video debe pesar menos de 4 MB (almacenamiento del navegador). También puedes pegar un enlace.'
          : `El video supera ${CHAMBAYA.LIMITS.VIDEO_MB} MB.`, 'error', 6000);
    }
    this._ui.showToast('Video listo para adjuntar.', 'success', 1800);
  }

  async save(btn) {
    const err = document.getElementById('pfError');
    const fail = msg => { if (err) { err.textContent = msg; err.style.display = 'block'; } this._ui.showToast(msg, 'error'); };
    const title = document.getElementById('pfTitle').value.trim();
    const description = document.getElementById('pfDesc').value.trim();
    const fecha = document.getElementById('pfDate').value || this._todayIso();
    const beforeFile = document.getElementById('pfBefore').files?.[0];
    const afterFile = document.getElementById('pfAfter').files?.[0];
    const videoFile = document.getElementById('pfVideo').files?.[0];
    const videoUrl = document.getElementById('pfVideoUrl').value.trim();

    if (!title) return fail('Escribe un título para el trabajo.');
    if (!beforeFile || !afterFile) return fail('Adjunta la foto del antes y la del después.');

    this._setBusy(btn, true, 'Subiendo fotos...');
    this._app.storage.lastError = '';
    try {
      const [antes, despues] = await Promise.all([
        this._app.storage.uploadImage(beforeFile, {
          ownerId: this.uid,
          folder: 'portafolio',
          visibility: 'public',
          maxSide: 1000,
          quality: .7,
        }),
        this._app.storage.uploadImage(afterFile, {
          ownerId: this.uid,
          folder: 'portafolio',
          visibility: 'public',
          maxSide: 1000,
          quality: .7,
        }),
      ]);
      if (this._app.storage.lastError) {
        this._ui.showToast(
          `No se pudo usar Cloud Storage: ${this._app.storage.lastError} ` +
          'Las fotos se guardaron comprimidas.',
          'info', 9000);
      }
      let video = videoUrl;
      if (videoFile) {
        if (videoFile.size > (this.isLocal ? 4 : CHAMBAYA.LIMITS.VIDEO_MB) * 1024 * 1024) {
          throw new Error('El video supera el peso permitido. Pega un enlace o usa un archivo más liviano.');
        }
        this._setBusy(btn, true, 'Subiendo video...');
        video = await this._app.storage.uploadVideo(videoFile, {
          ownerId: this.uid,
          folder: 'portafolio',
          visibility: 'public',
          maxMb: this.isLocal ? 4 : CHAMBAYA.LIMITS.VIDEO_MB,
        });
      }
      await this._app.workers.addPortfolioItem(this.uid, {
        titulo: title,
        descripcion: description,
        fecha,
        antes,
        despues,
        video: video || '',
      });
      this._ui.closeModal();
      this._ui.showToast('Trabajo agregado a tu portafolio.', 'success');
      this._reload();
    } catch (e) {
      fail(e.message || 'No se pudo guardar el trabajo.');
    } finally {
      this._setBusy(btn, false);
    }
  }

  async remove(itemId) {
    const ok = await this._ui.confirm({
      title: 'Eliminar trabajo',
      message: '¿Quieres eliminar este proyecto del portafolio? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar', danger: true,
    });
    if (!ok) return;
    try {
      const item = (this.items || []).find(p => p.id === itemId);
      await this._app.workers.removePortfolioItem(this.uid, itemId);
      if (item) {
        await Promise.all([
          this._app.storage.deleteByUrl(item.antes),
          this._app.storage.deleteByUrl(item.despues),
          this._app.storage.deleteByUrl(item.video),
        ]);
      }
      this._ui.showToast('Proyecto eliminado.', 'success');
      this._reload();
    } catch (e) {
      this._ui.showToast(e.message, 'error');
    }
  }
}
