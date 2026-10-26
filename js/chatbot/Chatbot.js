class Chatbot {
  constructor(app, ui) {
    this._app = app;
    this._ui = ui;
    this._history = [];
    this._user = null;
    this._cv = null;

    this._vocab = {
      buscar: 1, trabajador: 2, tecnico: 3, necesito: 4, quiero: 5, plomero: 6, plomeria: 7,
      electricista: 8, electricidad: 9, carpintero: 10, carpinteria: 11, pintor: 12, pintura: 13,
      precio: 14, cuanto: 15, tarifa: 16, costo: 17, cobran: 18, registro: 19, registrar: 20,
      cuenta: 21, verificar: 22, verificacion: 23, insignia: 24, confiable: 25, resena: 26,
      calificacion: 27, estrella: 28, reportar: 29, reporte: 30, ayuda: 31, como: 32,
      disponible: 33, horario: 34, agenda: 35, urgente: 36, emergencia: 37, contacto: 38,
      telefono: 39, whatsapp: 40, portafolio: 41, trabajos: 42, fotos: 43, perfil: 44,
      hola: 45, buenos: 46, gracias: 47, adios: 48, jardinero: 49, jardineria: 50,
      cerrajero: 51, cerrajeria: 52, zona: 53, barrio: 54, mapa: 55, solicitud: 57,
      cotizacion: 58, presupuesto: 59, hoja: 60, vida: 61, cv: 62, profesional: 63,
      informal: 64, experiencia: 65, postular: 66, recomendar: 67, sugerencia: 68,
      empleador: 69, chamba: 70, cercano: 71, cerca: 72, activo: 73, hv: 74,
    };

    this._intentExamples = {
      greeting: 'hola buenos dias como estas hey saludos buen dia hola que tal',
      search_worker: 'busco plomero necesito electricista quiero carpintero encontrar tecnico trabajador cerca zona barrio',
      price: 'cuanto cuesta precio tarifa costo cobran presupuesto cuanto vale',
      register: 'como me registro crear cuenta registrarme inscribir',
      verify: 'como verifico verificado insignia confiable badge documentos',
      review: 'como dejo resena calificacion estrellas opinion',
      report: 'reportar perfil falso denuncia fraude queja',
      help: 'ayuda no entiendo como funciona que puedo hacer guia',
      emergency: 'urgente emergencia ahora mismo inmediato rapido',
      schedule: 'disponible horario agenda cita libre dias',
      farewell: 'gracias adios hasta luego chao bye nos vemos',
      contact: 'telefono contacto whatsapp llamar numero correo',
      portfolio: 'portafolio trabajos fotos ejemplos imagenes',
      location: 'donde esta zona mapa ubicacion barrio localidad cerca',
      quote: 'solicitud cotizacion publicar pedir servicio contratar',
      cv: 'hoja de vida cv hv armar perfil profesional informal experiencia oficio',
      recommend: 'recomienda a que me postulo trabajos sugerencias chamba rentable zona activa',
    };

    this._intentVecs = {};
    Object.entries(this._intentExamples).forEach(([intent, ex]) => {
      this._intentVecs[intent] = this._embed(this._tokenize(ex));
    });
  }

  template() {
    return `
      <div class="chatbot-header">
        <div class="chatbot-avatar"><i class="fas fa-robot"></i></div>
        <div>
          <div class="chatbot-bot-name">TuOficioBot</div>
          <div class="chatbot-status"><span class="chatbot-status-dot"></span> HV, zona y recomendaciones</div>
        </div>
        <button type="button" onclick="ui.toggleChatbot()"
          style="margin-left:auto;background:rgba(255,255,255,.2);border:none;color:#fff;width:28px;height:28px;border-radius:8px;cursor:pointer">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="chatbot-messages" id="chatbotMessages"></div>
      <div class="chatbot-input-bar">
        <input type="text" class="chatbot-input" id="chatbotInput" placeholder="Escribe o pide armar tu HV..."
          onkeydown="if(event.key==='Enter') ui._chatbot._sendFromInput()">
        <button type="button" class="chatbot-send" onclick="ui._chatbot._sendFromInput()"><i class="fas fa-paper-plane"></i></button>
      </div>`;
  }

  init(user) {
    this._user = user;
    this._history = [];
    this._cv = null;
    const name = (user.name || 'amig@').split(' ')[0];
    const role = user.role === 'trabajador' || user.role === 'worker' ? 'trabajador'
      : user.role === 'admin' ? 'admin' : 'cliente';

    const welcome = {
      admin: `Hola ${name}. Puedo ayudarte con usuarios, reportes y zonas con más demanda.`,
      trabajador: `Hola ${name}. Armo tu hoja de vida (profesional o informal), te digo a qué postularte según tu barrio y te aviso de chambas cerca.`,
      cliente: `Hola ${name}. Busco técnicos activos cerca de tu zona, te recomiendo perfiles y puedes enviar una sugerencia de trabajo a quien elijas.`,
    }[role];

    const quick = {
      admin: ['Zonas con demanda', 'Cómo verificar', 'Ayuda'],
      trabajador: ['Armar HV profesional', 'Armar HV informal', 'A qué postularme'],
      cliente: ['Buscar plomero cerca', 'Publicar solicitud', 'Zona más activa'],
    }[role];

    const msgs = document.getElementById('chatbotMessages');
    if (!msgs) return;
    msgs.innerHTML = `
      <div class="bot-msg"><div class="bot-bubble">${welcome}</div></div>
      <div class="bot-msg"><div class="chatbot-quick-replies">${quick.map(r =>
        `<div class="quick-reply" onclick="ui._chatbot.send('${r}')">${r}</div>`).join('')}</div></div>`;
  }

  focus() { document.getElementById('chatbotInput')?.focus(); }

  _sendFromInput() {
    const input = document.getElementById('chatbotInput');
    const text = input?.value.trim();
    if (!text) return;
    input.value = '';
    this.send(text);
  }

  async send(text) {
    const msgs = document.getElementById('chatbotMessages');
    if (!msgs) return;
    msgs.innerHTML += `<div class="user-msg"><div class="user-bubble">${escapeHtml(text)}</div></div>`;
    const tid = 'typing_' + Date.now();
    msgs.innerHTML += `<div class="bot-msg" id="${tid}"><div class="typing-indicator"><span></span><span></span><span></span></div></div>`;
    msgs.scrollTop = msgs.scrollHeight;
    const response = await this._generate(text);
    document.getElementById(tid)?.remove();
    msgs.innerHTML += `<div class="bot-msg"><div class="bot-bubble">${response}</div></div>`;
    msgs.scrollTop = msgs.scrollHeight;
  }

  _tokenize(text) {
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
      .filter(t => t.length > 1 && !['de', 'la', 'el', 'en', 'un', 'es', 'se', 'que', 'lo', 'al', 'del', 'me', 'mi'].includes(t));
  }

  _embed(tokens) {
    const vec = new Float32Array(64);
    tokens.forEach((t, pos) => {
      const base = this._vocab[t] || (this._charHash(t) % 30) + 30;
      const weight = 1 / (pos * 0.3 + 1);
      vec[base % 64] += weight;
      vec[(base * 3) % 64] += weight * 0.5;
    });
    return vec;
  }

  _charHash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xFFFFFFFF;
    return Math.abs(h);
  }

  _cosineSim(a, b) {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
  }

  _classify(text) {
    const tokens = this._tokenize(text);
    const vec = this._embed(tokens);
    let best = { intent: 'help', score: 0 };
    Object.entries(this._intentVecs).forEach(([intent, iv]) => {
      const score = this._cosineSim(vec, iv);
      if (score > best.score) best = { intent, score };
    });
    return { ...best, tokens };
  }

  _extractEntities(tokens) {
    const entities = {};
    const trades = {
      plomero: 'Plomería', plomeria: 'Plomería', electricista: 'Electricidad', electricidad: 'Electricidad',
      carpintero: 'Carpintería', carpinteria: 'Carpintería', pintor: 'Pintura', pintura: 'Pintura',
      jardinero: 'Jardinería', jardineria: 'Jardinería', cerrajero: 'Cerrajería', cerrajeria: 'Cerrajería',
    };
    tokens.forEach(t => {
      if (trades[t]) entities.trade = trades[t];
      const z = CHAMBAYA.ZONES.find(x => x.id === t || x.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === t);
      if (z) entities.zone = z.name;
    });
    const prev = this._history[this._history.length - 1];
    if (prev?.entities) {
      if (!entities.trade && prev.entities.trade) entities.trade = prev.entities.trade;
      if (!entities.zone && prev.entities.zone) entities.zone = prev.entities.zone;
    }
    return entities;
  }

  async _cvStep(text) {
    const raw = text.trim();
    const low = raw.toLowerCase();
    if (!this._cv) {
      const profesional = /profesional|formal|titulo|certificado/.test(low);
      const informal = /informal|oficio|empiric|sin titulo/.test(low);
      this._cv = { step: 'oficio', tipo: profesional ? 'profesional' : informal ? 'informal' : null };
      if (!this._cv.tipo) {
        return '¿Tu hoja de vida es <b>profesional</b> (títulos, certificados) o <b>informal</b> (experiencia de oficio)?';
      }
    }
    if (!this._cv.tipo) {
      this._cv.tipo = /profesional|formal/.test(low) ? 'profesional' : 'informal';
      this._cv.step = 'oficio';
      return `Perfecto, HV ${this._cv.tipo}. ¿Cuál es tu oficio? (${CHAMBAYA.TRADES.slice(0, 6).join(', ')}…)`;
    }
    if (this._cv.step === 'oficio') {
      const match = CHAMBAYA.TRADES.find(t => t.toLowerCase() === low || low.includes(t.toLowerCase().slice(0, 6)));
      this._cv.oficio = match || raw;
      this._cv.step = 'exp';
      return '¿Cuántos años de experiencia tienes? (un número)';
    }
    if (this._cv.step === 'exp') {
      this._cv.experiencia = parseInt(raw, 10) || 0;
      this._cv.step = 'zona';
      return `¿En qué localidad trabajas? Ej: ${CHAMBAYA.ZONES.slice(0, 4).map(z => z.name).join(', ')}.`;
    }
    if (this._cv.step === 'zona') {
      const z = CHAMBAYA.ZONES.find(x => x.name.toLowerCase() === low || low.includes(x.name.toLowerCase()));
      this._cv.zona = z?.name || raw;
      this._cv.step = 'skills';
      return this._cv.tipo === 'profesional'
        ? 'Lista tus certificados o estudios (separados por coma).'
        : 'Lista tus habilidades prácticas (separadas por coma). Ej: destapes, instalaciones, urgencias.';
    }
    if (this._cv.step === 'skills') {
      this._cv.habilidades = raw.split(',').map(s => s.trim()).filter(Boolean);
      this._cv.step = 'desc';
      return 'En 2–4 frases, descríbete para los empleadores de tu barrio.';
    }
    this._cv.descripcion = raw;
    this._cv.disponibilidad = 'Disponible';
    try {
      await this._app.workers.saveCv(this._user.uid, this._cv);
      const saved = this._cv;
      this._cv = null;
      return `Listo. Guardé tu HV <b>${saved.tipo}</b> de <b>${escapeHtml(saved.oficio)}</b> en <b>${escapeHtml(saved.zona)}</b>. Los empleadores cercanos ya pueden encontrarte. Activa “Disponible” si quieres aparecer primero.`;
    } catch (e) {
      this._cv = null;
      return `No pude guardar en Firestore: ${escapeHtml(e.message)}`;
    }
  }

  async _recommendJobs() {
    const quotes = await this._app.quotes.getActive();
    const workers = await this._app.workers.getAll();
    const me = workers.find(w => w.id === this._user.uid) || {
      trade: this._user.oficio, zone: this._user.zone,
    };
    const rec = this._app.workers.recommendJobsForWorker(quotes, me);
    const dens = this._app.zones.density(workers);
    const hot = dens[0];
    if (!rec.length) {
      return `Aún no hay solicitudes abiertas cerca de <b>${escapeHtml(me.zone || 'tu zona')}</b>. La localidad más activa ahora es <b>${escapeHtml(hot?.name || '—')}</b> (${hot?.available || 0} técnicos disponibles). Completa tu HV para que te encuentren.`;
    }
    return `Según tu oficio y barrio te conviene postularte a:<br>${rec.slice(0, 5).map(q =>
      `• <b>${escapeHtml(q.service || q.categoria)}</b> — ${escapeHtml(q.address || q.zona || '')} · $${formatCop(q.budget)}`
    ).join('<br>')}<br><br>Zona con más movimiento: <b>${escapeHtml(hot.name)}</b>.`;
  }

  async _recommendWorkers(entities) {
    const workers = await this._app.workers.getAll();
    const zone = entities.zone || this._user.zone || 'Chapinero';
    const rec = this._app.workers.recommendForEmployer(workers, { zone, trade: entities.trade });
    if (!rec.length) {
      return `No hay técnicos activos ahora en <b>${escapeHtml(zone)}</b>${entities.trade ? ' de ' + entities.trade : ''}. Publica una solicitud o amplía la zona en el mapa.`;
    }
    return `Técnicos activos cerca de <b>${escapeHtml(zone)}</b>:<br>${rec.slice(0, 5).map(w =>
      `• <b>${escapeHtml(w.name)}</b> — ${escapeHtml(w.trade)} · ${escapeHtml(w.zone)} · ${w.distanceKm != null && w.distanceKm < 90 ? w.distanceKm.toFixed(1) + ' km' : 'zona'} · ${escapeHtml(w.availability)}`
    ).join('<br>')}<br><br>Ábrelos en el Directorio y usa <b>Enviar chamba</b> para sugerirles el trabajo.`;
  }

  async _generate(text) {
    await new Promise(r => setTimeout(r, 280));
    const low = text.toLowerCase();
    if (this._cv || /hoja de vida|armar hv|hv profesional|hv informal|cv profesional|cv informal/.test(low)) {
      return this._cvStep(text);
    }

    const { intent, score, tokens } = this._classify(text);
    const entities = this._extractEntities(tokens);
    const name = (this._user?.name || '').split(' ')[0] || 'amig@';
    const role = this._user?.role === 'trabajador' || this._user?.role === 'worker' ? 'trabajador'
      : this._user?.role === 'admin' ? 'admin' : 'cliente';

    this._history.push({ text, intent, entities, ts: Date.now() });
    if (this._history.length > 12) this._history.shift();

    if (score < 0.035) {
      return `No te seguí del todo, ${escapeHtml(name)}. Puedo armar tu HV, buscar técnicos cerca o recomendar chambas por zona.`;
    }

    if (intent === 'cv') return this._cvStep(text);
    if (intent === 'recommend' && role === 'trabajador') return this._recommendJobs();
    if ((intent === 'search_worker' || intent === 'recommend') && role === 'cliente') {
      return this._recommendWorkers(entities);
    }

    const responses = {
      greeting: `Hola ${escapeHtml(name)}. ¿HV, búsqueda por barrio o una sugerencia de trabajo?`,
      search_worker: entities.trade
        ? `Para <b>${escapeHtml(entities.trade)}</b>${entities.zone ? ' en ' + escapeHtml(entities.zone) : ''}: usa el Directorio o el mapa. Los pines verdes son técnicos disponibles.`
        : 'Dime el oficio y el barrio (ej. plomero en Kennedy).',
      price: 'La visita diagnóstica suele ir de $30.000 a $90.000 COP según oficio. El precio final se acuerda con el técnico.',
      register: 'Ya estás dentro. Completa zona y oficio en Mi perfil.',
      verify: role === 'trabajador'
        ? 'Pide verificación al admin desde tu perfil. La insignia sube tu visibilidad en la zona.'
        : 'Prioriza técnicos con insignia verificada en el directorio.',
      review: 'Abre el perfil del técnico → Reseña → 1 a 5 estrellas.',
      report: 'En el perfil del técnico usa Reportar. Moderación lo revisa.',
      help: role === 'trabajador'
        ? '1) Arma HV conmigo 2) Disponibilidad 3) Mira ofertas cerca 4) Responde mensajes.'
        : '1) Directorio por zona 2) Mapa 3) Publica solicitud 4) Envía chamba a un técnico que elijas.',
      emergency: 'Filtra “Disponible ahora” en el directorio o publica una solicitud urgente en tu barrio.',
      schedule: role === 'trabajador'
        ? 'Cambia tu estado en Disponibilidad: Disponible, Ocupado o Medio tiempo.'
        : 'El punto verde en el perfil significa que puede atender hoy.',
      farewell: `Hasta luego ${escapeHtml(name)}.`,
      contact: 'Usa el chat interno: queda registro. Evita pagar por adelantado fuera de la plataforma.',
      portfolio: role === 'trabajador'
        ? 'Agrega trabajos reales en Portafolio. Eso convence en tu zona.'
        : 'El portafolio está en cada perfil del directorio.',
      location: 'El mapa ordena localidades por técnicos activos. La búsqueda es por barrio, no por toda la ciudad.',
      quote: 'Empleador: Publicar solicitud. Luego puedes enviar sugerencia a técnicos que tú elijas.',
    };

    const r = responses[intent];
    return r || responses.help;
  }
}
