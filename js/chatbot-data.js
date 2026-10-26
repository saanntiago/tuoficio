window.ChatBotData = (function() {
    const intents = [
        {
            tag: 'saludo',
            patterns: ['hola', 'buenos días', 'buenas tardes', 'qué tal', 'hey', 'saludos', 'hola qué tal', 'buenas'],
            responses: [
                '¡Hola! 👋 Soy tu asistente de TuOficioCol. ¿En qué puedo ayudarte hoy?',
                '¡Hola {nombre}! Qué gusto saludarte. ¿Buscas un experto o quieres ofrecer tus servicios?',
                '¡Buenos días/tardes! 😊 Estoy aquí para ayudarte a encontrar al mejor técnico para tu hogar.'
            ],
            context: ''
        },
        {
            tag: 'despedida',
            patterns: ['adiós', 'hasta luego', 'chao', 'nos vemos', 'bye', 'hasta pronto', 'me voy'],
            responses: [
                '¡Hasta luego! Vuelve pronto a TuOficioCol. 👋',
                '¡Chao! Si necesitas otro profesional, ya sabes dónde encontrarnos.',
                '¡Nos vemos! Que tengas un excelente día. 😊'
            ]
        },
        {
            tag: 'agradecimiento',
            patterns: ['gracias', 'muchas gracias', 'te agradezco', 'excelente ayuda', 'mil gracias', 'muy amable'],
            responses: [
                '¡De nada! Es un placer ayudarte. 😊',
                '¡Con mucho gusto! ¿Hay algo más en lo que pueda apoyarte?',
                'Para eso estoy. ¡Que tu experiencia en TuOficioCol sea la mejor! 🚀'
            ]
        },
        {
            tag: 'buscar_plomero',
            patterns: ['necesito un plomero', 'busco plomero', 'tengo una fuga', 'problema con tubería', 'se rompió un tubo', 'agua goteando'],
            responses: [
                'Entiendo, necesitas un experto en plomería. 🔧 ¿Podrías decirme en qué zona o barrio te encuentras para buscar los más cercanos?',
                '¡Claro! Tenemos excelentes plomeros verificados. ¿Es una emergencia o puedes programar una visita?',
                'Una fuga puede ser molesta. Vamos a solucionarlo. ¿De qué ciudad o sector nos escribes?'
            ]
        },
        {
            tag: 'buscar_electricista',
            patterns: ['necesito electricista', 'problema eléctrico', 'se fue la luz', 'cortocircuito', 'instalar lámpara', 'enchufe dañado'],
            responses: [
                '¡Entendido! Un problema eléctrico requiere un profesional. ⚡ ¿Me indicas tu ubicación para mostrarte electricistas cercanos?',
                'La seguridad es primero. Te ayudaré a contactar un electricista certificado. ¿Es urgente el servicio?',
                'Con gusto te conecto con un electricista. ¿Podrías detallar un poco más el problema?'
            ]
        },
        {
            tag: 'buscar_carpintero',
            patterns: ['busco carpintero', 'necesito mueble', 'arreglar puerta', 'reparar madera', 'hacer un clóset', 'ebanista'],
            responses: [
                '¡Perfecto! Un buen carpintero puede hacer magia. 🪚 ¿Qué tipo de trabajo necesitas exactamente?',
                'Tenemos carpinteros con excelentes reseñas. ¿Para qué barrio o zona buscas el servicio?',
                'Claro que sí. Ya sea para reparar o crear un mueble nuevo, te encontraré al mejor. ¿Cuál es tu presupuesto aproximado?'
            ]
        },
        {
            tag: 'buscar_pintor',
            patterns: ['pintar casa', 'necesito pintor', 'pintura de interiores', 'pintar fachada', 'quitar humedad de pared'],
            responses: [
                'Renovar tus espacios siempre es buena idea. 🎨 ¿Cuántas habitaciones o metros cuadrados necesitas pintar?',
                'Te ayudaré a encontrar un excelente pintor. ¿Ya tienes los materiales o necesitas que los incluya en la cotización?',
                '¡Claro! Para mostrarte pintores disponibles, dime en qué zona te encuentras.'
            ]
        },
        {
            tag: 'buscar_albanil',
            patterns: ['obra', 'construcción', 'albañil', 'levantar pared', 'hacer piso', 'remodelación'],
            responses: [
                'Para trabajos de albañilería contamos con personal muy experimentado. 🧱 ¿De qué tamaño es la obra?',
                'Excelente. ¿Buscas un albañil para una reparación pequeña o una remodelación completa?',
                'Puedo conectarte con albañiles calificados. ¿En qué ciudad o barrio se realizará el trabajo?'
            ]
        },
        {
            tag: 'buscar_cerrajero',
            patterns: ['cerrajero', 'perdí llaves', 'cambiar cerradura', 'no puedo abrir puerta', 'quedé afuera'],
            responses: [
                '¡Entiendo la urgencia! 🔑 ¿En qué dirección te encuentras para enviar a alguien rápido?',
                'Un problema de cerrajería suele ser urgente. Buscaré a los más rápidos en tu zona. ¿Qué tipo de puerta es?',
                'Tranquilo, te ayudaremos a entrar. Por favor, compárteme tu ubicación.'
            ]
        },
        {
            tag: 'buscar_jardinero',
            patterns: ['jardín', 'podar', 'cortar césped', 'plantas', 'mantenimiento de jardín'],
            responses: [
                'Mantener el jardín hermoso es importante. 🌱 ¿Necesitas mantenimiento regular o es un trabajo de una sola vez?',
                'Te contactaré con nuestros mejores jardineros. ¿De qué tamaño aproximado es tu jardín?',
                '¡Perfecto! Un jardinero experto puede ayudarte. ¿En qué barrio vives?'
            ]
        },
        {
            tag: 'buscar_general',
            patterns: ['necesito un técnico', 'busco alguien que', 'quién puede ayudarme', 'necesito un profesional', 'ocupo un servicio'],
            responses: [
                '¡Estás en el lugar indicado! 🛠️ Cuéntame, ¿qué tipo de servicio o reparación necesitas exactamente?',
                'Claro que sí, en TuOficioCol tenemos muchos oficios. ¿Podrías ser más específico con el problema?',
                'Puedo ayudarte con eso. ¿Es un tema de plomería, electricidad, limpieza u otro?'
            ]
        },
        {
            tag: 'como_funciona',
            patterns: ['cómo funciona', 'cómo uso la plataforma', 'qué es TuOficioCol', 'para qué sirve', 'explícame la app'],
            responses: [
                'TuOficioCol te conecta con trabajadores locales de confianza. Puedes buscar perfiles, ver sus reseñas y contactarlos directamente o publicar tu requerimiento y recibir cotizaciones. 📱',
                'Es muy fácil: 1️⃣ Buscas el servicio que necesitas. 2️⃣ Revisas perfiles y calificaciones. 3️⃣ Contactas al trabajador y acuerdan el trabajo. ¡Todo seguro y rápido!',
                'Somos la plataforma líder para encontrar servicios técnicos. ¿Quieres registrarte como cliente o como trabajador?'
            ]
        },
        {
            tag: 'registrarse',
            patterns: ['cómo me registro', 'crear cuenta', 'quiero registrarme', 'abrir cuenta', 'inscribirme'],
            responses: [
                '¡Genial que quieras unirte! Puedes registrarte haciendo clic en "Iniciar Sesión" y luego en "Crear cuenta". ¿Serás cliente o trabajador? 👤',
                'El registro es totalmente gratis y rápido. Solo necesitas un correo electrónico y tu número de teléfono. ¿Te ayudo con los pasos?',
                'Para registrarte ve a la parte superior derecha de la pantalla. Selecciona tu rol (cliente o trabajador) y llena tus datos.'
            ]
        },
        {
            tag: 'publicar_cotizacion',
            patterns: ['cómo publico un trabajo', 'quiero publicar', 'necesito cotización', 'crear solicitud', 'pedir presupuesto'],
            responses: [
                'Publicar una solicitud es gratis. Ve al panel principal y haz clic en "Nueva Cotización", detalla lo que necesitas y los trabajadores te enviarán sus ofertas. 📝',
                '¡Claro! Puedo ayudarte a crear tu publicación ahora mismo si quieres. (Escribe "Iniciar solicitud" para comenzar el proceso guiado).',
                'Para recibir múltiples ofertas, publica tu requerimiento en la sección de Cotizaciones. Entre más detalles des, mejores ofertas recibirás.'
            ]
        },
        {
            tag: 'calificar',
            patterns: ['cómo califico', 'dejar reseña', 'calificar trabajador', 'dar estrellas', 'comentar servicio'],
            responses: [
                'Las reseñas ayudan a toda la comunidad. ⭐ Ve al perfil del trabajador que contrataste y haz clic en "Dejar Reseña".',
                'Puedes calificar de 1 a 5 estrellas y dejar un comentario detallado en la sección "Mis Trabajos Completados".',
                '¡Gracias por contribuir! Las calificaciones son esenciales. Solo ve a tu historial y selecciona el servicio para calificar.'
            ]
        },
        {
            tag: 'verificacion',
            patterns: ['cómo me verifico', 'perfil verificado', 'qué es la verificación', 'insignia de confianza', 'documentos'],
            responses: [
                'La verificación da más confianza. Los trabajadores deben subir su identificación y comprobante de domicilio en su panel de configuración. 🛡️',
                'Un perfil verificado (insignia azul) significa que hemos validado la identidad del usuario. ¿Deseas iniciar tu proceso de verificación?',
                'Para verificarte, ve a Mi Perfil -> Verificación. El proceso tarda unas 24-48 horas hábiles.'
            ]
        },
        {
            tag: 'precios',
            patterns: ['cuánto cobra', 'cuáles son los precios', 'tarifa', 'costo', 'es caro', 'cuánto vale'],
            responses: [
                'Los precios varían según el trabajador y el tipo de problema. Muchos ofrecen una visita diagnóstica (a veces gratuita) antes de dar el costo final. 💵',
                'En TuOficioCol tú negocias directamente con el trabajador. Te sugiero pedir presupuesto a 2 o 3 diferentes para comparar.',
                'Cada profesional tiene sus propias tarifas. Puedes ver sus precios base en sus perfiles.'
            ]
        },
        {
            tag: 'disponibilidad',
            patterns: ['está disponible', 'horario', 'cuándo puede venir', 'trabajan domingos', 'días festivos'],
            responses: [
                'La disponibilidad depende de cada profesional. Puedes filtrar tu búsqueda marcando la opción "Disponible ahora". 🕒',
                'Muchos de nuestros trabajadores atienden emergencias 24/7. ¿Para cuándo necesitas el servicio?',
                'Puedes ver el horario de atención en el perfil de cada trabajador.'
            ]
        },
        {
            tag: 'emergencia',
            patterns: ['urgente', 'emergencia', 'necesito ya', 'es urgente', 'rápido', 'auxilio'],
            responses: [
                '¡Entiendo la urgencia! 🚨 Usa el filtro de "Disponible Ahora" en el buscador para ver quién puede atenderte inmediatamente.',
                'Para emergencias, te recomiendo publicar una cotización y marcarla como "Urgente" para notificar a todos los profesionales cercanos.',
                'Tranquilo. Dime de qué oficio es tu emergencia y tu barrio para priorizar tu solicitud.'
            ]
        },
        {
            tag: 'queja',
            patterns: ['quiero quejarme', 'mal servicio', 'reportar', 'problema con trabajador', 'me estafó', 'no llegó'],
            responses: [
                'Lamento mucho que hayas tenido una mala experiencia. 😔 Por favor, ve al perfil del trabajador y usa el botón "Reportar Usuario" para que nuestro equipo investigue.',
                'Nos tomamos esto muy en serio. Puedes enviarnos los detalles al correo de soporte y tomaremos acciones inmediatas.',
                'Para reportar un mal servicio, entra al detalle del trabajo y selecciona "Reportar inconveniente". Nuestro equipo de mediación intervendrá.'
            ]
        },
        {
            tag: 'perfil_trabajador',
            patterns: ['cómo creo mi perfil', 'soy técnico', 'quiero ofrecer servicios', 'buscar trabajo', 'conseguir clientes'],
            responses: [
                '¡Excelente! Para conseguir clientes, regístrate como "Trabajador", completa tu perfil, añade tus oficios y zonas de cobertura. 💼',
                'Puedo ayudarte a armar tu perfil profesional en este momento. Solo di "Crear mi CV" y te guiaré paso a paso.',
                'Un buen perfil atrae más clientes. Asegúrate de subir foto, describir bien tu experiencia y subir fotos de tus trabajos.'
            ]
        },
        {
            tag: 'portafolio',
            patterns: ['cómo subo fotos', 'portafolio', 'mostrar mis trabajos', 'galería de trabajos', 'fotos de antes y después'],
            responses: [
                'El portafolio es clave para generar confianza. 📸 Ve a "Mi Perfil", busca la sección "Portafolio" y sube fotos del "Antes" y "Después" de tus proyectos.',
                'Puedes agregar fotos desde tu panel de trabajador. A los clientes les encanta ver evidencia de tu buen trabajo.',
                'Sube imágenes nítidas de tus mejores reparaciones u obras en la pestaña "Mi Portafolio".'
            ]
        },
        {
            tag: 'zona_cobertura',
            patterns: ['qué zonas cubren', 'trabajan en mi barrio', 'cobertura', 'llegan hasta', 'ciudades'],
            responses: [
                'TuOficioCol opera en múltiples ciudades. Al buscar, el sistema detecta tu ubicación y te muestra los profesionales que cubren tu zona. 🗺️',
                'Los trabajadores configuran su propio radio de acción. ¿En qué barrio o ciudad te encuentras para confirmar disponibilidad?',
                'Puedes filtrar resultados por distancia (ej: a menos de 5km de ti) para asegurar que el trabajador llegue rápido.'
            ]
        },
        {
            tag: 'pago',
            patterns: ['formas de pago', 'cómo pago', 'aceptan transferencia', 'tarjeta de crédito', 'efectivo'],
            responses: [
                'Por ahora, el pago se realiza directamente entre tú y el trabajador (efectivo, transferencia, etc.) una vez finalizado el servicio. 💳',
                'Tú acuerdas el método de pago con el profesional. Muchos aceptan efectivo, transferencias bancarias o apps de pago móvil.',
                'TuOficioCol no retiene comisiones de tus pagos. Pagas el 100% acordado directamente al trabajador.'
            ]
        },
        {
            tag: 'seguridad',
            patterns: ['es seguro', 'puedo confiar', 'garantía', 'es de confianza', 'quién responde'],
            responses: [
                'Tu seguridad es prioridad. 🔒 Fíjate en la "Insignia de Verificación", lee las reseñas de otros usuarios y no hagas pagos por adelantado a desconocidos.',
                'Recomendamos contratar perfiles con altas calificaciones. Además, mantenemos un sistema de reportes para expulsar a malos elementos.',
                'Para mayor garantía, deja todo por escrito en el chat de la plataforma y pide siempre una cotización detallada.'
            ]
        },
        {
            tag: 'parentesco_vecino',
            patterns: ['mi vecino necesita', 'un vecino me dijo', 'mi vecina busca', 'para un vecino', 'vecinos'],
            responses: [
                '¡Qué buen vecino eres ayudando! 🏘️ Cuéntame, ¿qué tipo de servicio necesita tu vecino y en qué zona está?',
                'Claro que sí, puedes compartirle el enlace del perfil del trabajador a tu vecino. ¿Qué especialidad están buscando?',
                'Entiendo, para ayudar a tu vecino, dime ¿qué reparación necesita? Así les damos opciones rápido.'
            ]
        },
        {
            tag: 'parentesco_familiar',
            patterns: ['mi mamá necesita', 'mi papá busca', 'mi hermano quiere', 'para mi abuela', 'mi esposa necesita', 'mi esposo', 'familia'],
            responses: [
                '¡Perfecto! Veo que alguien de tu familia necesita ayuda. 😊 Cuéntame qué tipo de servicio necesita y en qué zona está.',
                'Es genial que apoyes a tu familia. 👨‍👩‍👧‍👦 ¿En qué te puedo ayudar para encontrarles el mejor técnico?',
                'Con gusto ayudamos a tu familia. Puedes coordinar tú mismo el servicio o enviarles el contacto. ¿De qué trata el trabajo?'
            ]
        },
        {
            tag: 'parentesco_amigo',
            patterns: ['un amigo necesita', 'mi amiga busca', 'para un conocido', 'un compañero'],
            responses: [
                'Los amigos siempre están ahí para ayudar. 🤝 ¿Qué servicio busca tu amigo? Puedo sugerirte algunos expertos.',
                'Puedes buscar al técnico y luego compartirle el perfil a tu amigo vía WhatsApp. ¿Qué oficio necesitan?',
                '¡Claro! Dime el problema que tiene tu amigo y buscaremos la mejor solución en su zona.'
            ]
        },
        {
            tag: 'recomendar',
            patterns: ['puedes recomendarme', 'qué me recomiendas', 'sugiéreme', 'a quién contrato', 'mejor calificado'],
            responses: [
                'Te recomiendo siempre fijarte en 3 cosas: 1) Reseñas, 2) Perfil Verificado y 3) Que sus precios base se ajusten a tu presupuesto. 💡',
                'Para darte una buena recomendación, necesito saber qué oficio buscas y tu ubicación. ¡Así te mostraré a los Top Rate!',
                'Nuestros algoritmos destacan a los profesionales con más de 4.5 estrellas. Busca el servicio y fíjate en los primeros resultados.'
            ]
        },
        {
            tag: 'chatbot_identidad',
            patterns: ['quién eres', 'eres un robot', 'eres real', 'cómo te llamas', 'inteligencia artificial'],
            responses: [
                'Soy TuOficioBot 🤖, el asistente virtual impulsado por IA de TuOficioCol. ¡Estoy aquí para hacerte la vida más fácil!',
                'Soy una inteligencia artificial diseñada para ayudarte a usar la plataforma y conectar con profesionales. ¿En qué te sirvo?',
                'Puedes llamarme TuOficioBot. No soy humano, pero trabajo muy duro para darte las mejores respuestas. ⚡'
            ]
        },
        {
            tag: 'ayuda',
            patterns: ['ayuda', 'no entiendo', 'estoy perdido', 'necesito ayuda', 'auxilio', 'soporte'],
            responses: [
                '¡Tranquilo! Estoy aquí para guiarte. 🛟 ¿Qué estás intentando hacer: buscar un técnico, registrarte o publicar un trabajo?',
                'Con gusto te asisto. Escribe en palabras simples lo que necesitas lograr en la plataforma.',
                '¡Claro que sí! Si prefieres, puedo mostrarte un menú con las opciones principales. ¿Sobre qué tema tienes dudas?'
            ]
        },
        {
            tag: 'favoritos',
            patterns: ['cómo guardo favoritos', 'agregar a favoritos', 'guardar perfil', 'marcar como favorito', 'corazón'],
            responses: [
                'Para guardar un perfil que te gustó, solo presiona el ícono del corazón ❤️ en su tarjeta. Se guardará en tu sección de "Favoritos".',
                'Tus favoritos se guardan en tu panel de control. Es muy útil para tener a mano a los profesionales que te gustaron.',
                '¡Es súper fácil! Toca el corazón junto al nombre del trabajador y lo tendrás guardado para futuras contrataciones.'
            ]
        },
        {
            tag: 'compartir',
            patterns: ['cómo comparto un perfil', 'compartir en WhatsApp', 'enviar a un amigo', 'pasar el contacto'],
            responses: [
                'En el perfil de cada trabajador verás un botón de "Compartir" 🔗. Podrás enviarlo directamente por WhatsApp, Facebook o copiar el link.',
                'Es fácil: entra al perfil del técnico y usa el icono de compartir para enviárselo a quien lo necesite.',
                'Puedes copiar la URL del perfil o usar el botón de redes sociales para recomendar a un trabajador.'
            ]
        },
        {
            tag: 'contacto',
            patterns: ['cómo contacto soporte', 'teléfono', 'email de contacto', 'hablar con un humano', 'asesor'],
            responses: [
                'Puedes escribir a soporte@tuoficiocol.com o llamar al 01-800-TUOFICIO. Nuestro equipo humano trabaja de 8am a 6pm. 📞',
                'Si necesitas mediación humana, ve a la sección de Ayuda en el menú inferior y selecciona "Contactar Soporte".',
                'Para temas administrativos o quejas graves, contáctanos vía email y te responderemos en menos de 24 horas.'
            ]
        }
    ];

    const stopwords = [
        'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'en', 'con', 'por', 'para', 'al', 'es', 'y', 'o', 'que', 'se', 'no', 'su', 'lo', 'a', 'mi', 'tu', 'te', 'me', 'nos', 'le', 'les', 'como', 'más', 'pero'
    ];

    const synonyms = {
        'plomero': 'plomero', 'fontanero': 'plomero', 'tuberia': 'plomero',
        'electrisista': 'electricista', 'luz': 'electricista',
        'carpintero': 'carpintero', 'ebanista': 'carpintero', 'madera': 'carpintero',
        'nesesito': 'necesito', 'ocupo': 'necesito', 'kiero': 'quiero',
        'ayudame': 'ayuda', 'xfa': 'por favor', 'porfa': 'por favor',
        'bn': 'bien', 'q': 'que', 'k': 'que', 'ola': 'hola', 'weno': 'bueno'
    };

    const entityPatterns = {
        phone: /(\+?57\s?)?(3\d{2}[\s\-]?\d{3}[\s\-]?\d{4}|\d{7,10})/g,
        email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        urgency: /\b(urgente|emergencia|ya|rápido|auxilio|inmediato)\b/gi,
        family: /\b(mamá|papá|padre|madre|hermano|hermana|abuela|abuelo|tío|tía|esposo|esposa|primo|prima|hijo|hija)\b/gi,
        trades: /\b(plomero|electricista|carpintero|albañil|pintor|cerrajero|jardinero|técnico)\b/gi,
        locations: /\b(norte|sur|centro|barrio|ciudad|localidad|calle|carrera)\b/gi
    };

    const sentimentWords = {
        positive: ['excelente', 'bueno', 'gracias', 'perfecto', 'genial', 'super', 'rápido', 'ayuda', 'bien', 'mejor'],
        negative: ['malo', 'pésimo', 'lento', 'caro', 'queja', 'problema', 'estafa', 'mal', 'peor', 'terrible', 'roto']
    };

    const conversationFlows = {
        workerProfileCreation: [
            { step: 'start', prompt: '¡Genial! Vamos a crear tu perfil profesional. Primero, ¿cuál es tu nombre completo?', next: 'trade' },
            { step: 'trade', prompt: 'Mucho gusto. ¿Cuál es tu oficio principal? (Ej: Plomero, Electricista)', next: 'experience' },
            { step: 'experience', prompt: '¿Cuántos años de experiencia tienes en esto?', next: 'description' },
            { step: 'description', prompt: 'Escribe una breve descripción de ti y tu trabajo (tus fortalezas).', next: 'zone' },
            { step: 'zone', prompt: '¿En qué zonas o barrios tienes cobertura?', next: 'rates' },
            { step: 'rates', prompt: '¿Cuál es el costo promedio de tu visita diagnóstica o tarifa base?', next: 'finish' },
            { step: 'finish', prompt: '¡Listo! He recopilado tu información. Procesando tu CV digital...', next: null }
        ],
        jobPosting: [
            { step: 'start', prompt: 'Vamos a publicar tu solicitud. ¿Qué tipo de servicio necesitas? (Ej: Albañilería, Limpieza)', next: 'description' },
            { step: 'description', prompt: 'Describe brevemente el problema o proyecto que tienes.', next: 'location' },
            { step: 'location', prompt: '¿En qué dirección aproximada o barrio se realizará el trabajo?', next: 'budget' },
            { step: 'budget', prompt: '¿Cuál es tu presupuesto estimado? (Puedes decir "No sé")', next: 'timeline' },
            { step: 'timeline', prompt: '¿Para cuándo necesitas el servicio? (Ej: Lo más pronto posible, Próxima semana)', next: 'finish' },
            { step: 'finish', prompt: '¡Perfecto! Estoy generando la cotización en la plataforma...', next: null }
        ]
    };

    // Auto-generate vocabulary structure to be populated by the engine
    const vocabulary = {};

    return {
        intents,
        stopwords,
        synonyms,
        entityPatterns,
        sentimentWords,
        conversationFlows,
        vocabulary
    };
})();
