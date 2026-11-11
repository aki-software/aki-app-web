import type { Locale } from './translations';

export interface LegalSection {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface LegalDocumentContent {
  slug: 'privacidad' | 'terminos' | 'borrar-cuenta';
  title: string;
  subtitle: string;
  updatedAt: string;
  tocTitle: string;
  quickNavLabel: string;
  contactBox: {
    title: string;
    description: string;
    emailLabel: string;
    emailSubject: string;
    whatsappLabel: string;
    whatsappText: string;
  };
  sections: LegalSection[];
}

export const WHATSAPP_NUMBER = '5491159899962';
export const WHATSAPP_DISPLAY = '+54 9 11 5989-9962';
export const CONTACT_EMAIL = 'contacto@orientaki.com';

export function buildWhatsAppUrl(text: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

export const legalContent: Record<Locale, Record<'privacy' | 'terms' | 'deleteAccount', LegalDocumentContent>> = {
  es: {
    privacy: {
      slug: 'privacidad',
      title: 'Política de Privacidad',
      subtitle:
        'Cómo recopilamos, protegemos y tratamos la información personal y vocacional en la aplicación móvil Android de Orient A.KI, la plataforma web para profesionales e instituciones y nuestro sitio público.',
      updatedAt: 'Última actualización: 11 de noviembre de 2026',
      tocTitle: 'Contenido del documento',
      quickNavLabel: 'Documentación legal',
      contactBox: {
        title: '¿Tenés consultas sobre privacidad o protección de datos?',
        description:
          'Podés escribirnos directamente por correo electrónico o WhatsApp para ejercer tus derechos de acceso, rectificación, actualización o supresión de datos.',
        emailLabel: 'Escribir a contacto@orientaki.com',
        emailSubject: 'Consulta de Privacidad - Orient A.KI',
        whatsappLabel: 'Consultar por WhatsApp',
        whatsappText: 'Hola, tengo una consulta sobre la Política de Privacidad y mis datos en Orient A.KI.',
      },
      sections: [
        {
          id: 'alcance-ecosistema',
          title: '1. Responsable del tratamiento y alcance del ecosistema',
          paragraphs: [
            'ORIENT A.KI (A.kit Platform) es una herramienta digital e integral de orientación vocacional-ocupacional desarrollada bajo la dirección profesional de la Lic. Paula Carolina Cardoso (Licenciada en Terapia Ocupacional, Especialista en Orientación Vocacional Ocupacional y Rehabilitación Profesional).',
            'El ecosistema está compuesto por tres superficies conectadas a una infraestructura central segura: (a) la aplicación móvil para Android disponible en Google Play para estudiantes y consultantes individuales, (b) la plataforma web (Dashboard) destinada a terapeutas particulares, administradores institucionales y colaboradores de equipos psicopedagógicos, y (c) el sitio web público informativo.',
            'Esta Política de Privacidad aplica a todas las personas que interactúan con cualquiera de estas superficies, en cumplimiento de la Ley N.º 25.326 de Protección de los Datos Personales de la República Argentina, estándares internacionales de privacidad y los requisitos de Seguridad de Datos (Data Safety) de Google Play.'
          ]
        },
        {
          id: 'datos-app-android',
          title: '2. Datos recopilados en la Aplicación Móvil (Android)',
          paragraphs: [
            'Cuando un estudiante o usuario individual utiliza la aplicación móvil de Orient A.KI en Android, recopilamos únicamente la información necesaria para ejecutar el cotejo ocupacional, sincronizar su progreso y generar su informe personalizado:'
          ],
          bullets: [
            'Datos de identificación y perfil: nombre y apellido, edad o fecha de nacimiento, género (opcional), provincia o localidad, dirección de correo electrónico e identificadores de autenticación.',
            'Respuestas e interacciones de evaluación: las elecciones visuales de selección y descarte brindadas durante el cotejo ocupacional a lo largo de las 12 categorías (Artística, Humanidades, Servicios, Protección, Actividad Física, Industria, Mecánica, Naturaleza, Liderazgo, Ciencia, Ventas y Negocios), fecha y tiempo de uso, historial de evaluaciones y resultados obtenidos.',
            'Datos técnicos y preferencias de accesibilidad: tipo de dispositivo, sistema operativo, versión de la aplicación y ajustes locales de lectura por voz (TTS), modo de alto contraste, velocidad de deslizamiento e idioma (español o inglés).',
            'Almacenamiento offline y sincronización: la app permite realizar el test sin conexión a internet guardando temporalmente las respuestas en el dispositivo encriptado y sincronizándolas con la API central al recuperar conectividad.',
            'Vouchers y desbloqueo de reportes: códigos de voucher institucionales o profesionales canjeados por el usuario, o comprobantes de transacción emitidos por Google Play Billing para compras individuales. Orient A.KI no almacena ni procesa directamente números de tarjetas de crédito o débito.'
          ]
        },
        {
          id: 'datos-plataforma-web',
          title: '3. Datos recopilados en la Plataforma Web y Sitio Público',
          paragraphs: [
            'En la plataforma web para profesionales e instituciones y en los formularios de solicitud de acceso del sitio público, tratamos información vinculada a la gestión profesional y operativa:'
          ],
          bullets: [
            'Solicitudes de acceso comercial: nombre de contacto, correo electrónico profesional o institucional, nombre del consultorio o institución y plan de interés enviado a través del formulario de contacto.',
            'Cuentas profesionales e institucionales: credenciales, rol asignado (Administrador de Institución, Terapeuta Particular o Colaborador Institucional) y alcance (scope) sobre la institución o cartera de consultantes.',
            'Gestión operativa y trazabilidad: lotes de vouchers adquiridos y asignados, estado de avance de cohortes o sesiones evaluativas, métricas agregadas de participación y registros de auditoría sobre la generación y descarga de reportes PDF autorizados.'
          ]
        },
        {
          id: 'visibilidad-consentimiento',
          title: '4. Visibilidad de resultados, roles y límites de acceso',
          paragraphs: [
            'La arquitectura de Orient A.KI separa estrictamente la identidad del usuario, el alcance institucional y los permisos de lectura sobre los informes vocacionales:'
          ],
          bullets: [
            'Usuarios individuales (B2C): quien descarga la app y adquiere su informe de manera particular mantiene acceso exclusivo a sus resultados y a su reporte PDF.',
            'Programas institucionales y práctica profesional (B2B): cuando un estudiante o consultante realiza la evaluación utilizando un voucher provisto por su institución educativa o terapeuta orientador —o otorga autorización expresa—, el profesional o equipo psicopedagógico autorizado dentro de esa institución puede visualizar el estado de finalización y acceder al reporte vocacional correspondiente para brindar acompañamiento.',
            'Aislamiento entre instituciones: ninguna institución ni terapeuta puede visualizar sesiones, métricas ni reportes pertenecientes a otra institución o profesional.'
          ]
        },
        {
          id: 'seguridad-retencion',
          title: '5. Seguridad, almacenamiento privado y conservación',
          paragraphs: [
            'Todas las comunicaciones entre la aplicación Android, el navegador web y nuestros servidores se realizan mediante conexiones cifradas (HTTPS/TLS). Las contraseñas se resguardan mediante algoritmos de hash criptográfico irreversibles y los reportes vocacionales en formato PDF se alojan en almacenamiento privado con controles de acceso autenticados y enlaces de descarga temporales.',
            'Conservamos los datos personales mientras la cuenta permanezca activa o sea necesario para prestar el servicio de orientación vocacional y cumplir obligaciones legales. No vendemos, alquilamos ni cedemos datos personales de estudiantes ni de profesionales a terceros con fines publicitarios.'
          ]
        },
        {
          id: 'derechos-eliminacion',
          title: '6. Menores de edad, derechos del titular y autoridad de aplicación',
          paragraphs: [
            'Datos de menores de edad: Orient A.KI puede ser utilizada por adolescentes en edad escolar. Cuando el usuario sea menor de edad y la legislación aplicable lo requiera, la utilización deberá realizarse con la autorización de su madre, padre, tutor, representante legal o institución educativa interviniente.',
            'Derechos del usuario y eliminación de cuenta: como titular de tus datos personales, podés solicitar en cualquier momento el acceso, la rectificación, la actualización, la revocación del consentimiento o la supresión definitiva de tu cuenta y evaluaciones a través de nuestra página de Eliminación de Cuenta (/borrar-cuenta) o escribiendo a contacto@orientaki.com (procesamiento máximo en 7 días hábiles).',
            'Autoridad de aplicación: en la República Argentina, la autoridad de aplicación en materia de protección de datos personales (Ley N.º 25.326) es la Agencia de Acceso a la Información Pública (AAIP).'
          ]
        }
      ]
    },
    terms: {
      slug: 'terminos',
      title: 'Términos y Condiciones de Uso',
      subtitle:
        'Condiciones que regulan el uso de la aplicación móvil Android de Orient A.KI, la plataforma web para terapeutas e instituciones educativas y los servicios asociados.',
      updatedAt: 'Última actualización: 11 de noviembre de 2026',
      tocTitle: 'Contenido del documento',
      quickNavLabel: 'Documentación legal',
      contactBox: {
        title: '¿Necesitás aclarar algún punto sobre los términos o planes?',
        description:
          'Nuestro equipo atiende consultas de colegios, universidades, gabinetes psicopedagógicos, terapeutas particulares y usuarios de la aplicación móvil.',
        emailLabel: 'Contactar por correo',
        emailSubject: 'Consulta sobre Términos y Condiciones - Orient A.KI',
        whatsappLabel: 'Hablar por WhatsApp',
        whatsappText: 'Hola, me gustaría hacer una consulta sobre los Términos y Condiciones y planes de Orient A.KI.',
      },
      sections: [
        {
          id: 'aceptacion-objeto',
          title: '1. Aceptación y descripción del servicio',
          paragraphs: [
            'Los presentes Términos y Condiciones regulan el acceso y uso del ecosistema Orient A.KI (A.kit Platform), integrado por la aplicación móvil para dispositivos Android, el panel web para profesionales e instituciones y el sitio web público.',
            'Al descargar o utilizar la aplicación móvil, o al acceder a una cuenta profesional o institucional en la plataforma web, aceptás estos términos. Si actuás en representación de una institución educativa o gabinete psicopedagógico, declarás contar con facultades suficientes para vincular a dicha entidad.'
          ]
        },
        {
          id: 'naturaleza-orientacion',
          title: '2. Naturaleza pedagógica y alcance de los reportes',
          paragraphs: [
            'Orient A.KI provee un instrumento interactivo de exploración de intereses ocupacionales basado en la clasificación visual de actividades dentro de 12 dimensiones vocacionales, junto con reportes en PDF que sintetizan afinidades y sugerencias formativas u ocupacionales.',
            'Los resultados y reportes generados por la plataforma constituyen una herramienta de apoyo psicopedagógico y de orientación vocacional. En ningún caso reemplazan el juicio clínico de un profesional matriculado, ni constituyen un diagnóstico psicológico, psiquiátrico, médico ni una garantía de admisión académica o inserción laboral.'
          ]
        },
        {
          id: 'cuentas-roles',
          title: '3. Modalidades de acceso, cuentas y roles',
          paragraphs: [
            'El ecosistema distingue dos recorridos complementarios con reglas de acceso específicas:'
          ],
          bullets: [
            'Usuarios individuales y estudiantes (App Android): la descarga de la aplicación desde Google Play y la realización del test interactivo son gratuitas. El acceso al informe ocupacional completo en PDF puede obtenerse mediante compra dentro de la aplicación (Google Play Billing) o canjeando un código de voucher provisto por una institución o profesional.',
            'Terapeutas particulares e instituciones (Plataforma Web): el acceso al panel web profesional se coordina con el equipo de Orient A.KI y se habilita por invitación administrativa. El envío del formulario público de solicitud de acceso manifiesta interés comercial y no activa automáticamente una cuenta.',
            'Responsabilidad sobre credenciales y permisos: los titulares de cuentas profesionales (Administrador Institucional, Terapeuta Particular y Colaborador Institucional) son responsables de mantener la confidencialidad de sus credenciales y de utilizar los reportes de sus estudiantes o consultantes exclusivamente con fines de orientación autorizados.'
          ]
        },
        {
          id: 'vouchers-compras',
          title: '4. Vouchers institucionales, planes y pagos',
          paragraphs: [
            'Los planes profesionales e institucionales (incluyendo Plan Demo, Plan Δ-AKI, Plan Σ-AKI y Plan Π-AKI) otorgan lotes de vouchers y acceso al Dashboard según las condiciones acordadas con cada profesional o institución:'
          ],
          bullets: [
            'Cada voucher permite desbloquear el reporte ocupacional asociado a la evaluación de un estudiante o consultante dentro del plazo de vigencia del lote.',
            'Los códigos de voucher adquiridos por una institución o terapeuta están destinados al uso dentro de su práctica o comunidad educativa y no pueden revenderse de forma independiente a terceros no autorizados.',
            'Las compras individuales realizadas por usuarios finales dentro de la aplicación Android se procesan a través de Google Play y se rigen por las políticas de facturación y reembolso de Google Play Store.'
          ]
        },
        {
          id: 'propiedad-intelectual',
          title: '5. Propiedad intelectual y uso aceptable',
          paragraphs: [
            'Todo el software, diseño de interfaz, logotipos, ilustraciones de tarjetas ocupacionales, estructura de las 12 dimensiones, algoritmos de cálculo de perfil y plantillas de reportes PDF son propiedad exclusiva de Orient A.KI o de sus licenciantes.',
            'Queda prohibido copiar, extraer masivamente las tarjetas visuales, realizar ingeniería inversa, eludir controles de autenticación o utilizar la plataforma para fines ilícitos o contrarios a la integridad de los estudiantes y usuarios.'
          ]
        },
        {
          id: 'disponibilidad-baja',
          title: '6. Disponibilidad, modificaciones y baja del servicio',
          paragraphs: [
            'Orient A.KI procura mantener la disponibilidad continua de la API, el panel web y la sincronización móvil, pudiendo realizar actualizaciones técnicas o mejoras de seguridad. La aplicación Android cuenta con soporte offline para la toma del test, requiriendo conexión a internet para sincronizar resultados y descargar el informe en PDF.',
            'El usuario puede dejar de utilizar el servicio y solicitar la eliminación definitiva de su cuenta y sus datos en cualquier momento a través de /borrar-cuenta o escribiendo a contacto@orientaki.com.'
          ]
        }
      ]
    },
    deleteAccount: {
      slug: 'borrar-cuenta',
      title: 'Eliminación de Cuenta y Datos',
      subtitle:
        'Procedimiento claro y directo para solicitar la baja definitiva de tu cuenta y el borrado de tus datos personales y vocacionales en la app Android y en la plataforma web de Orient A.KI.',
      updatedAt: 'Política de Seguridad de Datos (Google Play Data Safety & Web)',
      tocTitle: 'Pasos y alcance',
      quickNavLabel: 'Documentación legal',
      contactBox: {
        title: 'Solicitar eliminación ahora',
        description:
          'Enviá tu solicitud desde el mismo correo electrónico con el que te registraste en la aplicación Android o en la plataforma web para que podamos validar tu titularidad sin demoras.',
        emailLabel: 'Solicitar baja por correo (contacto@orientaki.com)',
        emailSubject: 'Solicitud de eliminación de cuenta - Orient A.KI',
        whatsappLabel: 'Asistencia por WhatsApp',
        whatsappText: 'Hola, quiero solicitar la eliminación de mi cuenta y mis datos asociados en Orient A.KI.',
      },
      sections: [
        {
          id: 'como-solicitar',
          title: '1. ¿Cómo solicito la eliminación de mi cuenta?',
          paragraphs: [
            'En Orient A.KI respetamos tu privacidad y tu derecho a controlar tus datos personales tanto si sos estudiante o usuario de la aplicación móvil Android como si sos profesional o miembro de una institución en la plataforma web.',
            'Para solicitar la eliminación definitiva de tu cuenta y de todos tus datos asociados, envianos un correo electrónico a contacto@orientaki.com (o hacé clic en el botón de solicitud al final de esta página) cumpliendo estos dos pasos:'
          ],
          bullets: [
            'Escribinos desde la misma dirección de correo electrónico con la que creaste tu cuenta en la app Android o en la plataforma web, para validar tu identidad de forma segura.',
            'Indicá en el asunto o cuerpo del mensaje "Solicitud de eliminación de cuenta" y aclarás si se trata de una cuenta de usuario móvil (Android) o una cuenta profesional/institucional (Web).'
          ]
        },
        {
          id: 'datos-eliminados',
          title: '2. ¿Qué datos se eliminan de forma permanente?',
          paragraphs: [
            'Una vez verificada la titularidad de la solicitud, procedemos al borrado definitivo e irreversible de los siguientes registros en nuestra base de datos y almacenamiento privado:'
          ],
          bullets: [
            'Datos de perfil y credenciales de acceso (nombre, correo electrónico y tokens de sesión).',
            'Todas las sesiones del test vocacional, respuestas de tarjetas e historial de progreso sincronizado desde la app Android.',
            'Los perfiles ocupacionales calculados y los archivos de reportes vocacionales en PDF almacenados.',
            'Si además tenés la aplicación instalada en tu teléfono Android, podés desinstalarla o borrar los datos locales desde Ajustes del sistema para eliminar cualquier preferencia guardada offline en el dispositivo.'
          ]
        },
        {
          id: 'plazos-retencion',
          title: '3. Plazos de procesamiento y alcance institucional',
          paragraphs: [
            'El proceso completo de eliminación se ejecuta en un plazo máximo de 7 días hábiles desde la recepción de la solicitud validada, y te enviaremos una confirmación por correo electrónico apenas haya finalizado.',
            'En el caso de cuentas institucionales o vouchers canjeados dentro de un programa escolar, los datos personales identificatorios y los reportes individuales del usuario son eliminados por completo, conservándose únicamente registros contables o estadísticos agregados y anonimizados cuando la normativa aplicable así lo exija. El borrado es definitivo e irreversible.'
          ]
        }
      ]
    }
  },
  en: {
    privacy: {
      slug: 'privacidad',
      title: 'Privacy Policy',
      subtitle:
        'How we collect, protect, and process personal and vocational data across the Orient A.KI Android mobile app, the web platform for professionals and institutions, and our public website.',
      updatedAt: 'Last updated: November 11, 2026',
      tocTitle: 'Document contents',
      quickNavLabel: 'Legal documentation',
      contactBox: {
        title: 'Questions about privacy or data protection?',
        description:
          'Contact us directly via email or WhatsApp to exercise your rights to access, rectify, update, or permanently delete your personal data.',
        emailLabel: 'Email contacto@orientaki.com',
        emailSubject: 'Privacy Inquiry - Orient A.KI',
        whatsappLabel: 'Chat on WhatsApp',
        whatsappText: 'Hello, I have a question regarding the Privacy Policy and my data on Orient A.KI.',
      },
      sections: [
        {
          id: 'ecosystem-scope',
          title: '1. Data Controller and Ecosystem Scope',
          paragraphs: [
            'ORIENT A.KI (A.kit Platform) is a comprehensive digital vocational and occupational guidance ecosystem developed under the professional direction of Lic. Paula Carolina Cardoso (Licensed Occupational Therapist, Specialist in Vocational and Occupational Guidance and Professional Rehabilitation).',
            'The ecosystem comprises three connected surfaces backed by a central secure API: (a) the Android mobile application on Google Play for students and individual users, (b) the Web Platform (Dashboard) for private therapists, institutional administrators, and pedagogical team collaborators, and (c) the public informational website.',
            'This Privacy Policy governs all interactions across these surfaces in compliance with personal data protection regulations (including Argentine Law No. 25,326 and international privacy standards) as well as Google Play Data Safety requirements.'
          ]
        },
        {
          id: 'android-app-data',
          title: '2. Data Collected in the Mobile Application (Android)',
          paragraphs: [
            'When a student or individual user uses the Orient A.KI Android app, we collect only the information strictly required to run the occupational assessment, sync progress, and generate their personalized report:'
          ],
          bullets: [
            'Identification and profile data: full name, age or date of birth, gender (optional), province or locality, email address, and secure authentication identifiers.',
            'Assessment responses and interactions: visual card selections and discards across the 12 occupational dimensions (Arts, Humanities, Services, Protection, Physical Activity, Industry, Mechanics, Nature, Leadership, Science, Sales, and Business), session timestamps, evaluation history, and calculated results.',
            'Technical data and accessibility settings: device type, operating system, app version, and local preferences for text-to-speech (TTS), high-contrast mode, adjustable swipe speed, and language (Spanish or English).',
            'Offline storage and synchronization: the Android app allows taking the test offline by storing responses locally on the device and synchronizing them over HTTPS once connectivity is restored.',
            'Vouchers and report unlocking: institutional or professional voucher codes redeemed by the user, or purchase verification tokens provided by Google Play Billing for individual report purchases. Orient A.KI never stores or processes raw credit or debit card numbers.'
          ]
        },
        {
          id: 'web-platform-data',
          title: '3. Data Collected in the Web Platform and Public Site',
          paragraphs: [
            'On the web dashboard for professionals and institutions and through our public access request forms, we process operational and professional data:'
          ],
          bullets: [
            'Access requests: contact name, professional or institutional email, practice or institution name, and selected plan submitted through the public request form.',
            'Professional and institutional accounts: login credentials, assigned role (Institution Admin, Private Therapist, or Institutional Collaborator), and authorized institutional scope.',
            'Operational tracking: acquired and assigned voucher batches, cohort progress and completion metrics, and audit logs for authorized PDF report generation and downloads.'
          ]
        },
        {
          id: 'visibility-consent',
          title: '4. Result Visibility, Role Boundaries, and Consent',
          paragraphs: [
            'Orient A.KI enforces strict separation between user identity, institutional scope, and report access permissions:'
          ],
          bullets: [
            'Individual users (B2C): users who download the app and unlock their report independently retain exclusive access to their assessment results and PDF report.',
            'Institutional programs and professional practice (B2B): when a student or client completes the assessment using a voucher provided by their school, institution, or therapist—or grants explicit report authorization—authorized professionals within that specific scope may view completion status and access the corresponding vocational report to provide guidance.',
            'Cross-institution isolation: no institution or therapist can view sessions, metrics, or reports belonging to another institution or independent professional.'
          ]
        },
        {
          id: 'security-retention',
          title: '5. Security, Private Storage, and Data Retention',
          paragraphs: [
            'All traffic between the Android app, web browsers, and our servers is encrypted in transit via HTTPS/TLS. Passwords are protected using irreversible cryptographic hashing, and generated PDF vocational reports are stored in private cloud storage accessible only through authenticated, time-limited links.',
            'We retain personal data only while the account remains active or as needed to deliver the service and comply with legal obligations. We never sell, rent, or share student or professional personal data with third parties for advertising.'
          ]
        },
        {
          id: 'user-rights-deletion',
          title: '6. Minors, User Rights, Account Deletion, and Supervisory Authority',
          paragraphs: [
            'Minors: Orient A.KI may be used by high-school students and adolescents. Where required by applicable law, use by minors must be authorized by a parent, legal guardian, or participating educational institution.',
            'User rights and account deletion: you have the right to request access, correction, update, consent withdrawal, or permanent deletion of your account and all associated vocational records at any time via our Account Deletion page (/en/borrar-cuenta) or by emailing contacto@orientaki.com (completed within 7 business days).',
            'Supervisory authority: in the Argentine Republic, the data protection supervisory authority (Law No. 25,326) is the Agencia de Acceso a la Información Pública (AAIP).'
          ]
        }
      ]
    },
    terms: {
      slug: 'terminos',
      title: 'Terms and Conditions of Use',
      subtitle:
        'Terms governing the use of the Orient A.KI Android mobile application, the web platform for therapists and educational institutions, and associated services.',
      updatedAt: 'Last updated: November 11, 2026',
      tocTitle: 'Document contents',
      quickNavLabel: 'Legal documentation',
      contactBox: {
        title: 'Have questions about our Terms or institutional plans?',
        description:
          'Our team assists schools, universities, counseling departments, private therapists, and mobile app users.',
        emailLabel: 'Contact via Email',
        emailSubject: 'Terms & Conditions Inquiry - Orient A.KI',
        whatsappLabel: 'Chat on WhatsApp',
        whatsappText: 'Hello, I have a question regarding the Terms and Conditions and plans for Orient A.KI.',
      },
      sections: [
        {
          id: 'acceptance-scope',
          title: '1. Acceptance and Service Scope',
          paragraphs: [
            'These Terms and Conditions govern access to and use of the Orient A.KI (A.kit Platform) ecosystem, comprising the Android mobile application, the web dashboard for professionals and institutions, and the public website.',
            'By downloading or using the mobile app, or by accessing a professional or institutional account on the web platform, you agree to these terms. If you act on behalf of an educational institution or practice, you represent that you are authorized to bind that entity.'
          ]
        },
        {
          id: 'guidance-nature',
          title: '2. Educational Nature and Scope of Vocational Reports',
          paragraphs: [
            'Orient A.KI provides an interactive occupational interest exploration tool based on visual activity sorting across 12 vocational dimensions, together with PDF reports summarizing affinities and career/educational recommendations.',
            'All results and reports generated by the platform serve as psychopedagogical and vocational guidance support tools. They do not replace licensed clinical judgment and do not constitute a psychological, psychiatric, or medical diagnosis, nor a guarantee of academic admission or employment.'
          ]
        },
        {
          id: 'accounts-roles',
          title: '3. Access Model, Accounts, and Roles',
          paragraphs: [
            'The platform supports two complementary journeys with distinct access rules:'
          ],
          bullets: [
            'Individual users and students (Android App): downloading the app from Google Play and completing the interactive card-sorting test are free of charge. The full PDF occupational report can be unlocked via an in-app purchase (Google Play Billing) or by redeeming a voucher code provided by an institution or professional.',
            'Private therapists and institutions (Web Platform): access to the professional web dashboard is coordinated with the Orient A.KI team and provisioned via administrative invitation. Submitting the public access request form expresses commercial interest and does not automatically activate an account.',
            'Credential security and role compliance: professional account holders (Institution Admin, Private Therapist, and Institutional Collaborator) must keep their credentials confidential and use student or client reports strictly for authorized guidance purposes.'
          ]
        },
        {
          id: 'vouchers-billing',
          title: '4. Institutional Vouchers, Plans, and Payments',
          paragraphs: [
            'Professional and institutional plans (including Trial Demo, Δ-AKI, Σ-AKI, and Π-AKI plans) provide voucher batches and dashboard access according to the agreement established with each professional or institution:'
          ],
          bullets: [
            'Each voucher unlocks the full occupational PDF report associated with a student or client assessment within the batch validity period.',
            'Voucher codes acquired by an institution or therapist are intended exclusively for their practice or student cohort and may not be resold independently to unauthorized third parties.',
            'Individual in-app purchases made inside the Android mobile app are processed by Google Play and are governed by Google Play Store billing and refund policies.'
          ]
        },
        {
          id: 'intellectual-property',
          title: '5. Intellectual Property and Acceptable Use',
          paragraphs: [
            'All software, interface designs, logos, occupational stimulus card illustrations, the 12-dimension framework, profile calculation algorithms, and PDF report templates are the exclusive property of Orient A.KI or its licensors.',
            'Users may not copy, scrape stimulus cards, reverse engineer, bypass authentication controls, or use the platform in any manner that compromises security or student privacy.'
          ]
        },
        {
          id: 'availability-termination',
          title: '6. Service Availability and Account Termination',
          paragraphs: [
            'Orient A.KI strives to maintain continuous availability across the API, web dashboard, and mobile synchronization services. While the Android app supports offline test completion, an internet connection is required to synchronize results and download PDF reports.',
            'Users may discontinue use and request permanent deletion of their account and associated data at any time via /en/borrar-cuenta or by emailing contacto@orientaki.com.'
          ]
        }
      ]
    },
    deleteAccount: {
      slug: 'borrar-cuenta',
      title: 'Account & Data Deletion',
      subtitle:
        'Clear, step-by-step instructions to request permanent deletion of your account and personal/vocational data across the Orient A.KI Android app and web platform.',
      updatedAt: 'Data Safety Policy (Google Play Data Safety & Web)',
      tocTitle: 'Steps & scope',
      quickNavLabel: 'Legal documentation',
      contactBox: {
        title: 'Request account deletion now',
        description:
          'Send your request from the same email address you used to register in the Android app or web platform so we can verify ownership promptly.',
        emailLabel: 'Request deletion via email (contacto@orientaki.com)',
        emailSubject: 'Account Deletion Request - Orient A.KI',
        whatsappLabel: 'Support on WhatsApp',
        whatsappText: 'Hello, I would like to request the deletion of my account and associated data on Orient A.KI.',
      },
      sections: [
        {
          id: 'how-to-request',
          title: '1. How do I request account deletion?',
          paragraphs: [
            'At Orient A.KI we respect your privacy and your right to control your personal data—whether you are a student or individual user on the Android mobile app, or a therapist or institutional user on the web platform.',
            'To request permanent deletion of your account and all associated data, email us at contacto@orientaki.com (or use the action button below) following these two steps:'
          ],
          bullets: [
            'Send the email from the exact email address registered with your Orient A.KI Android app or Web Platform account so we can securely verify account ownership.',
            'Include "Account Deletion Request" in the subject line and indicate whether your account is a mobile app (Android) user account or a professional/institutional (Web) account.'
          ]
        },
        {
          id: 'deleted-data',
          title: '2. What data is permanently deleted?',
          paragraphs: [
            'Once ownership is verified, we permanently and irreversibly delete the following records from our active databases and private storage:'
          ],
          bullets: [
            'Profile details and authentication credentials (name, email address, and session tokens).',
            'All vocational test sessions, visual card responses, and progress history synchronized from the Android app.',
            'Calculated occupational profiles and generated PDF vocational reports stored in private storage.',
            'If you still have the Android app installed on your phone, you may also uninstall it or clear app storage in your device settings to remove any local offline preferences.'
          ]
        },
        {
          id: 'processing-time',
          title: '3. Processing Timeline and Institutional Scope',
          paragraphs: [
            'Verified deletion requests are completed within a maximum of 7 business days, and we will send an email confirmation as soon as the deletion is finalized.',
            'Where an assessment was completed using an institutional voucher, all personally identifiable user data and individual PDF reports are permanently deleted, retaining only anonymized aggregate counts or billing records strictly required by applicable law. This deletion process is permanent and irreversible.'
          ]
        }
      ]
    }
  }
};
