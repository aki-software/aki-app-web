export const translations = {
  es: {
    nav: {
      howItWorks: 'Cómo funciona',
      methodology: 'Metodología',
      forInstitutions: 'Profesionales',
      pricing: 'Planes',
      login: 'Ingresar',
      startFree: 'Solicitar acceso',
    },
    hero: {
      badge: 'Orientación Ocupacional',
      title: 'Orientación vocacional',
      titleAccent: 'para tu práctica profesional',
      subtitle: 'Para terapeutas particulares e instituciones con equipos de orientación. Organizá vouchers, seguí evaluaciones y consultá los reportes disponibles desde un mismo lugar.',
      ctaPrimary: 'Solicitar acceso',
      ctaSecondary: 'Conocer el proceso',
      qrLabel: 'Escaneá para descargar la App',
      qrSublabel: 'Disponible gratis en Google Play',
      phoneTitle: '¿Qué te interesa?',
      phoneTag: 'CREATIVIDAD',
      phoneProgress: '12 de 120',
      cards: [
        { code: 'IND', image: '/images/cards/ind_1.png', title: 'Elaborar alimentos\ny productos', sub: 'Trabajar en procesos de producción artesanal o industrial' },
        { code: 'MEC', image: '/images/cards/mec_1.png', title: 'Reparar motores\ny vehículos', sub: 'Diagnosticar fallas y trabajar con sistemas mecánicos' },
        { code: 'SERV', image: '/images/cards/serv_1.png', title: 'Atender y cuidar\nla salud', sub: 'Asistir a pacientes y promover el bienestar integral' },
        { code: 'ART', image: '/images/cards/art_1.png', title: 'Estilo, corte\ny cuidado estético', sub: 'Expresar creatividad a través del diseño y la imagen personal' },
        { code: 'NAT', image: '/images/cards/nat_1.png', title: 'Cultivar y cuidar\nplantas', sub: 'Trabajar en contacto con la tierra y el medio ambiente' },
      ],
      phoneActions: {
        discard: 'No me gusta',
        select: 'Me gusta'
      }
    },
    methodology: {
      categories: [
        { code: 'ART', name: 'Artística' },
        { code: 'HUM', name: 'Humanidades' },
        { code: 'SERV', name: 'Servicios y acomodación' },
        { code: 'PROT', name: 'Protección y Seguridad' },
        { code: 'FÍS', name: 'Deportes y Actividad Física' },
        { code: 'IND', name: 'Industria' },
        { code: 'MEC', name: 'Mecánica' },
        { code: 'NAT', name: 'Naturaleza' },
        { code: 'LÍD', name: 'Liderazgo' },
        { code: 'CIE', name: 'Ciencia' },
        { code: 'VENT', name: 'Ventas' },
        { code: 'NEG', name: 'Negocios' },
      ],
    },
    problem: {
      title: '¿No sabés qué estudiar o trabajar?',
      cards: [
        { title: 'Miles de opciones y ninguna certeza', desc: 'Elegir sin información clara cuesta tiempo, dinero y frustración.' },
        { title: 'Cuestionarios largos y agotadores', desc: 'Nadie quiere responder 200 preguntas teóricas. Nuestro test es ágil, visual y dinámico.' },
        { title: 'Orientación cara y de difícil acceso', desc: 'La orientación ocupacional de calidad debe estar al alcance de todos.' },
      ],
    },
    howItWorks: {
      title: 'Cómo funciona',
      subtitle: 'Un flujo conectado entre el panel web para profesionales e instituciones y la app móvil para quienes realizan el test.',
      tabs: { student: 'Para Estudiantes', institution: 'Para Profesionales e Instituciones' },
      studentSteps: [
        { title: 'Clasificá imágenes', desc: 'Elegís las imágenes que te gustan deslizando hacia la derecha o tocando la tilde (<strong class="text-confirm font-bold text-base">✓</strong>), y descartás las que no te interesan deslizando a la izquierda o tocando la equis (<strong class="text-destructive font-bold text-base">×</strong>).' },
        { title: 'Descubrí tu perfil', desc: 'El sistema analiza tus elecciones en las 12 categorías ocupacionales y calcula las áreas que más se alinean con tus intereses.' },
        { title: 'Accedé a tu reporte', desc: 'Desbloqueá el informe ocupacional en PDF con un código de voucher de tu orientador o institución, o mediante compra en la app.' },
      ],
      institutionSteps: [
        { title: 'Solicitá acceso profesional', desc: 'Coordiná el alta de tu consultorio o institución con nuestro equipo para operar desde el panel web.' },
        { title: 'Asigná vouchers', desc: 'Entregá códigos únicos a tus consultantes o estudiantes para que accedan al reporte completo sin costo individual para ellos.' },
        { title: 'Seguí avances y reportes', desc: 'Consultá el estado de cada evaluación o cohorte en tiempo real y descargá los reportes PDF autorizados en un clic.' },
      ],
    },
    features: {
      title: 'Diseñado para la práctica profesional y el aula',
      items: [
        { title: 'Funciona sin conexión', desc: 'Los estudiantes pueden realizar el test offline en la app Android; el progreso se sincroniza al recuperar internet.' },
        { title: 'Accesibilidad integrada', desc: 'Lectura por voz (TTS), alto contraste, lectura fácil y velocidad de deslizamiento adaptable.' },
        { title: 'Español e Inglés', desc: 'Interfaz y evaluación disponibles en ambos idiomas tanto en la web como en la aplicación.' },
        { title: 'Reporte PDF profesional', desc: 'Perfil ocupacional de 12 dimensiones con gráficos claros y sugerencias formativas.' },
        { title: 'Datos protegidos', desc: 'Comunicaciones cifradas y acceso a reportes controlado por rol y alcance institucional.' },
        { title: 'Recomendaciones aplicadas', desc: 'Ocupaciones y trayectos sugeridos a partir de las afinidades observadas durante el cotejo.' },
      ],
    },
    institutions: {
      badge: 'Para profesionales e instituciones',
      title: 'Tu práctica y tu equipo, un mismo espacio de trabajo',
      desc: 'Trabajes de forma particular o en un gabinete psicopedagógico, escribinos para solicitar acceso y conversar sobre las necesidades de tu consultorio o institución.',
      features: ['Seguimiento individual y de cohortes', 'Panel web con estado de evaluaciones en vivo', 'Gestión de vouchers y reportes PDF autorizados'],
      cta: 'Solicitar acceso',
      form: { name: 'Nombre y apellido', email: 'Correo electrónico', institution: 'Consultorio / Institución (opcional)', submit: 'Solicitar acceso', success: 'Recibimos tu solicitud. Nuestro equipo se pondrá en contacto por correo para coordinar los próximos pasos.' },
      dashboard: 'Dashboard',
      stats: { tests: 'Tests completados', completion: 'Completitud', reports: 'Reportes' },
      chart: '📊 Distribución de Perfiles Ocupacionales',
    },
    pricing: {
      title: 'Planes para profesionales e instituciones',
      subtitle: 'Elegí la modalidad que mejor se adapte a tu consultorio particular, gabinete o institución educativa.',
      demo: { badge: 'Prueba guiada', label: 'Plan de Prueba', price: 'Consultar', desc: 'Recorrido guiado con nuestro equipo para evaluar la plataforma en tu práctica o institución.', features: ['Acceso guiado al panel web', 'Recorrido por métricas y reportes', 'Evaluación de implementación'], cta: 'Consultar por Demo' },
      basic: { badge: '25 vouchers', label: 'Plan <span class="font-display font-black text-secondary text-2xl">Δ</span>-AKI', price: 'Consultar', desc: 'Para orientadores particulares, consultorios y grupos reducidos.', features: ['25 vouchers de evaluación y reporte', 'Panel web completo', 'Seguimiento individual detallado', 'Soporte prioritario'], cta: 'Consultar Plan Δ-AKI' },
      pro: { badge: '50 vouchers', label: 'Plan <span class="font-display font-black text-primary text-2xl">Σ</span>-AKI', price: 'Consultar', desc: 'Pensado para colegios medianos y equipos de orientación.', features: ['50 vouchers de evaluación y reporte', 'Panel web completo', 'Métricas y seguimiento por cohorte', 'Soporte dedicado'], cta: 'Consultar Plan Σ-AKI' },
      enterprise: { badge: '1000 vouchers', label: 'Plan <span class="font-display font-black text-text text-2xl">Π</span>-AKI', price: 'Consultar', desc: 'Licencia anual para redes educativas o grandes instituciones.', features: ['1000 vouchers durante 1 año', 'Acceso completo para el equipo', 'Reportes de impacto institucional', 'Acompañamiento de puesta en marcha'], cta: 'Consultar Plan Π-AKI' },
    },
    faq: {
      title: 'Preguntas frecuentes',
      items: [
        { q: '¿Cómo solicito acceso para mi consultorio o institución?', a: 'Completá el formulario de solicitud de acceso en esta página. Nuestro equipo se pondrá en contacto para conocer tu necesidad y habilitar tu cuenta en el panel web. Enviar el formulario no activa una cuenta de forma automática.' },
        { q: '¿Cómo funcionan los vouchers para consultantes y estudiantes?', a: 'Los orientadores particulares y las instituciones adquieren paquetes de vouchers (planes Δ-AKI, Σ-AKI o Π-AKI) y entregan un código a cada estudiante o consultante para desbloquear su informe PDF completo sin que deban abonar en la app.' },
        { q: '¿La app móvil y el test son gratuitos para quien se evalúa?', a: 'Sí. Descargar la app en Google Play y realizar el test interactivo de clasificación de imágenes es 100% gratuito. El informe ocupacional completo en PDF se desbloquea con el voucher provisto por el profesional o institución, o mediante compra dentro de la app.' },
        { q: '¿Dónde está disponible la app y qué pasa si falla internet en el aula?', a: 'La aplicación móvil está disponible para Android en Google Play. Permite completar el test sin conexión a internet y sincroniza las respuestas automáticamente al recuperar conectividad.' },
      ],
    },
    finalCta: {
      title: 'Hablemos de tu práctica profesional',
      subtitle: 'Solicitá acceso para tu consultorio o institución. Nuestro equipo se pondrá en contacto para conversar sobre los próximos pasos.',
      googlePlay: 'Descargar en Google Play',
      webVersion: 'Versión web',
      qrLabel: 'Escaneá con tu celular para descargar',
      qrSublabel: 'Disponible gratis en Google Play',
    },
    footer: {
      contact: 'Contacto',
      privacy: 'Privacidad',
      terms: 'Términos',
      deleteAccount: 'Eliminar cuenta',
      copyright: 'Tu futuro comienza aquí.',
      rightsReserved: 'Todos los derechos reservados.',
      whatsappMessage: 'Hola, me gustaría recibir información sobre Orient A.KI y solicitar acceso a la plataforma.',
    },
    maintenance: {
      badge: 'Próximamente',
      title: 'Diseñando el futuro de la orientación ocupacional',
      subtitle: 'Estamos preparando una experiencia ágil y visual para ayudarte a encontrar tu camino ocupacional. Muy pronto vas a poder descargar la app y acceder al dashboard.',
      ctaContact: 'Consultas o Instituciones',
      footer: '© 2026 A.KI. Todos los derechos reservados.',
    },
    statsBar: {
      items: [
        { value: '12', label: 'categorías ocupacionales' },
        { value: '10 min', label: 'máximo de duración' },
        { value: 'App Gratis', label: 'descarga libre · reporte por voucher o en la app' },
      ]
    },
    socialProof: {
      badge: 'TEST OCUPACIONAL',
      title: 'Lo que dicen quienes ya lo probaron',
      metric: {
        value: 100,
        title: '100% de recomendación',
        subtitle: 'De los usuarios consultados recomendaría ORIENTA.KI a otra persona',
      },
      attributes: [
        { label: 'Resultados fieles a tu personalidad', percentage: 94.1 },
        { label: 'Fácil de usar e intuitiva', percentage: 100 },
        { label: 'Práctica y sin vueltas', percentage: 64.7 },
      ],
      testimonials: [
        {
          quote: 'Me encantó poder elegir imágenes sin los sesgos de las profesiones de siempre. Te conecta con tus intereses reales y no con un mandato o una etiqueta preestablecida.',
          author: 'Estudiante / Usuario ORIENTA.KI',
          role: 'Encuesta de validación',
        },
        {
          quote: 'El informe final es súper preciso y detallado. No te tira generalidades: te da exactamente la claridad que necesitás para orientarte.',
          author: 'Usuario ORIENTA.KI',
          role: 'Encuesta de validación',
        },
        {
          quote: 'La dinámica de swipe es genial. Es directa, no te da mil vueltas como los tests eternos y en pocos minutos tenés un resultado claro.',
          author: 'Usuario ORIENTA.KI',
          role: 'Encuesta de validación',
        },
      ],
    },
    langSwitch: 'EN',
  },
  en: {
    nav: {
      howItWorks: 'How it works',
      methodology: 'Methodology',
      forInstitutions: 'Professionals',
      pricing: 'Pricing',
      login: 'Sign in',
      startFree: 'Request access',
    },
    hero: {
      badge: 'Occupational Guidance',
      title: 'Vocational guidance',
      titleAccent: 'for your professional practice',
      subtitle: 'For private therapists and institutions with guidance teams. Organize vouchers, track assessments and access available reports in one place.',
      ctaPrimary: 'Request access',
      ctaSecondary: 'Explore the process',
      qrLabel: 'Scan to download the App',
      qrSublabel: 'Free on Google Play · Full report paid',
      phoneTitle: 'What interests you?',
      phoneTag: 'CREATIVITY',
      phoneProgress: '12 of 120',
      cards: [
        { code: 'IND', image: '/images/cards/ind_1.png', title: 'Produce food\nand goods', sub: 'Work in artisanal or industrial production processes' },
        { code: 'MEC', image: '/images/cards/mec_1.png', title: 'Repair engines\nand vehicles', sub: 'Diagnose issues and work with mechanical systems' },
        { code: 'SERV', image: '/images/cards/serv_1.png', title: 'Provide healthcare\nand patient care', sub: 'Assist patients and promote holistic well-being' },
        { code: 'ART', image: '/images/cards/art_1.png', title: 'Styling, grooming\nand hair design', sub: 'Express creativity through personal image and design' },
        { code: 'NAT', image: '/images/cards/nat_1.png', title: 'Cultivate and care\nfor plants', sub: 'Work hands-on with nature and the environment' },
      ],
      phoneActions: {
        discard: "Don't Like",
        select: 'Like'
      }
    },
    methodology: {
      categories: [
        { code: 'ART', name: 'Arts' },
        { code: 'HUM', name: 'Humanities' },
        { code: 'SERV', name: 'Services & Accommodation' },
        { code: 'PROT', name: 'Protection & Safety' },
        { code: 'PHY', name: 'Sports & Physical Activity' },
        { code: 'IND', name: 'Industry' },
        { code: 'MEC', name: 'Mechanics' },
        { code: 'NAT', name: 'Nature' },
        { code: 'LEAD', name: 'Leadership' },
        { code: 'SCI', name: 'Science' },
        { code: 'SAL', name: 'Sales' },
        { code: 'BUS', name: 'Business' },
      ],
    },
    problem: {
      title: "Don't know what path to choose?",
      cards: [
        { title: 'Thousands of options, zero certainty', desc: 'Choosing without clear insights leads to wasted time and frustration.' },
        { title: 'Long and tedious questionnaires', desc: 'Nobody wants 200 theoretical questions. Our test is quick, visual, and engaging.' },
        { title: 'Costly and inaccessible guidance', desc: 'High-quality occupational guidance should be accessible to everyone.' },
      ],
    },
    howItWorks: {
      title: 'How it works',
      subtitle: 'A connected workflow between the web dashboard for professionals and institutions and the mobile app for test-takers.',
      tabs: { student: 'For Students', institution: 'For Professionals & Institutions' },
      studentSteps: [
        { title: 'Sort visual cards', desc: 'Choose the images you like by swiping right or tapping the checkmark (<strong class="text-confirm font-bold text-base">✓</strong>), and discard the ones you don\'t by swiping left or tapping the cross (<strong class="text-destructive font-bold text-base">×</strong>).' },
        { title: 'Discover your profile', desc: 'The system analyzes your choices across the 12 occupational categories and calculates the areas that best match your interests.' },
        { title: 'Access your report', desc: 'Unlock the detailed occupational PDF report using a voucher code from your counselor or institution, or via in-app purchase.' },
      ],
      institutionSteps: [
        { title: 'Request professional access', desc: 'Coordinate onboarding for your private practice or institution with our team to work from the web dashboard.' },
        { title: 'Assign vouchers', desc: 'Share unique codes with your clients or students so they can unlock the full report at no individual cost.' },
        { title: 'Track progress and reports', desc: 'Monitor individual or cohort assessment status in real time and download authorized PDF reports in one click.' },
      ],
    },
    features: {
      title: 'Built for professional practice and the classroom',
      items: [
        { title: 'Works offline', desc: 'Students can complete the assessment offline on the Android app; progress syncs automatically once back online.' },
        { title: 'Built-in accessibility', desc: 'Text-to-speech (TTS), high contrast, easy reading, and adjustable swipe speed.' },
        { title: 'Spanish and English', desc: 'Interface and assessment available in both languages across web and mobile.' },
        { title: 'Professional PDF report', desc: '12-dimension occupational profile with clear charts and career pathways.' },
        { title: 'Protected data', desc: 'Encrypted communications and report access strictly scoped by professional role and institution.' },
        { title: 'Actionable recommendations', desc: 'Suggested occupations and educational paths derived from observed affinities.' },
      ],
    },
    institutions: {
      badge: 'For professionals and institutions',
      title: 'Your practice and your team, one workspace',
      desc: 'Whether you work in private practice or within a school counseling team, contact us to request access and discuss the needs of your workspace or institution.',
      features: ['Individual and cohort tracking', 'Web dashboard with live assessment status', 'Voucher management and authorized PDF reports'],
      cta: 'Request access',
      form: { name: 'Full name', email: 'Email address', institution: 'Practice / Institution (optional)', submit: 'Request access', success: 'We received your request. Our team will reach out by email to coordinate the next steps.' },
      dashboard: 'Dashboard',
      stats: { tests: 'Tests completed', completion: 'Completion rate', reports: 'Reports' },
      chart: '📊 Occupational Profile Distribution',
    },
    pricing: {
      title: 'Plans for professionals and institutions',
      subtitle: 'Choose the option that best fits your private practice, counseling department, or educational institution.',
      demo: { badge: 'Guided trial', label: 'Trial Plan', price: 'Contact Us', desc: 'Guided walkthrough with our team to evaluate the platform for your practice or institution.', features: ['Guided web dashboard access', 'Metrics and report walkthrough', 'Implementation assessment'], cta: 'Contact for Demo' },
      basic: { badge: '25 vouchers', label: '<span class="font-display font-black text-secondary text-2xl">Δ</span>-AKI Plan', price: 'Contact Us', desc: 'For private therapists, independent practices, and small groups.', features: ['25 assessment & report vouchers', 'Full web dashboard', 'Detailed individual tracking', 'Priority support'], cta: 'Inquire Δ-AKI Plan' },
      pro: { badge: '50 vouchers', label: '<span class="font-display font-black text-primary text-2xl">Σ</span>-AKI Plan', price: 'Contact Us', desc: 'Designed for mid-sized schools and counseling teams.', features: ['50 assessment & report vouchers', 'Full web dashboard', 'Cohort metrics and tracking', 'Dedicated support'], cta: 'Inquire Σ-AKI Plan' },
      enterprise: { badge: '1000 vouchers', label: '<span class="font-display font-black text-text text-2xl">Π</span>-AKI Plan', price: 'Contact Us', desc: 'Annual license for school networks or large institutions.', features: ['1000 vouchers for 1 year', 'Full team dashboard access', 'Institutional impact reports', 'Guided institutional onboarding'], cta: 'Inquire Π-AKI Plan' },
    },
    faq: {
      title: 'Frequently asked questions',
      items: [
        { q: 'How do I request access for my practice or institution?', a: 'Complete the access request form on this page. Our team will reach out to understand your needs and provision your web dashboard account. Submitting the form does not automatically activate an account.' },
        { q: 'How do vouchers work for clients and students?', a: 'Private therapists and institutions acquire voucher batches (Δ-AKI, Σ-AKI, or Π-AKI plans) and share a code with each student or client so they can unlock their full PDF report without paying in the app.' },
        { q: 'Are the mobile app and assessment free for test-takers?', a: 'Yes. Downloading the app on Google Play and completing the visual card-sorting test is 100% free. The complete PDF report is unlocked with a voucher from their counselor or institution, or via in-app purchase.' },
        { q: 'Where is the app available and does it work without classroom Wi-Fi?', a: 'The mobile app is available for Android on Google Play. It works offline during the assessment and syncs responses automatically once reconnected.' },
      ],
    },
    finalCta: {
      title: 'Let us talk about your practice',
      subtitle: 'Request access for your practice or institution. Our team will contact you to discuss the next steps.',
      googlePlay: 'Download on Google Play',
      webVersion: 'Web version',
      qrLabel: 'Scan with your phone to download',
      qrSublabel: 'Available for free on Google Play',
    },
    footer: {
      contact: 'Contact',
      privacy: 'Privacy',
      terms: 'Terms',
      deleteAccount: 'Delete account',
      copyright: 'Your future starts here.',
      rightsReserved: 'All rights reserved.',
      whatsappMessage: 'Hello, I would like to receive information about Orient A.KI and request access to the platform.',
    },
    maintenance: {
      badge: 'Coming Soon',
      title: 'Designing the future of occupational guidance',
      subtitle: 'We are preparing a visual and agile experience to help you find your career path. Very soon you will be able to download the app and access the dashboard.',
      ctaContact: 'Inquiries & Institutions',
      footer: '© 2026 A.KI. All rights reserved.',
    },
    statsBar: {
      items: [
        { value: '12', label: 'occupational categories' },
        { value: '10 min', label: 'maximum test duration' },
        { value: 'Free App', label: 'free download · report via voucher or in-app' },
      ]
    },
    socialProof: {
      badge: 'OCCUPATIONAL TEST',
      title: 'What early testers are saying',
      metric: {
        value: 100,
        title: '100% recommendation',
        subtitle: 'Of surveyed users would recommend ORIENTA.KI to someone else',
      },
      attributes: [
        { label: 'Results true to your personality', percentage: 94.1 },
        { label: 'Easy to use and intuitive', percentage: 100 },
        { label: 'Practical and straightforward', percentage: 64.7 },
      ],
      testimonials: [
        {
          quote: 'I loved being able to choose images without the bias of traditional professions. It connects you with your real interests, not with a pre-established mandate or label.',
          author: 'Student / ORIENTA.KI User',
          role: 'Validation Survey',
        },
        {
          quote: 'The final report is super precise and detailed. It doesn’t give you generalities: it gives you exactly the clarity you need to find your direction.',
          author: 'ORIENTA.KI User',
          role: 'Validation Survey',
        },
        {
          quote: 'The swipe dynamics are great. It is direct, doesn’t beat around the bush like never-ending tests, and in a few minutes you get a clear result.',
          author: 'ORIENTA.KI User',
          role: 'Validation Survey',
        },
      ],
    },
    langSwitch: 'ES',
  },
};

export type Locale = keyof typeof translations;
export type Translation = typeof translations.es;
