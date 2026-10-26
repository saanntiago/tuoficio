/**
 * Datos de demostración de TuOficioCol.
 *
 * Se usan únicamente cuando Firestore no está disponible (modo local), de modo
 * que la plataforma pueda evaluarse sin publicar reglas ni sembrar la base.
 * Si Firestore responde, la aplicación usa siempre la base real.
 */
const TuOficioSeed = (() => {
  const workers = [
    {
      id: 'w-carlos', nombre: 'Carlos Ramírez', oficio: 'Electricidad', experiencia: 8,
      descripcion: 'Instalaciones eléctricas residenciales, tableros, cortos y mantenimiento preventivo. Trabajo con materiales certificados y entrego garantía escrita.',
      zona: 'Chapinero', zonasCobertura: ['Chapinero', 'Teusaquillo', 'Barrios Unidos', 'Kennedy'],
      lat: 4.6486, lng: -74.0628, disponibilidad: 'Disponible',
      horario: { dias: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'], inicio: '07:00', fin: '18:00' },
      tarifas: { visitaDiagnostica: 45000, horaBase: 60000, nota: 'Materiales aparte. Visita descontable si acepta el trabajo.' },
      telefono: '3105550101', whatsapp: '3105550101', contactoVisible: true,
      calificacionPromedio: 4.7, totalResenas: 3, badgeVerified: true, verificacionEstado: 'aprobado',
      habilidades: ['Tableros eléctricos', 'Puntos y tomacorrientes', 'Iluminación LED', 'Detección de fugas'],
      tipoHojaVida: 'profesional', vistas: 412, activo: true,
      portafolio: [
        { id: 'p1', titulo: 'Cambio de tablero en apartamento', descripcion: 'Se reemplazó el tablero antiguo por uno con breaker diferencial.', antes: placeholderImage('Antes', '#6E6B64'), despues: placeholderImage('Después', '#4E7A5C'), fecha: '2026-09-18' },
        { id: 'p2', titulo: 'Iluminación de cocina', descripcion: 'Instalación de 6 luces LED y dos circuitos independientes.', antes: placeholderImage('Antes', '#6E6B64'), despues: placeholderImage('Después', '#33503E'), fecha: '2026-08-02' },
      ],
    },
    {
      id: 'w-marta', nombre: 'Marta Gutiérrez', oficio: 'Pintura', experiencia: 6,
      descripcion: 'Pintura de interiores y acabados decorativos. Manejo de vinilos, esmaltes y estuco. Protejo muebles y pisos durante el trabajo.',
      zona: 'Suba', zonasCobertura: ['Suba', 'Usaquén'],
      lat: 4.7411, lng: -74.0839, disponibilidad: 'Disponible',
      horario: { dias: ['Lun', 'Mié', 'Vie', 'Sáb'], inicio: '08:00', fin: '17:00' },
      tarifas: { visitaDiagnostica: 35000, horaBase: 45000, nota: '' },
      telefono: '3105550102', whatsapp: '3105550102', contactoVisible: true,
      calificacionPromedio: 5, totalResenas: 1, badgeVerified: true, verificacionEstado: 'aprobado',
      habilidades: ['Pintura interior', 'Estuco y masilla', 'Acabados decorativos'],
      tipoHojaVida: 'profesional', vistas: 287, activo: true,
      portafolio: [
        { id: 'p1', titulo: 'Sala en tonos cálidos', descripcion: 'Preparación de muros y dos manos de vinilo.', antes: placeholderImage('Antes', '#8C8C88'), despues: placeholderImage('Después', '#A89878'), fecha: '2026-07-21' },
      ],
    },
    {
      id: 'w-julian', nombre: 'Julián Gómez', oficio: 'Carpintería', experiencia: 12,
      descripcion: 'Muebles a medida, closets, puertas y reparación de madera. Diseño según medidas del espacio, sin intermediarios.',
      zona: 'Teusaquillo', zonasCobertura: ['Teusaquillo', 'Chapinero', 'Puente Aranda'],
      lat: 4.6400, lng: -74.0900, disponibilidad: 'Medio tiempo',
      horario: { dias: ['Mar', 'Jue', 'Sáb'], inicio: '09:00', fin: '16:00' },
      tarifas: { visitaDiagnostica: 65000, horaBase: 55000, nota: 'Cotizo el mueble completo tras tomar medidas.' },
      telefono: '3105550103', whatsapp: '3105550103', contactoVisible: true,
      calificacionPromedio: 5, totalResenas: 1, badgeVerified: false, verificacionEstado: 'en_revision',
      habilidades: ['Closets', 'Puertas', 'Muebles a medida', 'Reparaciones'],
      tipoHojaVida: 'profesional', vistas: 198, activo: true,
      portafolio: [
        { id: 'p1', titulo: 'Closet empotrado', descripcion: 'Closet de 2,4 m con puertas corredizas.', antes: placeholderImage('Antes', '#6E6B64'), despues: placeholderImage('Después', '#4E7A5C'), fecha: '2026-06-11' },
      ],
    },
    {
      id: 'w-daniela', nombre: 'Daniela Pérez', oficio: 'Limpieza', experiencia: 5,
      descripcion: 'Limpieza profunda de apartamentos y oficinas. Incluyo productos y equipos. Servicio por horas o por jornada.',
      zona: 'Usaquén', zonasCobertura: ['Usaquén', 'Suba'],
      lat: 4.7485, lng: -74.0308, disponibilidad: 'Disponible',
      horario: { dias: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'], inicio: '08:00', fin: '18:00' },
      tarifas: { visitaDiagnostica: 30000, horaBase: 28000, nota: 'Mínimo 3 horas por servicio.' },
      telefono: '3105550104', whatsapp: '3105550104', contactoVisible: true,
      calificacionPromedio: 4.5, totalResenas: 2, badgeVerified: true, verificacionEstado: 'aprobado',
      habilidades: ['Limpieza profunda', 'Oficinas', 'Tapicería', 'Desinfección'],
      tipoHojaVida: 'informal', vistas: 356, activo: true,
      portafolio: [],
    },
    {
      id: 'w-andres', nombre: 'Andrés Molina', oficio: 'Plomería', experiencia: 10,
      descripcion: 'Fugas, destapes, cambio de tubería y grifería. Atiendo emergencias en el mismo día dentro de mi zona de cobertura.',
      zona: 'Kennedy', zonasCobertura: ['Kennedy', 'Bosa', 'Fontibón'],
      lat: 4.6268, lng: -74.1537, disponibilidad: 'Disponible',
      horario: { dias: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'], inicio: '06:00', fin: '20:00' },
      tarifas: { visitaDiagnostica: 40000, horaBase: 50000, nota: 'Emergencias nocturnas tienen recargo del 30%.' },
      telefono: '3105550105', whatsapp: '3105550105', contactoVisible: true,
      calificacionPromedio: 5, totalResenas: 2, badgeVerified: true, verificacionEstado: 'aprobado',
      habilidades: ['Destapes', 'Fugas', 'Grifería', 'Tubería PVC'],
      tipoHojaVida: 'profesional', vistas: 240, activo: true,
      portafolio: [
        { id: 'p1', titulo: 'Reparación de fuga en baño', descripcion: 'Se cambió el sifón y se selló la conexión.', antes: placeholderImage('Antes', '#8F6A6A'), despues: placeholderImage('Después', '#4E7A5C'), fecha: '2026-09-30' },
      ],
    },
    {
      id: 'w-lucia', nombre: 'Lucía Torres', oficio: 'Costura', experiencia: 15,
      descripcion: 'Arreglos de ropa, confección a medida y bordados. Trabajo desde taller propio con entrega en 48 horas.',
      zona: 'Barrios Unidos', zonasCobertura: ['Barrios Unidos', 'Teusaquillo'],
      lat: 4.6690, lng: -74.0730, disponibilidad: 'Disponible',
      horario: { dias: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'], inicio: '09:00', fin: '18:00' },
      tarifas: { visitaDiagnostica: 0, horaBase: 25000, nota: 'No cobro visita: la prenda se lleva al taller.' },
      telefono: '3105550106', whatsapp: '3105550106', contactoVisible: false,
      calificacionPromedio: 5, totalResenas: 1, badgeVerified: false, verificacionEstado: 'sin_solicitar',
      habilidades: ['Arreglos', 'Confección', 'Bordado'],
      tipoHojaVida: 'informal', vistas: 121, activo: true,
      portafolio: [],
    },
    {
      id: 'w-felipe', nombre: 'Felipe Rojas', oficio: 'Cerrajería', experiencia: 7,
      descripcion: 'Apertura de puertas sin daño, cambio de guardas y cerraduras de seguridad. Atención 24 horas.',
      zona: 'Engativá', zonasCobertura: ['Engativá', 'Fontibón', 'Suba'],
      lat: 4.7015, lng: -74.1090, disponibilidad: 'Ocupado',
      horario: { dias: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'], inicio: '00:00', fin: '23:59' },
      tarifas: { visitaDiagnostica: 50000, horaBase: 70000, nota: 'Servicio 24/7.' },
      telefono: '3105550107', whatsapp: '3105550107', contactoVisible: true,
      calificacionPromedio: 4, totalResenas: 1, badgeVerified: true, verificacionEstado: 'aprobado',
      habilidades: ['Apertura de puertas', 'Cerraduras', 'Guardas'],
      tipoHojaVida: 'profesional', vistas: 176, activo: true,
      portafolio: [],
    },
    {
      id: 'w-sofia', nombre: 'Sofía Cárdenas', oficio: 'Jardinería', experiencia: 4,
      descripcion: 'Diseño y mantenimiento de jardines, poda de árboles pequeños y huertas urbanas en terrazas.',
      zona: 'Fontibón', zonasCobertura: ['Fontibón', 'Engativá'],
      lat: 4.6780, lng: -74.1410, disponibilidad: 'Medio tiempo',
      horario: { dias: ['Mié', 'Sáb', 'Dom'], inicio: '08:00', fin: '15:00' },
      tarifas: { visitaDiagnostica: 30000, horaBase: 35000, nota: '' },
      telefono: '3105550108', whatsapp: '3105550108', contactoVisible: true,
      calificacionPromedio: 5, totalResenas: 1, badgeVerified: false, verificacionEstado: 'sin_solicitar',
      habilidades: ['Jardines', 'Poda', 'Huertas urbanas'],
      tipoHojaVida: 'informal', vistas: 88, activo: true,
      portafolio: [],
    },
    {
      id: 'w-oscar', nombre: 'Óscar Beltrán', oficio: 'Albañilería', experiencia: 20,
      descripcion: 'Obras menores, pañetes, enchapes y adecuaciones de baños y cocinas. Presupuesto por m2.',
      zona: 'Bosa', zonasCobertura: ['Bosa', 'Kennedy', 'Ciudad Bolívar'],
      lat: 4.6180, lng: -74.1900, disponibilidad: 'Disponible',
      horario: { dias: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'], inicio: '07:00', fin: '17:00' },
      tarifas: { visitaDiagnostica: 25000, horaBase: 40000, nota: 'Presupuesto sin costo si la obra supera 5 m2.' },
      telefono: '3105550109', whatsapp: '3105550109', contactoVisible: true,
      calificacionPromedio: 4, totalResenas: 1, badgeVerified: true, verificacionEstado: 'aprobado',
      habilidades: ['Enchapes', 'Pañetes', 'Baños', 'Cocinas'],
      tipoHojaVida: 'profesional', vistas: 205, activo: true,
      portafolio: [],
    },
    {
      id: 'w-camilo', nombre: 'Camilo Restrepo', oficio: 'Aire acondicionado', experiencia: 9,
      descripcion: 'Instalación y mantenimiento de aires acondicionados tipo split. Certificado en manejo de refrigerantes.',
      zona: 'Puente Aranda', zonasCobertura: ['Puente Aranda', 'Teusaquillo', 'Kennedy'],
      lat: 4.6120, lng: -74.1170, disponibilidad: 'Disponible',
      horario: { dias: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'], inicio: '08:00', fin: '18:00' },
      tarifas: { visitaDiagnostica: 60000, horaBase: 80000, nota: '' },
      telefono: '3105550110', whatsapp: '3105550110', contactoVisible: true,
      calificacionPromedio: 5, totalResenas: 1, badgeVerified: true, verificacionEstado: 'aprobado',
      habilidades: ['Instalación split', 'Mantenimiento', 'Refrigerantes'],
      tipoHojaVida: 'profesional', vistas: 143, activo: true,
      portafolio: [],
    },
  ];

  const users = [
    ...workers.map((w, i) => ({
      id: w.id, uid: w.id, nombre: w.nombre, email: `${w.id.replace('w-', '')}@demo.tuoficio.co`,
      telefono: w.telefono, documento: `10${2000000 + i}`, rol: 'trabajador', zona: w.zona, oficio: w.oficio,
      avatarColor: ['#3A3A38', '#6B5E45', '#6B736C', '#5A5A56'][i % 4],
      verificado: w.badgeVerified, activo: true, fechaRegistro: '2026-06-15T10:00:00.000Z',
      passHash: demoHash('demo1234'), demo: true,
    })),
    {
      id: 'c-ana', uid: 'c-ana', nombre: 'Ana Rodríguez', email: 'ana@demo.tuoficio.co', telefono: '3204440202',
      rol: 'cliente', zona: 'Chapinero', oficio: '', avatarColor: '#4E7A5C', verificado: true, activo: true,
      fechaRegistro: '2026-07-02T10:00:00.000Z', passHash: demoHash('demo1234'), demo: true,
      preferencias: { contactoVisible: true, notificaciones: true },
    },
    {
      id: 'c-jorge', uid: 'c-jorge', nombre: 'Jorge Salinas', email: 'jorge@demo.tuoficio.co', telefono: '3204440203',
      rol: 'cliente', zona: 'Kennedy', oficio: '', avatarColor: '#8C8C88', verificado: true, activo: true,
      fechaRegistro: '2026-07-19T10:00:00.000Z', passHash: demoHash('demo1234'), demo: true,
    },
    {
      id: 'c-paula', uid: 'c-paula', nombre: 'Paula Méndez', email: 'paula@demo.tuoficio.co', telefono: '3204440204',
      rol: 'cliente', zona: 'Suba', oficio: '', avatarColor: '#A89878', verificado: true, activo: true,
      fechaRegistro: '2026-08-05T10:00:00.000Z', passHash: demoHash('demo1234'), demo: true,
    },
    {
      id: 'u-suspendido', uid: 'u-suspendido', nombre: 'Perfil Reportado', email: 'reportado@demo.tuoficio.co',
      rol: 'trabajador', zona: 'Bosa', oficio: 'Pintura', avatarColor: '#8F6A6A', verificado: false, activo: false,
      fechaRegistro: '2026-08-21T10:00:00.000Z', passHash: demoHash('demo1234'), demo: true,
    },
  ];

  const reviews = [
    { id: 'r1', trabajadorId: 'w-carlos', clienteId: 'c-ana', clientName: 'Ana Rodríguez', clientColor: '#4E7A5C', rating: 5, text: 'Llegó puntual, explicó el problema y dejó todo funcionando. Muy recomendado.', date: '2026-09-20' },
    { id: 'r2', trabajadorId: 'w-carlos', clienteId: 'c-jorge', clientName: 'Jorge Salinas', clientColor: '#8C8C88', rating: 5, text: 'Cambió el tablero y dejó certificado el trabajo. Excelente.', date: '2026-08-14' },
    { id: 'r3', trabajadorId: 'w-carlos', clienteId: 'c-paula', clientName: 'Paula Méndez', clientColor: '#A89878', rating: 4, text: 'Buen trabajo, aunque se demoró un poco en llegar.', date: '2026-07-30' },
    { id: 'r4', trabajadorId: 'w-marta', clienteId: 'c-paula', clientName: 'Paula Méndez', clientColor: '#A89878', rating: 5, text: 'La sala quedó impecable y protegió todos los muebles.', date: '2026-09-02' },
    { id: 'r5', trabajadorId: 'w-andres', clienteId: 'c-jorge', clientName: 'Jorge Salinas', clientColor: '#8C8C88', rating: 5, text: 'Resolvió una fuga que otros dos técnicos no encontraron.', date: '2026-09-11' },
    { id: 'r6', trabajadorId: 'w-daniela', clienteId: 'c-ana', clientName: 'Ana Rodríguez', clientColor: '#4E7A5C', rating: 5, text: 'Muy organizada y detallada con la limpieza profunda.', date: '2026-06-25' },
    { id: 'r7', trabajadorId: 'w-lucia', clienteId: 'c-ana', clientName: 'Ana Rodríguez', clientColor: '#4E7A5C', rating: 5, text: 'Arregló un vestido para una boda en dos días. Perfecto.', date: '2026-05-18' },
    { id: 'r8', trabajadorId: 'w-julian', clienteId: 'c-paula', clientName: 'Paula Méndez', clientColor: '#A89878', rating: 5, text: 'El closet quedó exactamente como lo diseñamos. Muy cuidadoso con las medidas.', date: '2026-09-28' },
    { id: 'r9', trabajadorId: 'w-felipe', clienteId: 'c-jorge', clientName: 'Jorge Salinas', clientColor: '#8C8C88', rating: 4, text: 'Abrió la puerta sin dañarla y cambi\u00f3 la guarda el mismo d\u00eda.', date: '2026-08-19' },
    { id: 'r10', trabajadorId: 'w-sofia', clienteId: 'c-paula', clientName: 'Paula Méndez', clientColor: '#A89878', rating: 5, text: 'Le dio vida al jard\u00edn de la terraza y dej\u00f3 todo limpio.', date: '2026-09-07' },
    { id: 'r11', trabajadorId: 'w-oscar', clienteId: 'c-jorge', clientName: 'Jorge Salinas', clientColor: '#8C8C88', rating: 4, text: 'Enchape del ba\u00f1o terminado a tiempo y con buen acabado.', date: '2026-07-12' },
    { id: 'r12', trabajadorId: 'w-camilo', clienteId: 'c-ana', clientName: 'Ana Rodr\u00edguez', clientColor: '#4E7A5C', rating: 5, text: 'Hizo el mantenimiento del aire y explic\u00f3 c\u00f3mo cuidarlo. Muy profesional.', date: '2026-09-15' },
    { id: 'r13', trabajadorId: 'w-daniela', clienteId: 'c-paula', clientName: 'Paula M\u00e9ndez', clientColor: '#A89878', rating: 4, text: 'Excelente limpieza de tapicer\u00eda; lleg\u00f3 un poco despu\u00e9s de la hora acordada.', date: '2026-08-22' },
    { id: 'r14', trabajadorId: 'w-andres', clienteId: 'c-ana', clientName: 'Ana Rodr\u00edguez', clientColor: '#4E7A5C', rating: 5, text: 'Cambi\u00f3 la grifer\u00eda y revis\u00f3 toda la conexi\u00f3n. Qued\u00f3 impecable.', date: '2026-07-08' },
  ];

  const quotes = [
    {
      id: 'q1', clientId: 'c-paula', clienteNombre: 'Paula Méndez', service: 'Plomería',
      description: 'Se filtra agua debajo del lavaplatos y la llave gotea constantemente. Necesito revisión y arreglo.',
      budget: 150000, address: 'Calle 100 #15-20, Chicó', zona: 'Chapinero', fecha: '2026-10-28', hora: '10:00',
      duracionEstimada: '2 horas', urgencia: 'Esta semana', status: 'Activa', ofertasCount: 0,
      createdAt: '2026-10-20T14:30:00.000Z',
    },
    {
      id: 'q2', clientId: 'c-jorge', clienteNombre: 'Jorge Salinas', service: 'Electricidad',
      description: 'Se va la luz en la cocina cuando conecto varios electrodomésticos. Requiero revisión del circuito.',
      budget: 120000, address: 'Carrera 78 #3-15, Castilla', zona: 'Kennedy', fecha: '2026-10-27', hora: '15:00',
      duracionEstimada: '1 hora', urgencia: 'Urgente', status: 'Activa', ofertasCount: 1,
      createdAt: '2026-10-22T09:10:00.000Z',
    },
    {
      id: 'q3', clientId: 'c-ana', clienteNombre: 'Ana Rodríguez', service: 'Pintura',
      description: 'Pintar habitación de 4x4 m, incluye cielo raso. Tengo la pintura comprada.',
      budget: 380000, address: 'Calle 45 #12-30, Chapinero Alto', zona: 'Chapinero', fecha: '2026-11-02', hora: '08:00',
      duracionEstimada: '2 días', urgencia: 'Flexible', status: 'Activa', ofertasCount: 0,
      createdAt: '2026-10-23T11:00:00.000Z',
    },
  ];

  const offers = [
    {
      id: 'o1', cotizacionId: 'q2', trabajadorId: 'w-carlos', trabajadorNombre: 'Carlos Ramírez',
      precio: 110000, tiempoEstimado: '1 hora', mensaje: 'Puedo ir el martes a las 3 p.m. Incluye revisión del breaker.',
      estado: 'Enviada', createdAt: '2026-10-22T10:00:00.000Z',
    },
  ];

  const jobs = [
    {
      id: 'j-activo', cotizacionId: 'q1', clientId: 'c-paula', clienteNombre: 'Paula Méndez',
      trabajadorId: 'w-andres', trabajadorNombre: 'Andrés Molina', service: 'Plomería',
      description: 'Revisión de fuga bajo lavaplatos y cambio de llave.', address: 'Calle 100 #15-20, Chicó',
      zona: 'Chapinero', presupuesto: 140000, fecha: '2026-10-25', hora: '10:00', estado: 'Activo',
      createdAt: '2026-10-24T16:00:00.000Z',
    },
    {
      id: 'j-hist', cotizacionId: null, clientId: 'c-ana', clienteNombre: 'Ana Rodríguez',
      trabajadorId: 'w-carlos', trabajadorNombre: 'Carlos Ramírez', service: 'Electricidad',
      description: 'Instalación de dos puntos de luz en la sala.', address: 'Calle 45 #12-30, Chapinero Alto',
      zona: 'Chapinero', presupuesto: 95000, fecha: '2026-10-24', hora: '09:00', estado: 'Finalizado',
      finalizadoEn: new Date(Date.now() - 5 * 3600000).toISOString(),
      createdAt: '2026-10-20T10:00:00.000Z',
    },
  ];

  const verifications = [
    {
      id: 'v1', trabajadorId: 'w-julian', nombre: 'Julián Gómez', oficio: 'Carpintería',
      tipoDocumento: 'Cédula de ciudadanía', numeroDocumento: '1020304050',
      documentoUrl: placeholderImage('Documento de identidad', '#6E6B64'),
      selfieUrl: placeholderImage('Foto del rostro', '#4E7A5C'),
      estado: 'Pendiente', observacion: '', createdAt: '2026-10-23T09:00:00.000Z',
      experiencia: 12, certificados: 'Certificado de la SENA en ebanistería (2019).',
    },
  ];

  const reports = [
    {
      id: 'rp1', reportanteId: 'c-ana', reportanteRol: 'cliente', reportanteNombre: 'Ana Rodríguez',
      reportadoId: 'u-suspendido', reportadoRol: 'trabajador', reportadoNombre: 'Perfil Reportado',
      trabajoId: null, motivo: 'Perfil falso o suplantación',
      detalle: 'El perfil usa fotos de otro técnico y pide anticipos por Nequi sin haber visto el trabajo.',
      estado: 'Pendiente', createdAt: '2026-10-24T08:30:00.000Z',
    },
  ];

  const notifications = [
    {
      id: 'n1', usuarioId: 'w-carlos', title: 'Nueva solicitud cerca', desc: 'Jorge Salinas busca electricista en Kennedy.',
      icon: 'fa-briefcase', color: '#3A3A38', bg: 'rgba(58,58,56,.1)', read: false,
      link: 'quotes', createdAt: '2026-10-22T09:11:00.000Z',
    },
    {
      id: 'n2', usuarioId: 'c-ana', title: 'Reseña publicada', desc: 'Tu reseña a Carlos Ramírez quedó visible en su perfil.',
      icon: 'fa-star', color: '#A89878', bg: 'rgba(168,152,120,.16)', read: true,
      link: 'jobs', createdAt: '2026-09-20T12:00:00.000Z',
    },
  ];

  return {
    usuarios: users,
    trabajadores: workers,
    resenas: reviews,
    cotizaciones: quotes,
    postulaciones: offers,
    trabajos: jobs,
    verificaciones: verifications,
    reportes: reports,
    notificaciones: notifications,
    favoritos: [{ id: 'c-ana', trabajadores: ['w-carlos', 'w-daniela'] }],
    conversaciones: [],
    mensajes: [],
    hojasDeVida: [],
    sugerencias: [],
  };
})();
