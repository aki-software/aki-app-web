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
        { title: 'Clasificá imágenes', desc: 'Elegís las imágenes que te gustan deslizando hacia la derecha o clickeando la tilde (<strong class="text-confirm font-bold text-base">✓</strong>), y descartás las que no te interesan deslizando a la izquierda o clickeando la equis (<strong class="text-destructive font-bold text-base">×</strong>).' },
        { title: 'Descubrí tu perfil', desc: 'El sistema analiza tus elecciones y calcula tu perfil ocupacional con las áreas que más se alinean a tus preferencias.' },
        { title: 'Obtené tu reporte', desc: 'Accedé a un PDF detallado con recomendaciones de carreras y ocupaciones basado en tus afinidades reales.' },
      ],
      institutionSteps: [
        { title: 'Solicitá acceso', desc: 'Obtené tu cuenta para acceder a la plataforma institucional de Orient A.KI.' },
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
      title: 'Si trabajás en una institución formativa\no sos orientador...',
      desc: 'Gestioná a tus estudiantes o consultantes, enviales pases de acceso y revisá sus resultados al instante. Todo desde una plataforma simple y fácil de usar.',
      features: ['Gestión de grupos y sesiones masivas', 'Panel de métricas institucionales en tiempo real', 'Vouchers y reportes personalizados'],
      cta: 'Solicitar una demo',
      form: { name: 'Nombre', email: 'Email', institution: 'Institución / Organización', submit: 'Solicitar demo', success: 'Gracias por tu interés. Te vamos a contactar a la brevedad.' },
      dashboard: 'Dashboard',
      stats: { tests: 'Tests completados', completion: 'Completitud', reports: 'Reportes' },
      chart: '📊 Distribución de Perfiles Ocupacionales',
    },
    pricing: {
      title: 'Planes Institucionales',
      subtitle: 'Llevá la orientación ocupacional a tu colegio o consultorio.',
      demo: { badge: 'Demo', label: 'Plan de Prueba', price: 'Consultar', desc: 'Comunicate con nosotros para conocer la plataforma.', features: ['Acceso guiado al Dashboard', 'Demostración de analíticas', 'Evaluación de viabilidad'], cta: 'Consultar por Demo' },
      basic: { badge: '25', label: 'Plan <span class="font-display font-black text-secondary text-2xl">Δ</span>-AKI', price: 'Consultar', desc: 'Ideal para grupos pequeños y orientadores independientes.', features: ['25 vouchers de acceso', 'Dashboard completo', 'Analíticas detalladas', 'Soporte prioritario'], cta: 'Consultar Plan Δ-AKI' },
      pro: { badge: '50', label: 'Plan <span class="font-display font-black text-primary text-2xl">Σ</span>-AKI', price: 'Consultar', desc: 'Pensado para instituciones y colegios medianos.', features: ['50 vouchers de acceso', 'Dashboard completo', 'Analíticas de cohortes', 'Soporte dedicado'], cta: 'Consultar Plan Σ-AKI' },
      enterprise: { badge: '1000', label: 'Plan <span class="font-display font-black text-text text-2xl">Π</span>-AKI', price: 'Consultar', desc: 'Licencia anual para distritos o grandes instituciones.', features: ['1000 vouchers durante 1 año', 'Acceso irrestricto al Dashboard', 'Reportes de impacto', 'Onboarding institucional'], cta: 'Consultar Plan Π-AKI' },
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
        { title: 'Swipe images', desc: 'Choose the images you like by swiping right or clicking the checkmark (<strong class="text-confirm font-bold text-base">✓</strong>), and discard the ones you don\'t by swiping left or clicking the cross (<strong class="text-destructive font-bold text-base">×</strong>).' },
        { title: 'Discover your profile', desc: 'The system analyzes your choices and calculates your occupational profile based on aligned areas.' },
        { title: 'Get your report', desc: 'Receive a detailed PDF report with career and occupation recommendations based on real affinities.' },
      ],
      institutionSteps: [
        { title: 'Request access', desc: 'Get your account for the custom A.ki institutional platform.' },
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
      title: 'If you work at an educational institution\nor are a counselor...',
      desc: 'Manage your students or clients, send them access passes, and review their results instantly. All from a simple and easy-to-use platform.',
      features: ['Group and mass session management', 'Real-time institutional metrics dashboard', 'Custom vouchers and reports'],
      cta: 'Request a demo',
      form: { name: 'Name', email: 'Email', institution: 'Institution / Organization', submit: 'Request Demo', success: 'Thanks for your interest. We will contact you shortly.' },
      dashboard: 'Dashboard',
      stats: { tests: 'Tests completed', completion: 'Completion rate', reports: 'Reports' },
      chart: '📊 Occupational Profile Distribution',
    },
    pricing: {
      title: 'Institutional Plans',
      subtitle: 'Bring occupational guidance to your school or private practice.',
      demo: { badge: 'Demo', label: 'Trial Plan', price: 'Contact Us', desc: 'Try the platform', features: ['Guided Dashboard access', 'Analytics demonstration', 'Feasibility evaluation'], cta: 'Contact for Demo' },
      basic: { badge: '25', label: 'Δ-AKI Plan', price: 'Contact Us', desc: 'Ideal for small groups and independent counselors.', features: ['25 access vouchers', 'Full dashboard', 'Detailed analytics', 'Priority support'], cta: 'Inquire Δ-AKI Plan' },
      pro: { badge: '50', label: 'Σ-AKI Plan', price: 'Contact Us', desc: 'Designed for institutions and mid-sized schools.', features: ['50 access vouchers', 'Full dashboard', 'Cohort analytics', 'Dedicated support'], cta: 'Inquire Σ-AKI Plan' },
      enterprise: { badge: '1000', label: 'Π-AKI Plan', price: 'Contact Us', desc: 'Annual license for districts or large schools.', features: ['1000 vouchers for 1 year', 'Unrestricted Dashboard access', 'Impact reports', 'Institutional onboarding'], cta: 'Inquire Π-AKI Plan' },
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
