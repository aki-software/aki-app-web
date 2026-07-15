export const translations = {
  es: {
    nav: {
      howItWorks: 'Cómo funciona',
      forInstitutions: 'Para instituciones',
      pricing: 'Precios',
      login: 'Ingresar',
      startFree: 'Acceso a instituciones',
    },
    hero: {
      badge: 'Orientación Vocacional',
      title: 'Descubrí tu vocación',
      titleAccent: 'en minutos',
      subtitle: 'Deslizá imágenes de actividades y descubrí tus afinidades vocacionales al instante. Un test visual y dinámico que revela tu perfil y las carreras que mejor van con vos.',
      ctaPrimary: 'Soy Estudiante (Descargar App)',
      ctaSecondary: 'Soy una Institución',
      qrLabel: 'Escaneá para descargar',
      qrSublabel: 'Disponible en Google Play',
      phoneTitle: '¿Qué te interesa?',
      phoneTag: 'CREATIVIDAD',
      phoneProgress: '12 de 120',
      cards: [
        { code: 'ART', image: '/images/cards/art_1.webp', title: 'Diseñar y crear\nobjetos visuales', sub: 'Usar colores, formas y materiales para expresar ideas' },
        { code: 'SCI', image: '/images/cards/sci_1.webp', title: 'Investigar y\ndescubrir', sub: 'Explorar fenómenos, hacer experimentos y buscar respuestas' },
        { code: 'SERV', image: '/images/cards/serv_1.webp', title: 'Ayudar y\ncuidar', sub: 'Trabajar con personas para mejorar su bienestar y calidad de vida' },
        { code: 'MEC', image: '/images/cards/mech_1.webp', title: 'Construir y\nreparar', sub: 'Operar máquinas, herramientas y sistemas técnicos' },
        { code: 'BUS', image: '/images/cards/bus_1.webp', title: 'Gestionar y\nliderar', sub: 'Organizar recursos, tomar decisiones y dirigir equipos' },
        { code: 'NAT', image: '/images/cards/nat_10.webp', title: 'Explorar la\nnaturaleza', sub: 'Trabajar al aire libre y proteger el medio ambiente' },
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
        { code: 'SERV', name: 'Servicio Social' },
        { code: 'PROT', name: 'Protección y Seguridad' },
        { code: 'FÍS', name: 'Deportes y Actividad Física' },
        { code: 'IND', name: 'Industria' },
        { code: 'MEC', name: 'Mecánica' },
        { code: 'NAT', name: 'Naturaleza' },
        { code: 'LÍD', name: 'Liderazgo' },
        { code: 'SCI', name: 'Ciencia' },
        { code: 'VENT', name: 'Ventas' },
        { code: 'BUS', name: 'Negocios' },
      ],
    },
    problem: {
      title: '¿No sabés qué estudiar?',
      cards: [
        { title: 'Miles de carreras y ninguna certeza', desc: 'Elegir mal cuesta tiempo, plata y frustración. No tiene que ser así.' },
        { title: 'Tests aburridos de 200 preguntas', desc: 'Nadie quiere contestar cuestionarios eternos. Nuestro test es ágil y visual.' },
        { title: 'Orientación cara y para pocos', desc: 'La orientación vocacional debería ser accesible para todos.' },
      ],
    },
    howItWorks: {
      title: 'Cómo funciona',
      subtitle: 'Descubrí cómo A.ki transforma la orientación vocacional.',
      tabs: { student: 'Para Estudiantes', institution: 'Para Instituciones' },
      studentSteps: [
        { title: 'Clasificá imágenes', desc: 'Pasá las imágenes de actividades hacia la derecha si te interesan o hacia la izquierda para descartarlas. Cada swipe refleja tus gustos espontáneos sin filtros.' },
        { title: 'Descubrí tu perfil', desc: 'El sistema analiza tus elecciones y calcula tu perfil vocacional con las áreas que más se alinean a tus intereses.' },
        { title: 'Recibí tu reporte', desc: 'Obtené un PDF detallado con recomendaciones de carreras directamente en tu email, basado en tus afinidades reales.' },
      ],
      institutionSteps: [
        { title: 'Solicitá acceso', desc: 'Obtené tu cuenta para el Dashboard Institucional de A.ki.' },
        { title: 'Generá vouchers', desc: 'Creá códigos únicos para que tus estudiantes accedan al reporte completo gratis.' },
        { title: 'Monitoreá en vivo', desc: 'Accedé a analíticas de grupo en tiempo real y descargá reportes detallados en un clic.' },
      ],
    },
    features: {
      title: 'Todo lo que necesitás',
      items: [
        { title: 'Funciona offline', desc: 'Hacé el test sin conexión. Se sincroniza cuando volvés a tener internet.' },
        { title: 'Accesibilidad integrada', desc: 'TTS, alto contraste, lectura fácil y velocidad de swipe ajustable.' },
        { title: 'Español e Inglés', desc: 'Disponible en ambos idiomas para llegar a más personas.' },
        { title: 'Reporte PDF profesional', desc: 'Perfil vocacional detallado con gráficos y recomendaciones.' },
        { title: 'Datos seguros', desc: 'Base de datos encriptada. Tu información está protegida.' },
        { title: 'Recomendaciones personalizadas', desc: 'Carreras sugeridas basadas en tu perfil único de afinidades.' },
      ],
    },
    institutions: {
      badge: 'Para instituciones',
      title: '¿Trabajás en una escuela\no sos orientador?',
      desc: 'Gestioná grupos de estudiantes, generá vouchers y accedé a analytics en tiempo real. Todo desde un dashboard intuitivo.',
      features: ['Gestión de grupos y sesiones masivas', 'Dashboard con analytics por institución', 'Vouchers y reportes personalizados'],
      cta: 'Solicitar una demo',
      form: { name: 'Nombre', email: 'Email', institution: 'Institución', message: 'Contanos qué necesitás', submit: 'Enviar solicitud', success: 'Gracias por tu interés. Te vamos a contactar a la brevedad.' },
      dashboard: 'Dashboard',
      stats: { tests: 'Tests completados', completion: 'Completitud', reports: 'Reportes' },
      chart: '📊 Distribución de Perfiles Vocacionales',
    },
    pricing: {
      title: 'Planes Institucionales',
      subtitle: 'Llevá la orientación vocacional a tu colegio o consultorio.',
      demo: { badge: 'Demo', label: 'A.ki Demo', desc: 'Para probar la plataforma', features: ['Acceso al Dashboard Web', '3 vouchers gratis', 'Analíticas básicas', 'Soporte por email'], cta: 'Solicitar Demo' },
      basic: { badge: '25', label: 'A.ki 25', price: 'A convenir', desc: 'Para colegios y orientadores', features: ['25 vouchers', 'Dashboard completo', 'Analíticas detalladas', 'Soporte prioritario'], cta: 'Quiero 25 vouchers' },
      pro: { badge: '50', label: 'A.ki 50', price: 'A convenir', desc: 'Para instituciones y distritos', features: ['50 vouchers', 'Dashboard completo', 'Analíticas de cohortes', 'Soporte dedicado + onboarding'], cta: 'Quiero 50 vouchers' },
    },
    faq: {
      title: 'Preguntas frecuentes',
      items: [
        { q: '¿El test es realmente gratis?', a: 'Sí. El test vocacional completo es 100% gratuito. Solo el reporte PDF detallado con recomendaciones de carreras requiere un voucher o pago en la app.' },
        { q: '¿Cuánto tarda el test?', a: 'Entre 8 y 12 minutos. Es mucho más rápido que un test tradicional porque usa una interfaz visual de tarjetas que hace el proceso ágil y entretenido.' },
        { q: '¿Cómo funcionan los vouchers?', a: 'Las instituciones (escuelas, orientadores) pueden generar códigos de voucher para que sus estudiantes accedan al reporte completo sin costo individual. También podés comprar acceso directamente en la app.' },
        { q: '¿Está disponible en mi país?', a: 'Sí. La app está disponible en Google Play para todos los países de habla hispana. El test funciona offline, así que no necesitás conexión constante.' },
      ],
    },
    finalCta: {
      title: 'Tu futuro comienza aquí',
      subtitle: 'Empezá el test ahora y descubrí qué carreras van con vos.',
      googlePlay: 'Google Play',
      webVersion: 'Versión web',
      qrLabel: 'Escaneá para descargar',
      qrSublabel: 'Disponible en Google Play',
    },
    footer: {
      contact: 'Contacto',
      privacy: 'Privacidad',
      terms: 'Términos',
      copyright: 'Tu futuro comienza aquí.',
    },
    maintenance: {
      badge: 'Próximamente',
      title: 'Diseñando el futuro de la orientación vocacional',
      subtitle: 'Estamos preparando una experiencia revolucionaria para ayudarte a encontrar tu camino profesional con inteligencia artificial. Muy pronto vas a poder descargar la app y acceder al dashboard.',
      ctaContact: 'Consultas o Instituciones',
      footer: '© 2026 A.ki. Todos los derechos reservados.',
    },
    statsBar: {
      items: [
        { value: '12', label: 'categorías vocacionales' },
        { value: '10 min', label: 'de test dinámico' },
        { value: '100%', label: 'gratis, siempre' },
      ]
    },
    socialProof: {
      title: 'Confían en A.KI',
      testimonials: [
        { quote: 'Me ayudó a descubrir qué quería estudiar cuando estaba completamente perdido. El test es súper ágil y divertido.', author: 'Martina G.', role: 'Estudiante, Buenos Aires' },
        { quote: 'Usamos A.KI con nuestros alumnos de 5to año. La orientación vocacional les dio claridad y a nosotros datos valiosos.', author: 'Lic. Fernando R.', role: 'Orientador, Colegio San Martín' },
      ],
      badge: 'TEST VOCACIONAL',
      userCount: '+5,000 estudiantes',
    },
    langSwitch: 'EN',
  },
  en: {
    nav: {
      howItWorks: 'How it works',
      forInstitutions: 'For institutions',
      pricing: 'Pricing',
      login: 'Sign in',
      startFree: 'Access for institutions',
    },
    hero: {
      badge: 'Vocational Guidance',
      title: 'Discover your vocation',
      titleAccent: 'in minutes',
      subtitle: 'Swipe through activity images and discover your vocational affinities instantly. A visual, dynamic test that reveals your profile and the careers that match you best.',
      ctaPrimary: 'Download the App',
      ctaSecondary: 'Access for Institutions',
      qrLabel: 'Scan to download',
      qrSublabel: 'Available on Google Play',
      phoneTitle: 'What interests you?',
      phoneTag: 'CREATIVITY',
      phoneProgress: '12 of 120',
      cards: [
        { code: 'ART', image: '/images/cards/art_1.webp', title: 'Design and create\nvisual objects', sub: 'Use colors, shapes and materials to express ideas' },
        { code: 'SCI', image: '/images/cards/sci_1.webp', title: 'Research and\ndiscover', sub: 'Explore phenomena, run experiments, and find answers' },
        { code: 'SERV', image: '/images/cards/serv_1.webp', title: 'Help and\ncare', sub: 'Work with people to improve their well-being and quality of life' },
        { code: 'MEC', image: '/images/cards/mech_1.webp', title: 'Build and\nrepair', sub: 'Operate machines, tools, and technical systems' },
        { code: 'BUS', image: '/images/cards/bus_1.webp', title: 'Manage and\nlead', sub: 'Organize resources, make decisions, and lead teams' },
        { code: 'NAT', image: '/images/cards/nat_10.webp', title: 'Explore\nnature', sub: 'Work outdoors and protect the environment' },
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
        { code: 'SERV', name: 'Social Service' },
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
      title: "Don't know what to study?",
      cards: [
        { title: 'Thousands of careers and no certainty', desc: 'Choosing wrong costs time, money and frustration. It doesn\'t have to be that way.' },
        { title: 'Boring 200-question tests', desc: 'Nobody wants to answer endless questionnaires. Our test is agile and visual.' },
        { title: 'Expensive guidance for a few', desc: 'Vocational guidance should be accessible to everyone.' },
      ],
    },
    howItWorks: {
      title: 'How it works',
      subtitle: 'Discover how A.ki transforms vocational guidance.',
      tabs: { student: 'For Students', institution: 'For Institutions' },
      studentSteps: [
        { title: 'Swipe through images', desc: 'Swipe activity images right if you like them or left to skip. Each swipe captures your spontaneous interests without overthinking.' },
        { title: 'Discover your profile', desc: 'The system analyzes your choices and calculates your vocational profile based on the areas that align with your interests.' },
        { title: 'Receive your report', desc: 'Get a detailed PDF report with career recommendations sent to your email, based on your real affinities.' },
      ],
      institutionSteps: [
        { title: 'Request access', desc: 'Get your account for the custom A.ki Institutional Dashboard.' },
        { title: 'Generate vouchers', desc: 'Create unique codes so your students can access the full report at no cost.' },
        { title: 'Monitor in real-time', desc: 'Access group analytics instantly and download detailed reports in one click.' },
      ],
    },
    features: {
      title: 'Everything you need',
      items: [
        { title: 'Works offline', desc: 'Take the test without connection. It syncs when you\'re back online.' },
        { title: 'Built-in accessibility', desc: 'TTS, high contrast, easy reading and adjustable swipe speed.' },
        { title: 'Spanish and English', desc: 'Available in both languages to reach more people.' },
        { title: 'Professional PDF report', desc: 'Detailed vocational profile with charts and recommendations.' },
        { title: 'Secure data', desc: 'Encrypted database. Your information is protected.' },
        { title: 'Personalized recommendations', desc: 'Suggested careers based on your unique affinity profile.' },
      ],
    },
    institutions: {
      badge: 'For institutions',
      title: 'Do you work at a school\nor are you a therapist?',
      desc: 'Manage student groups, generate vouchers and access real-time analytics. All from an intuitive dashboard.',
      features: ['Group and mass session management', 'Per-institution analytics dashboard', 'Custom vouchers and reports'],
      cta: 'Request a demo',
      form: { name: 'Name', email: 'Email', institution: 'Institution', message: 'Tell us what you need', submit: 'Send request', success: 'Thanks for your interest. We will contact you shortly.' },
      dashboard: 'Dashboard',
      stats: { tests: 'Tests completed', completion: 'Completion rate', reports: 'Reports' },
      chart: '📊 Vocational Profile Distribution',
    },
    pricing: {
      title: 'Institutional Plans',
      subtitle: 'Bring vocational guidance to your school or private practice.',
      demo: { badge: 'Demo', label: 'A.ki Demo', desc: 'Try the platform', features: ['Web Dashboard Access', '3 free vouchers', 'Basic analytics', 'Email support'], cta: 'Request Demo' },
      basic: { badge: '25', label: 'A.ki 25', price: 'Custom', desc: 'For schools and counselors', features: ['25 vouchers', 'Full dashboard', 'Detailed analytics', 'Priority support'], cta: 'I want 25 vouchers' },
      pro: { badge: '50', label: 'A.ki 50', price: 'Custom', desc: 'For institutions and districts', features: ['50 vouchers', 'Full dashboard', 'Cohort analytics', 'Dedicated support + onboarding'], cta: 'I want 50 vouchers' },
    },
    faq: {
      title: 'Frequently asked questions',
      items: [
        { q: 'Is the test really free?', a: 'Yes. The complete vocational test is 100% free. Only the detailed PDF report with career recommendations requires a voucher or in-app payment.' },
        { q: 'How long does the test take?', a: 'Between 8 and 12 minutes. It\'s much faster than a traditional test because it uses a visual card interface that makes the process agile and engaging.' },
        { q: 'How do vouchers work?', a: 'Institutions (schools, therapists) can generate voucher codes so their students can access the full report at no individual cost. You can also purchase access directly in the app.' },
        { q: 'Is it available in my country?', a: 'Yes. The app is available on Google Play for all Spanish-speaking countries. The test works offline, so you don\'t need a constant connection.' },
      ],
    },
    finalCta: {
      title: 'Your future starts here',
      subtitle: 'Start the test now and discover which careers match you.',
      googlePlay: 'Google Play',
      webVersion: 'Web version',
      qrLabel: 'Scan to download',
      qrSublabel: 'Available on Google Play',
    },
    footer: {
      contact: 'Contact',
      privacy: 'Privacy',
      terms: 'Terms',
      copyright: 'Your future starts here.',
    },
    maintenance: {
      badge: 'Coming Soon',
      title: 'Designing the future of vocational guidance',
      subtitle: 'We are preparing a revolutionary experience to help you find your career path with artificial intelligence. Very soon you will be able to download the app and access the dashboard.',
      ctaContact: 'Inquiries & Institutions',
      footer: '© 2026 A.ki. All rights reserved.',
    },
    statsBar: {
      items: [
        { value: '12', label: 'vocational categories' },
        { value: '10 min', label: 'dynamic test' },
        { value: '100%', label: 'free, always' },
      ]
    },
    socialProof: {
      title: 'Trusted by students & educators',
      testimonials: [
        { quote: 'It helped me discover what I wanted to study when I was completely lost. The test is super agile and fun.', author: 'Martina G.', role: 'Student, Buenos Aires' },
        { quote: "We use A.KI with our 5th-year students. Vocational guidance gave them clarity and us valuable data.", author: 'Lic. Fernando R.', role: 'Counselor, San Martín School' },
      ],
      badge: 'VOCATIONAL TEST',
      userCount: '+5,000 students',
    },
    langSwitch: 'ES',
  },
};

export type Locale = keyof typeof translations;
export type Translation = typeof translations.es;
