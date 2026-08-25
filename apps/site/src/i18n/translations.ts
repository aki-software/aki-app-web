export const translations = {
  es: {
    nav: {
      howItWorks: 'Cómo funciona',
      methodology: 'Metodología',
      forInstitutions: 'Instituciones',
      pricing: 'Planes',
      login: 'Acceso Institucional',
      startFree: 'Descargar App',
    },
    hero: {
      badge: 'Orientación Ocupacional',
      title: 'Descubrí tu perfil',
      titleAccent: 'en 10 minutos',
      subtitle: 'Deslizá imágenes de actividades y descubrí tus afinidades ocupacionales en 10 minutos como máximo. Un test visual y dinámico que revela tu perfil y las ocupaciones que mejor van con vos.',
      ctaPrimary: 'Descargar App Gratis',
      ctaSecondary: 'Soy una Institución',
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
      subtitle: 'Descubrí cómo Orient A.KI transforma la orientación ocupacional.',
      tabs: { student: 'Para Estudiantes', institution: 'Para Instituciones' },
      studentSteps: [
        { title: 'Clasificá imágenes', desc: 'Pasá las imágenes de actividades hacia la derecha si te interesan o hacia la izquierda para descartarlas. Cada swipe refleja tus intereses espontáneos sin filtros.' },
        { title: 'Descubrí tu perfil', desc: 'El sistema analiza tus elecciones y calcula tu perfil ocupacional con las áreas que más se alinean a tus preferencias.' },
        { title: 'Obtené tu reporte', desc: 'Accedé a un PDF detallado con recomendaciones de carreras y ocupaciones basado en tus afinidades reales.' },
      ],
      institutionSteps: [
        { title: 'Solicitá acceso', desc: 'Obtené tu cuenta para el Dashboard Institucional de Orient A.KI.' },
        { title: 'Generá vouchers', desc: 'Creá códigos únicos para que tus estudiantes accedan al reporte completo sin costo para ellos.' },
        { title: 'Monitoreá en vivo', desc: 'Accedé a analíticas de grupo en tiempo real y descargá reportes detallados en un clic.' },
      ],
    },
    features: {
      title: 'Todo lo que necesitás',
      items: [
        { title: 'Funciona offline', desc: 'Hacé el test sin conexión. Se sincroniza cuando volvés a tener internet.' },
        { title: 'Accesibilidad integrada', desc: 'TTS, alto contraste, lectura fácil y velocidad de swipe ajustable.' },
        { title: 'Español e Inglés', desc: 'Disponible en ambos idiomas para mayor alcance.' },
        { title: 'Reporte PDF profesional', desc: 'Perfil ocupacional detallado con gráficos y recomendaciones.' },
        { title: 'Datos seguros', desc: 'Base de datos encriptada. Tu información está protegida.' },
        { title: 'Recomendaciones personalizadas', desc: 'Ocupaciones y carreras sugeridas según tus afinidades únicas.' },
      ],
    },
    institutions: {
      badge: 'Para instituciones',
      title: '¿Trabajás en una escuela\no sos orientador?',
      desc: 'Gestioná grupos de estudiantes, generá vouchers y accedé a analytics en tiempo real. Todo desde un dashboard intuitivo.',
      features: ['Gestión de grupos y sesiones masivas', 'Dashboard con analytics por institución', 'Vouchers y reportes personalizados'],
      cta: 'Solicitar una demo',
      form: { name: 'Nombre', email: 'Email', institution: 'Institución / Organización', submit: 'Solicitar demo', success: 'Gracias por tu interés. Te vamos a contactar a la brevedad.' },
      dashboard: 'Dashboard',
      stats: { tests: 'Tests completados', completion: 'Completitud', reports: 'Reportes' },
      chart: '📊 Distribución de Perfiles Ocupacionales',
    },
    pricing: {
      title: 'Planes Institucionales',
      subtitle: 'Llevá la orientación ocupacional a tu colegio o consultorio.',
      demo: { badge: 'Demo', label: 'Orient A.KI Demo', desc: 'Para probar la plataforma', features: ['Acceso al Dashboard Web', '3 vouchers gratis', 'Analíticas básicas', 'Soporte por email'], cta: 'Solicitar Demo' },
      basic: { badge: '25', label: 'Orient A.KI 25', price: 'A convenir', desc: 'Para colegios y orientadores', features: ['25 vouchers', 'Dashboard completo', 'Analíticas detalladas', 'Soporte prioritario'], cta: 'Quiero 25 vouchers' },
      pro: { badge: '50', label: 'Orient A.KI 50', price: 'A convenir', desc: 'Para instituciones y distritos', features: ['50 vouchers', 'Dashboard completo', 'Analíticas de cohortes', 'Soporte dedicado + onboarding'], cta: 'Quiero 50 vouchers' },
    },
    faq: {
      title: 'Preguntas frecuentes',
      items: [
        { q: '¿La app y el test son gratuitos?', a: 'La descarga de la aplicación y la realización del test son 100% gratuitas. El informe ocupacional completo en PDF con el análisis detallado y recomendaciones de carreras se abona dentro de la app o se desbloquea mediante vouchers provistos por tu institución.' },
        { q: '¿Cuánto tarda el test?', a: '10 minutos como máximo. El formato visual de clasificación de imágenes agiliza el proceso sin perder profundidad evaluativa.' },
        { q: '¿Cómo funcionan los vouchers institucionales?', a: 'Las escuelas u orientadores compran paquetes de vouchers y los entregan a los estudiantes para que descarguen el informe completo sin abonar individualmente.' },
        { q: '¿Dónde está disponible?', a: 'La app está disponible en Google Play. El test funciona incluso sin conexión a internet y se sincroniza automáticamente.' },
      ],
    },
    finalCta: {
      title: 'Tu futuro comienza aquí',
      subtitle: 'Descargá la app gratis, realizá el test en 10 minutos y descubrí tu perfil ocupacional.',
      googlePlay: 'Descargar en Google Play',
      webVersion: 'Versión web',
      qrLabel: 'Escaneá con tu celular para descargar',
      qrSublabel: 'Disponible gratis en Google Play',
    },
    footer: {
      contact: 'Contacto',
      privacy: 'Privacidad',
      terms: 'Términos',
      copyright: 'Tu futuro comienza aquí.',
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
        { value: 'App Gratis', label: 'descarga libre · informe de pago' },
      ]
    },
    socialProof: {
      badge: 'TEST OCUPACIONAL',
      title: 'Lo que dicen quienes ya lo probaron',
      testimonials: [
        { quote: 'No te da muchas vueltas: es directa, dinámica y te da un panorama claro sin cuestionarios eternos.', author: 'Julieta', role: 'Estudiante, 17 años' },
        { quote: 'Poder elegir imágenes libremente y sin prejuicios de profesiones ya establecidas hace que el test sea ágil y entretenido.', author: 'Martín', role: 'Joven profesional, 26 años' },
        { quote: 'El sistema visual de swipe es súper intuitivo y lleva muy poco tiempo. Te da exactamente lo que necesitás.', author: 'Tomás', role: 'Profesional, 32 años' },
        { quote: 'La facilidad para utilizar la app y la precisión de los resultados ayudan un montón a pensar el siguiente paso.', author: 'Carolina', role: 'Estudiante de secundaria' },
      ],
    },
    langSwitch: 'EN',
  },
  en: {
    nav: {
      howItWorks: 'How it works',
      methodology: 'Methodology',
      forInstitutions: 'Institutions',
      pricing: 'Pricing',
      login: 'Institutional Access',
      startFree: 'Download App',
    },
    hero: {
      badge: 'Occupational Guidance',
      title: 'Discover your path',
      titleAccent: 'in 10 minutes',
      subtitle: 'Swipe through activity images and discover your occupational affinities in 10 minutes max. A visual and dynamic test that reveals your profile and the careers that match you best.',
      ctaPrimary: 'Download App for Free',
      ctaSecondary: 'For Institutions',
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
        { code: 'FÍS', name: 'Sports & Physical Activity' },
        { code: 'IND', name: 'Industry' },
        { code: 'MEC', name: 'Mechanics' },
        { code: 'NAT', name: 'Nature' },
        { code: 'LÍD', name: 'Leadership' },
        { code: 'SCI', name: 'Science' },
        { code: 'VENT', name: 'Sales' },
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
      subtitle: 'Discover how A.ki transforms occupational guidance.',
      tabs: { student: 'For Students', institution: 'For Institutions' },
      studentSteps: [
        { title: 'Swipe images', desc: 'Swipe right if an activity interests you, or left to skip. Spontaneous choices reflect genuine interests.' },
        { title: 'Discover your profile', desc: 'The system analyzes your choices and calculates your occupational profile based on aligned areas.' },
        { title: 'Get your report', desc: 'Receive a detailed PDF report with career and occupation recommendations based on real affinities.' },
      ],
      institutionSteps: [
        { title: 'Request access', desc: 'Get your account for the custom A.ki Institutional Dashboard.' },
        { title: 'Generate vouchers', desc: 'Create unique codes so your students can access the full report at no individual cost.' },
        { title: 'Monitor in real-time', desc: 'Access group analytics instantly and download detailed reports in one click.' },
      ],
    },
    features: {
      title: 'Everything you need',
      items: [
        { title: 'Works offline', desc: 'Take the test without connection. It syncs when you\'re back online.' },
        { title: 'Built-in accessibility', desc: 'TTS, high contrast, easy reading and adjustable swipe speed.' },
        { title: 'Spanish and English', desc: 'Available in both languages to reach more people.' },
        { title: 'Professional PDF report', desc: 'Detailed occupational profile with charts and recommendations.' },
        { title: 'Secure data', desc: 'Encrypted database. Your information is protected.' },
        { title: 'Personalized recommendations', desc: 'Suggested careers based on your unique affinity profile.' },
      ],
    },
    institutions: {
      badge: 'For institutions',
      title: 'Do you work at a school\nor are you an advisor?',
      desc: 'Manage student groups, generate vouchers and access real-time analytics. All from an intuitive dashboard.',
      features: ['Group and mass session management', 'Per-institution analytics dashboard', 'Custom vouchers and reports'],
      cta: 'Request a demo',
      form: { name: 'Name', email: 'Email', institution: 'Institution / Organization', submit: 'Request Demo', success: 'Thanks for your interest. We will contact you shortly.' },
      dashboard: 'Dashboard',
      stats: { tests: 'Tests completed', completion: 'Completion rate', reports: 'Reports' },
      chart: '📊 Occupational Profile Distribution',
    },
    pricing: {
      title: 'Institutional Plans',
      subtitle: 'Bring occupational guidance to your school or private practice.',
      demo: { badge: 'Demo', label: 'Orient A.KI Demo', desc: 'Try the platform', features: ['Web Dashboard Access', '3 free vouchers', 'Basic analytics', 'Email support'], cta: 'Request Demo' },
      basic: { badge: '25', label: 'Orient A.KI 25', price: 'Custom', desc: 'For schools and counselors', features: ['25 vouchers', 'Full dashboard', 'Detailed analytics', 'Priority support'], cta: 'I want 25 vouchers' },
      pro: { badge: '50', label: 'Orient A.KI 50', price: 'Custom', desc: 'For institutions and districts', features: ['50 vouchers', 'Full dashboard', 'Cohort analytics', 'Dedicated support + onboarding'], cta: 'I want 50 vouchers' },
    },
    faq: {
      title: 'Frequently asked questions',
      items: [
        { q: 'Is the app and test free?', a: 'Downloading the app and completing the test is 100% free. The complete occupational PDF report with detailed insights and recommendations is available as an in-app purchase or via institutional vouchers.' },
        { q: 'How long does the test take?', a: '10 minutes maximum. The visual card sorting system keeps the experience engaging and efficient.' },
        { q: 'How do institutional vouchers work?', a: 'Schools and counselors can purchase voucher bundles for students to unlock the full report without individual charges.' },
        { q: 'Where is it available?', a: 'The app is available on Google Play. It works offline and syncs automatically when reconnected.' },
      ],
    },
    finalCta: {
      title: 'Your future starts here',
      subtitle: 'Download the app for free, complete the 10-minute test and discover your occupational profile.',
      googlePlay: 'Download on Google Play',
      webVersion: 'Web version',
      qrLabel: 'Scan with your phone to download',
      qrSublabel: 'Available for free on Google Play',
    },
    footer: {
      contact: 'Contact',
      privacy: 'Privacy',
      terms: 'Terms',
      copyright: 'Your future starts here.',
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
        { value: 'Free App', label: 'free download · paid report' },
      ]
    },
    socialProof: {
      badge: 'OCCUPATIONAL TEST',
      title: 'What early testers are saying',
      testimonials: [
        { quote: 'No endless questionnaires: it is straightforward, dynamic, and gives you clear insights in minutes.', author: 'Student (16-18 y/o)', role: 'User Evaluation' },
        { quote: 'Choosing images freely without preset career biases makes the test intuitive and engaging.', author: 'User (25-30 y/o)', role: 'User Evaluation' },
        { quote: 'The swipe format is clear and takes very little time. It gives you exactly what you need.', author: 'User (31-35 y/o)', role: 'User Evaluation' },
        { quote: 'Easy to use and gives accurate results to plan your next educational or occupational steps.', author: 'High School Student', role: 'User Evaluation' },
      ],
    },
    langSwitch: 'ES',
  },
};

export type Locale = keyof typeof translations;
export type Translation = typeof translations.es;
