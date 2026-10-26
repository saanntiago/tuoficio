/**
 * Disponibilidad del trabajador (RF08 / HU-08).
 * El cambio de estado es inmediato y afecta el directorio, el mapa y las
 * recomendaciones que reciben los clientes.
 */
class AvailabilityPage extends BasePage {
  constructor(app, ui) {
    super(app, ui);
    this.worker = null;
  }

  async render(container) {
    if (!this.isWorker) {
      container.innerHTML = this._empty('fa-lock', 'Sección para trabajadores', 'Solo los técnicos pueden configurar su disponibilidad.');
      return;
    }
    container.innerHTML = '<div class="page-loading"><span class="spinner dark"></span></div>';
    this.worker = await this._app.workers.getById(this.uid);
    if (!this._alive) return;
    const w = this.worker || {};
    const current = w.availability || 'Ocupado';
    const schedule = w.schedule || { dias: [], inicio: '', fin: '' };

    container.innerHTML = `
      ${this._header('Mi disponibilidad', 'Indica a los clientes si puedes recibir trabajos ahora. Puedes cambiarlo en cualquier momento.',
        `<button class="btn btn-secondary" onclick="ui.navigateTo('profile')"><i class="fas fa-clock"></i> Editar horario</button>`)}
      <div class="availability-hero ${availabilityClass(current)}">
        <div class="availability-pulse"><span class="avail-dot ${availabilityClass(current)}"></span></div>
        <div>
          <div class="availability-kicker">Estado actual</div>
          <h2>${escapeHtml(current)}</h2>
          <p>${current === 'Disponible'
            ? 'Apareces primero en las búsquedas y puedes recibir solicitudes en el mismo día.'
            : current === 'Medio tiempo'
              ? 'Apareces en las búsquedas con disponibilidad parcial. Los clientes sabrán que atiendes por franjas.'
              : 'No apareces como disponible. Los clientes aún pueden encontrar tu perfil, pero priorizarán a otros técnicos.'}</p>
        </div>
        <div class="availability-refresh"><i class="fas fa-rotate"></i> Se actualiza al instante</div>
      </div>
      <div class="availability-grid">
        ${CHAMBAYA.AVAILABILITY.map(a => `
          <button class="availability-card ${current === a ? 'active' : ''}" onclick="ui._getPage('availability').setStatus('${a}')">
            <div class="availability-card-icon ${availabilityClass(a)}"><span class="avail-dot ${availabilityClass(a)}"></span></div>
            <div>
              <h3>${a}</h3>
              <p>${a === 'Disponible'
                ? 'Puedo empezar un trabajo hoy o mañana.'
                : a === 'Medio tiempo'
                  ? 'Atiendo solo algunas franjas de la semana.'
                  : 'Estoy con trabajos y no puedo tomar más por ahora.'}</p>
            </div>
            <span class="availability-check">${current === a ? '<i class="fas fa-circle-check"></i> Seleccionado' : 'Elegir'}</span>
          </button>`).join('')}
      </div>
      <div class="content-grid">
        ${this._section('Horario de atención', `
          <div class="week-schedule">
            ${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => `
              <div class="week-day ${(schedule.dias || []).includes(d) ? 'on' : ''}">
                <span>${d}</span>
                <strong>${(schedule.dias || []).includes(d) ? `${escapeHtml(schedule.inicio || '')}–${escapeHtml(schedule.fin || '')}` : '—'}</strong>
              </div>`).join('')}
          </div>
          <p class="muted small">El horario se muestra en tu perfil público. Los clientes pueden enviarte solicitudes fuera de él, pero verán tus franjas de atención.</p>`,
          '<button class="card-action" onclick="ui.navigateTo(\'profile\')">Editar</button>')}
        ${this._section('Cómo te afecta el estado', `
          <div class="status-impact">
            <div class="impact-row"><span class="impact-dot green"></span><div><strong>Disponible</strong><p>Prioridad en resultados y en recomendaciones por zona.</p></div></div>
            <div class="impact-row"><span class="impact-dot amber"></span><div><strong>Medio tiempo</strong><p>Visible, con la etiqueta de disponibilidad parcial.</p></div></div>
            <div class="impact-row"><span class="impact-dot red"></span><div><strong>Ocupado</strong><p>Visible en el directorio, pero por debajo de los disponibles.</p></div></div>
          </div>
          <div class="notice notice-info" style="margin-top:14px"><i class="fas fa-circle-info"></i><div>Tu estado no reemplaza la verificación del perfil. Ambos factores mejoran tu posición en las búsquedas.</div></div>`)}
      </div>`;
  }

  async setStatus(status) {
    try {
      await this._app.workers.setAvailability(this.uid, status);
      this._ui.showToast(`Ahora estás ${status.toLowerCase()}.`, 'success');
      this._reload();
    } catch (e) {
      this._ui.showToast(e.message, 'error');
    }
  }
}
