/**
 * Perfil del usuario.
 * El trabajador administra aquí su hoja de vida, tarifas indicativas,
 * cobertura, horario, foto y solicitud de verificación con documento y selfie.
 */
class ProfilePage extends BasePage {
  constructor(app, ui) {
    super(app, ui);
    this.worker = null;
    this.verification = null;
    this.reviews = [];
  }

  async render(container) {
    container.innerHTML = '<div class="page-loading"><span class="spinner dark"></span></div>';
    try {
      if (this.isWorker) {
        this.worker = await this._app.workers.getById(this.uid);
        this.verification = await this._app.verifications.getMine(this.uid);
        this.reviews = await this._app.workers.getReviewsByWorker(this.uid);
      }
    } catch (e) {
      console.warn(e);
    }
    if (!this._alive) return;
    const w = this.worker || {};
    const user = this.user;
    const completeness = this.isWorker
      ? this._app.workers.completeness({
          nombre: w.name || user.name, oficio: w.trade || user.oficio, zona: w.zone || user.zone,
          descripcion: w.description, experiencia: w.experience, tarifas: w.tarifas,
          telefono: w.phone || user.telefono, habilidades: w.habilidades, portafolio: w.portafolio,
          horario: w.schedule,
        }, user)
      : null;

    container.innerHTML = `
      ${this._header(this.isWorker ? 'Mi perfil y hoja de vida' : 'Mi perfil',
        this.isWorker
          ? 'Así te ven los empleadores. Un perfil completo y verificado recibe más solicitudes.'
          : 'Actualiza tus datos de contacto y tu zona para recibir mejores recomendaciones.',
        this.isWorker ? `<button class="btn btn-secondary" onclick="ui._getPage('profile').copyPublicLink()"><i class="fas fa-link"></i> Copiar enlace público</button>
          <a class="btn btn-primary" href="perfil.html?id=${encodeURIComponent(this.uid)}" target="_blank"><i class="fas fa-arrow-up-right-from-square"></i> Ver perfil público</a>` : '')}
      ${completeness ? `<div class="profile-completeness">
        <div class="profile-progress">
          <div class="progress-head"><span>Perfil completo</span><strong>${completeness.percent}%</strong></div>
          <div class="progress-bar"><div class="progress-fill" style="width:${completeness.percent}%"></div></div>
        </div>
        <div class="completeness-hint">${completeness.percent === 100
          ? '<i class="fas fa-circle-check"></i> Tu perfil está completo. ¡Buen trabajo!'
          : `<i class="fas fa-lightbulb"></i> Completa descripción, tarifas, habilidades y portafolio para mejorar tu posicionamiento.`}</div>
      </div>` : ''}
      <div class="profile-layout">
        <div class="profile-main">
          ${this._section('Datos personales', `
            <div class="avatar-editor">
              ${this._avatar(user.name, user.avatarColor, 84, user.avatarUrl, 22)}
              <div>
                <div class="avatar-name">${escapeHtml(user.name || '')}</div>
                <div class="muted small">${escapeHtml(user.email || '')}</div>
                <label class="btn btn-secondary btn-sm" style="margin-top:8px">
                  <i class="fas fa-camera"></i> Cambiar foto
                  <input type="file" accept="image/png,image/jpeg" hidden onchange="ui._getPage('profile').changeAvatar(this)"/>
                </label>
                <div class="muted tiny">JPG o PNG · máximo 5 MB</div>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Nombre completo *</label><input class="form-input" id="pfName" value="${escapeHtml(user.name || '')}"></div>
              <div class="form-group"><label>Teléfono</label><input class="form-input" id="pfPhone" type="tel" value="${escapeHtml(user.telefono || w.phone || '')}" placeholder="310 555 0101"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>Zona / localidad</label>
                <select class="form-input" id="pfZone">${CHAMBAYA.ZONES.map(z => `<option ${((w.zone || user.zone) === z.name) ? 'selected' : ''}>${z.name}</option>`).join('')}</select>
              </div>
              ${this.isWorker ? `<div class="form-group"><label>Oficio principal</label>
                <select class="form-input" id="pfTrade">${CHAMBAYA.TRADES.map(t => `<option ${(w.trade || user.oficio) === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
              </div>` : `<div class="form-group"><label>Documento</label><input class="form-input" id="pfDoc" value="${escapeHtml(user.documento || '')}" placeholder="Cédula de ciudadanía"></div>`}
            </div>
            ${!this.isWorker ? `<div class="form-group"><label>Correo electrónico</label><input class="form-input" value="${escapeHtml(user.email || '')}" disabled></div>
              <div class="notice notice-info"><i class="fas fa-shield-halved"></i><div>Tu correo se usa para iniciar sesión con Google o correo y contraseña.</div></div>` : ''}`)}
          ${this.isWorker ? this._workerSections(w) : ''}
          <div class="save-bar">
            <button class="btn btn-primary" id="saveProfileBtn" onclick="ui._getPage('profile').save(this)">
              <i class="fas fa-floppy-disk"></i> Guardar cambios
            </button>
            <span class="muted small">Los cambios se reflejan en el directorio y en tu perfil público.</span>
          </div>
        </div>
        <aside class="profile-side">
          ${this.isWorker ? this._verificationCard(w) : this._clientSide()}
        </aside>
      </div>`;
  }

  _workerSections(w) {
    return `
      ${this._section('Presentación profesional', `
        <div class="form-row">
          <div class="form-group"><label>Años de experiencia</label><input class="form-input" id="pfExperience" type="number" min="0" max="60" value="${Number(w.experience) || 0}"></div>
          <div class="form-group"><label>Tipo de hoja de vida</label>
            <select class="form-input" id="pfCvType">
              <option value="profesional" ${w.typeCv !== 'informal' ? 'selected' : ''}>Profesional / certificada</option>
              <option value="informal" ${w.typeCv === 'informal' ? 'selected' : ''}>Oficios empíricos</option>
            </select>
          </div>
        </div>
        <div class="form-group"><label>Descripción de tus servicios</label>
          <textarea class="form-input" id="pfDescription" rows="4" maxlength="600" placeholder="Describe qué haces, cómo trabajas y qué garantías ofreces...">${escapeHtml(w.description || '')}</textarea>
          <div class="field-hint">Máximo 600 caracteres. Un buen resumen genera más contactos.</div>
        </div>
        <div class="form-group"><label>Habilidades (separadas por coma)</label>
          <input class="form-input" id="pfSkills" value="${escapeHtml((w.habilidades || []).join(', '))}" placeholder="Destapes, Fugas, Grifería">
        </div>
        <div class="form-group"><label>Zonas de cobertura</label>
          <div class="check-grid">
            ${CHAMBAYA.ZONES.map(z => `<label class="check-chip"><input type="checkbox" class="coverage-check" value="${z.name}" ${(w.coverage || []).includes(z.name) ? 'checked' : ''}/> ${z.name}</label>`).join('')}
          </div>
        </div>
        <div class="form-group"><label>Días de atención</label>
          <div class="check-grid days">
            ${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => `<label class="check-chip"><input type="checkbox" class="day-check" value="${d}" ${(w.schedule?.dias || []).includes(d) ? 'checked' : ''}/> ${d}</label>`).join('')}
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Hora de inicio</label><input class="form-input" id="pfStart" type="time" value="${escapeHtml(w.schedule?.inicio || '08:00')}"></div>
          <div class="form-group"><label>Hora de fin</label><input class="form-input" id="pfEnd" type="time" value="${escapeHtml(w.schedule?.fin || '18:00')}"></div>
        </div>
        <div class="form-group"><label>WhatsApp</label><input class="form-input" id="pfWhatsapp" type="tel" value="${escapeHtml(w.whatsapp || '')}" placeholder="310 555 0101"></div>
        <label class="switch-label"><input type="checkbox" id="pfContactVisible" ${w.contactVisible !== false ? 'checked' : ''}/> Mostrar mi teléfono y WhatsApp en el perfil público</label>
      `)}
      ${this._section('Tarifas indicativas', `
        <p class="muted small">Estos valores se muestran como referencia. El presupuesto final se acuerda con cada cliente.</p>
        <div class="form-row">
          <div class="form-group"><label>Visita diagnóstica (COP)</label><input class="form-input" id="pfVisitFee" type="number" min="0" step="5000" value="${Number(w.visitFee) || 0}"></div>
          <div class="form-group"><label>Hora de trabajo (COP)</label><input class="form-input" id="pfHourFee" type="number" min="0" step="5000" value="${Number(w.hourlyFee) || 0}"></div>
        </div>
        <div class="form-group"><label>Nota sobre las tarifas</label>
          <textarea class="form-input" id="pfFeeNote" rows="2" maxlength="180" placeholder="Ej.: Materiales aparte. Visita descontable si acepta el trabajo.">${escapeHtml(w.tarifas?.nota || '')}</textarea>
        </div>
        <div class="fee-preview">
          <div class="fee-item"><span>Visita diagnóstica</span><strong id="feeVisitPreview">${formatMoney(w.visitFee)}</strong></div>
          <div class="fee-item"><span>Hora de trabajo</span><strong id="feeHourPreview">${formatMoney(w.hourlyFee)}</strong></div>
        </div>`)}
      ${this._section('Perfil público', `
        <p class="muted small">Comparte tu perfil por WhatsApp para que más clientes te encuentren.</p>
        <div class="share-link"><i class="fas fa-link"></i><span>${escapeHtml(publicProfileUrl(this.uid))}</span></div>
        <div class="modal-actions wrap" style="justify-content:flex-start;margin-top:14px">
          <button class="btn btn-secondary btn-sm" onclick="ui._getPage('profile').copyPublicLink()"><i class="fas fa-copy"></i> Copiar enlace</button>
          <button class="btn btn-whatsapp btn-sm" onclick="ui._getPage('profile').shareWhatsApp()"><i class="fab fa-whatsapp"></i> Compartir por WhatsApp</button>
          <a class="btn btn-secondary btn-sm" href="perfil.html?id=${encodeURIComponent(this.uid)}" target="_blank"><i class="fas fa-arrow-up-right-from-square"></i> Abrir</a>
        </div>`)}
      ${this._section('Reseñas recibidas', this._reviewsBlock(w))}`;
  }

  _reviewsBlock(w) {
    const reviews = this.reviews || [];
    if (!reviews.length) {
      return `<p class="muted small">Aún no has recibido reseñas. Se habilitan cuando un cliente finaliza un trabajo contigo y decide calificarte.</p>`;
    }
    const avg = reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviews.length;
    return `
      <div class="reviews-summary">
        <div class="reviews-score">${avg.toFixed(1)}</div>
        <div>
          <div class="reviews-stars">${starsHtml(avg, 14)}</div>
          <div class="muted small">${reviews.length} reseña${reviews.length === 1 ? '' : 's'} de trabajos finalizados</div>
        </div>
      </div>
      <div class="worker-reviews">
        ${reviews.map(r => `
          <article class="worker-review">
            <div class="review-head">
              <span class="review-ava" style="background:${escapeHtml(r.clientColor || '#4E7A5C')}">${escapeHtml(initialsOf(r.clientName || 'Cliente'))}</span>
              <div class="review-who">
                <b>${escapeHtml(r.clientName || 'Cliente')}</b>
                <span>${r.date ? formatDate(r.date) : 'Reseña verificada'}</span>
              </div>
              <div class="review-stars">${starsHtml(r.rating, 11)}</div>
            </div>
            <p class="review-text">${escapeHtml(r.text || 'Sin comentario.')}</p>
          </article>`).join('')}
      </div>
      <p class="muted tiny" style="margin-top:10px"><i class="fas fa-shield-halved"></i> Solo los clientes con un trabajo finalizado pueden publicar una reseña.</p>`;
  }

  _verificationCard(w) {
    const status = w.verificationStatus || CHAMBAYA.VERIFICATION_STATUS.NONE;
    const v = this.verification;
    const isApproved = w.badgeVerified || status === CHAMBAYA.VERIFICATION_STATUS.APPROVED;
    const isPending = status === CHAMBAYA.VERIFICATION_STATUS.PENDING || v?.estado === 'Pendiente';
    const isRejected = status === CHAMBAYA.VERIFICATION_STATUS.REJECTED || v?.estado === 'Rechazado';
    const pendingDate = v?.createdAt ? timeAgo(v.createdAt) : '';

    return `<div class="side-card verification-card ${isApproved ? 'approved' : isPending ? 'pending' : isRejected ? 'rejected' : ''}">
      <div class="verification-icon"><i class="fas ${isApproved ? 'fa-circle-check' : isPending ? 'fa-hourglass-half' : 'fa-shield-halved'}"></i></div>
      <h3>${isApproved ? 'Perfil verificado' : isPending ? 'Verificación en revisión' : isRejected ? 'Verificación rechazada' : 'Obtén tu insignia'}</h3>
      <p>${isApproved
        ? 'Tu documento y tu rostro fueron validados. La insignia aparece junto a tu nombre en todo TuOficioCol.'
        : isPending
          ? `Recibimos tu solicitud ${pendingDate}. Un administrador la revisará y te notificará la decisión.`
          : isRejected
            ? `Tu solicitud fue rechazada. ${escapeHtml(v?.observacion || 'Revisa que el documento sea legible y coincida con tu rostro.')} Puedes volver a intentarlo.`
            : 'Envía tu documento de identidad y una foto de tu rostro. Un administrador revisará el caso y, si es aprobado, obtendrás la insignia de verificado.'}</p>
      ${isApproved
        ? '<div class="verified-badge big"><i class="fas fa-check-circle"></i> Insignia activa</div>'
        : isPending
          ? '<div class="verification-steps"><span class="step done"><i class="fas fa-check"></i> Enviado</span><span class="step current"><i class="fas fa-clock"></i> En revisión</span><span class="step"><i class="fas fa-certificate"></i> Aprobación</span></div>'
          : `<button class="btn btn-primary btn-full" onclick="ui._getPage('profile').openVerification()"><i class="fas fa-id-card"></i> ${isRejected ? 'Enviar nueva solicitud' : 'Solicitar verificación'}</button>`}
      <div class="verification-note"><i class="fas fa-lock"></i> Tus documentos solo los ve el equipo administrativo.</div>
    </div>
    <div class="side-card">
      <h3>Consejos para tu perfil</h3>
      <ul class="tips-list">
        <li><i class="fas fa-check"></i> Usa una foto real y clara.</li>
        <li><i class="fas fa-check"></i> Describe tus servicios y garantías.</li>
        <li><i class="fas fa-check"></i> Agrega trabajos con fotos de antes y después.</li>
        <li><i class="fas fa-check"></i> Mantén tus tarifas actualizadas.</li>
      </ul>
    </div>`;
  }

  _clientSide() {
    return `<div class="side-card">
        <h3>Tu cuenta</h3>
        <div class="account-line"><i class="fas fa-envelope"></i><span>${escapeHtml(this.user.email || '')}</span></div>
        <div class="account-line"><i class="fas fa-location-dot"></i><span>${escapeHtml(this.user.zone || 'Sin zona')}</span></div>
        <div class="account-line"><i class="fas fa-calendar"></i><span>Miembro desde ${formatDate(this.user.fechaRegistro)}</span></div>
      </div>
      <div class="side-card">
        <h3>¿Buscas un técnico?</h3>
        <p class="muted small">Explora el directorio, guarda favoritos y publica una solicitud para recibir ofertas.</p>
        <button class="btn btn-primary btn-full" onclick="ui.navigateTo('workers')"><i class="fas fa-search"></i> Ir al directorio</button>
      </div>`;
  }

  /* ── Archivos ───────────────────────────────────────────── */

  async changeAvatar(input) {
    const file = input.files?.[0];
    if (!file) return;
    if (!/^image\/(jpeg|png)$/.test(file.type)) return this._ui.showToast('Usa una imagen JPG o PNG.', 'error');
    if (file.size > CHAMBAYA.LIMITS.IMAGE_MB * 1024 * 1024) return this._ui.showToast(`La imagen supera ${CHAMBAYA.LIMITS.IMAGE_MB} MB.`, 'error');
    try {
      const dataUrl = await compressImage(file, 500, .8);
      await this._app.db.update(CHAMBAYA.COLLECTIONS.USERS, this.uid, { foto: dataUrl });
      this.user.avatarUrl = dataUrl;
      this._ui._updateHeaderUser(this.user);
      this._ui.showToast('Foto actualizada', 'success');
      this._reload();
    } catch (e) {
      this._ui.showToast(e.message, 'error');
    }
  }

  /* ── Guardado ───────────────────────────────────────────── */

  async save(btn) {
    const name = document.getElementById('pfName')?.value.trim();
    const phone = document.getElementById('pfPhone')?.value.trim() || '';
    const zone = document.getElementById('pfZone')?.value || '';
    if (!name) return this._ui.showToast('El nombre es obligatorio.', 'error');

    const payload = {
      nombre: name,
      telefono: phone,
      whatsapp: document.getElementById('pfWhatsapp')?.value.trim() || phone,
      zona: zone,
    };
    if (!this.isWorker) {
      const doc = document.getElementById('pfDoc')?.value.trim();
      if (doc !== undefined) payload.documento = doc;
    }

    if (this.isWorker) {
      const skills = (document.getElementById('pfSkills')?.value || '')
        .split(',').map(s => s.trim()).filter(Boolean).slice(0, 12);
      const coverage = [...document.querySelectorAll('.coverage-check:checked')].map(c => c.value);
      const dias = [...document.querySelectorAll('.day-check:checked')].map(c => c.value);
      payload.oficio = document.getElementById('pfTrade')?.value || '';
      payload.experiencia = Number(document.getElementById('pfExperience')?.value) || 0;
      payload.descripcion = document.getElementById('pfDescription')?.value.trim() || '';
      payload.habilidades = skills;
      payload.zonasCobertura = coverage.length ? coverage : [zone];
      payload.horario = {
        dias,
        inicio: document.getElementById('pfStart')?.value || '08:00',
        fin: document.getElementById('pfEnd')?.value || '18:00',
      };
      payload.contactoVisible = Boolean(document.getElementById('pfContactVisible')?.checked);
      payload.tipoHojaVida = document.getElementById('pfCvType')?.value || 'profesional';
      payload.tarifas = {
        visitaDiagnostica: Number(document.getElementById('pfVisitFee')?.value) || 0,
        horaBase: Number(document.getElementById('pfHourFee')?.value) || 0,
        nota: document.getElementById('pfFeeNote')?.value.trim() || '',
      };
      if (!payload.descripcion) return this._ui.showToast('Agrega una descripción de tus servicios.', 'error');
    }

    this._setBusy(btn, true, 'Guardando...');
    try {
      await this._app.workers.updateProfile(this.uid, payload);
      Object.assign(this.user, {
        name, nombre: name, telefono: payload.telefono,
        zone, zona: zone, oficio: payload.oficio || this.user.oficio,
      });
      this._ui._updateHeaderUser(this.user);
      this._ui.showToast('Perfil actualizado. Los cambios ya son visibles.', 'success');
      this._reload();
    } catch (e) {
      this._ui.showToast(e.message || 'No se pudo guardar el perfil.', 'error');
    } finally {
      this._setBusy(btn, false);
    }
  }

  /* ── Verificación (RF06 / HU-06) ────────────────────────── */

  openVerification() {
    this._ui.openModal(`
      <div class="modal-header">
        <div class="modal-title">Solicitar verificación</div>
        <button class="modal-close" onclick="ui.closeModal()"><i class="fas fa-times"></i></button>
      </div>
      <p class="modal-copy">Adjunta una foto legible de tu documento de identidad y una selfie de tu rostro. El administrador comparará ambos archivos antes de aprobar la insignia.</p>
      <div class="form-row">
        <div class="form-group"><label>Tipo de documento</label>
          <select class="form-input" id="verDocType">
            <option>Cédula de ciudadanía</option><option>Cédula de extranjería</option><option>Pasaporte</option>
          </select>
        </div>
        <div class="form-group"><label>Número de documento</label><input class="form-input" id="verDocNumber" placeholder="1020304050"></div>
      </div>
      <div class="form-group"><label>Documento de identidad (JPG/PNG, máx. 5 MB) *</label>
        <input class="form-input" id="verDocFile" type="file" accept="image/png,image/jpeg" onchange="ui._getPage('profile').checkFile(this, 'doc')">
      </div>
      <div class="form-group"><label>Foto de tu rostro (selfie, máx. 5 MB) *</label>
        <input class="form-input" id="verSelfieFile" type="file" accept="image/png,image/jpeg" onchange="ui._getPage('profile').checkFile(this, 'selfie')">
      </div>
      <div class="form-group"><label>Certificados o experiencia (opcional)</label>
        <textarea class="form-input" id="verCerts" rows="2" placeholder="Ej.: Técnico en electricidad, SENA 2019."></textarea>
      </div>
      <div class="form-error" id="verError" style="display:none"></div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="ui.closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="verSubmit" onclick="ui._getPage('profile').submitVerification(this)"><i class="fas fa-shield-halved"></i> Enviar a revisión</button>
      </div>`);
  }

  checkFile(input, kind) {
    const file = input.files?.[0];
    if (!file) return;
    if (!/^image\/(jpeg|png)$/.test(file.type)) {
      input.value = '';
      return this._ui.showToast('El archivo debe ser JPG o PNG.', 'error');
    }
    if (file.size > CHAMBAYA.LIMITS.IMAGE_MB * 1024 * 1024) {
      input.value = '';
      return this._ui.showToast(`La imagen supera ${CHAMBAYA.LIMITS.IMAGE_MB} MB.`, 'error');
    }
    this._ui.showToast(kind === 'doc' ? 'Documento listo para enviar.' : 'Selfie lista para enviar.', 'info', 1800);
  }

  async submitVerification(btn) {
    const err = document.getElementById('verError');
    const fail = msg => { if (err) { err.textContent = msg; err.style.display = 'block'; } this._ui.showToast(msg, 'error'); };
    const docFile = document.getElementById('verDocFile').files?.[0];
    const selfieFile = document.getElementById('verSelfieFile').files?.[0];
    const number = document.getElementById('verDocNumber').value.trim();
    if (!number) return fail('Escribe el número de tu documento.');
    if (!docFile || !selfieFile) return fail('Adjunta el documento y la foto de tu rostro.');

    this._setBusy(btn, true, 'Comprimiendo y enviando...');
    try {
      const [documentoUrl, selfieUrl] = await Promise.all([
        compressImage(docFile, 1100, .72),
        compressImage(selfieFile, 800, .72),
      ]);
      await this._app.verifications.request(this.uid, {
        nombre: this.user.name,
        oficio: this.worker?.trade || this.user.oficio || '',
        experiencia: this.worker?.experience || 0,
        tipoDocumento: document.getElementById('verDocType').value,
        numeroDocumento: number,
        documentoUrl,
        selfieUrl,
        certificados: document.getElementById('verCerts').value.trim(),
      });
      await this._app.notifyAdmins({
        title: 'Nueva verificación',
        desc: `${this.user.name} solicitó la insignia de verificado.`,
        icon: 'fa-id-card', color: '#B8914A', bg: 'rgba(184,145,74,.16)', link: 'admin-verify',
      });
      this._ui.closeModal();
      this._ui.showToast('Solicitud enviada. Tu estado ahora es "En revisión".', 'success', 5500);
      this._reload();
    } catch (e) {
      fail(e.message || 'No se pudo enviar la solicitud.');
    } finally {
      this._setBusy(btn, false);
    }
  }

  copyPublicLink() {
    this._ui.copyText(publicProfileUrl(this.uid));
  }

  shareWhatsApp() {
    const url = publicProfileUrl(this.uid);
    const text = `Mira mi perfil de ${this.worker?.trade || this.user.oficio || 'técnico'} en TuOficioCol: ${url}`;
    window.open(whatsappLink(this.worker?.whatsapp || this.user.telefono, text), '_blank');
  }
}
