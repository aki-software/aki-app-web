import { DataSource } from 'typeorm';
import { typeOrmConfig } from '../../config/typeorm.config';
import { VocationalCategory } from '../../categories/entities/vocational-category.entity';

const seedDatabase = async () => {
  const seedConfig = { ...typeOrmConfig, migrations: [] };
  const dataSource = new DataSource(seedConfig);

  try {
    console.log('🌱 Initializing Seeding Process...');
    await dataSource.initialize();

    const catRepo = dataSource.getRepository(VocationalCategory);

    console.log('📚 Loading Vocational Categories from text payload...');
    const catData = [
      {
        categoryId: 'ART',
        title: 'ARTÍSTICO',
        description: "Descripción breve: las personas con afinidad a esta área eligen ocupaciones vinculadas con la creación,  expresión y comunicación de ideas o emociones. Realizar producción manual, visual o escénica, donde la  creatividad y la sensibilidad son centrales es importante para satisfacer sus intereses. Suelen ser personas  imaginativas, sensibles, expresivas, originales y prefieren tareas no rutinarias. Por eso las ocupaciones tienen  que estar vinculadas a la expresión creativa y producción artística.\n\nAlgunas ocupaciones que se vincular al área:   Pintor/a artesanal, ayudante de escenografía, asistente en imprenta, operario/a de serigrafía, ayudante en  utilería teatral.  También puede incluir profesiones más técnicas o formales como: Diseño gráfico, Ilustración,  Escenografía, Actuación, Música, Fotografía\n\nCompetencias Importantes para desempeñarse en el área:   Creatividad e innovación, Habilidad manual y destreza fina, Autonomía, Perseverancia, Iniciativa, Atención al  detalle, Tolerancia a la ambigüedad"
      },
      {
        categoryId: 'HUM',
        title: 'HUMANITARIO',
        description: "Descripción breve: Las personas con afinidad a esta área eligen ocupaciones vinculadas al cuidado,  acompañamiento y apoyo a otras personas en sus dimensiones físicas, emocionales, sociales o educativas.  Ayudar, contener y contribuir al bienestar del otro es central para satisfacer sus intereses.  Suelen ser personas empáticas, solidarias, pacientes, responsables y comprometidas socialmente. Prefieren  tareas con sentido social y contacto interpersonal directo. Las ocupaciones deben estar vinculadas al servicio,  la asistencia y el trabajo comunitario, donde el vínculo humano es el eje principal.\n\nAlgunas ocupaciones que se vinculan al área: auxiliar de cuidados, acompañante de personas mayores,  asistente en comedor comunitario, promotor/a comunitario\n\nTambién puede incluir profesiones más técnicas o formales como: Enfermería, Trabajo Social, Terapia  Ocupacional, Psicología, Docencia, Acompañamiento Terapéutico.\n\nCompetencias importantes para desempeñarse en el área:  Empatía y escucha activa, Orientación al servicio, Responsabilidad y compromiso, Trabajo en equipo,  Autocontrol emocional, Comunicación clara y respetuosa, Tolerancia."
      },
      {
        categoryId: 'SERV',
        title: 'SERVICIOS Y ACOMODACIÓN',
        description: "Descripción breve: Las personas con afinidad a esta área eligen ocupaciones vinculadas con la atención  directa a las personas, la hospitalidad, el cuidado del entorno y la satisfacción de necesidades concretas.  Disfrutan realizar tareas donde el trato interpersonal, la colaboración y la disposición al servicio son centrales.  Suelen ser personas amables, empáticas, responsables, pacientes y con buena disposición corporal para tareas  dinámicas y prácticas.  Prefieren actividades con objetivos claros, contacto con otros y resultados visibles como el orden y la limpieza.\n\nAlgunas ocupaciones vinculadas al área: Mozo/a – camarero/a, ayudante de cocina, personal de limpieza,  recepcionista, asistente en eventos.\n\nTambién puede incluir profesiones más técnicas o formales como: Gastronomía, Hotelería y Turismo,  Gestión de Servicios, Organización de Eventos\n\nCompetencias importantes para desempeñarse en el área:  Orientación al servicio, Empatía, Responsabilidad y puntualidad, Trabajo en equipo, Organización y orden,   Adaptabilidad, Perseverancia ante tareas repetitivas"
      },
      {
        categoryId: 'PROT',
        title: 'PROTECCIÓN',
        description: "Descripción breve: las personas con afinidad a esta área eligen ocupaciones vinculadas con el cuidado, la  vigilancia y la protección de personas, bienes y espacios comunitarios. Realizar tareas de control, prevención y  cumplimiento de normas, donde la responsabilidad y el orden son centrales, es importante para satisfacer sus  intereses. Suelen ser personas observadoras, disciplinadas, firmes, responsables y prefieren tareas  estructuradas con consignas claras. Por eso las ocupaciones tienen que estar vinculadas a la seguridad, el  control y la prevención de riesgos.  Algunas ocupaciones que se vinculan al área: Guardia de seguridad, vigilador/a, sereno/a, asistente de  prevención, personal de control de accesos.   También puede incluir profesiones más técnicas o formales como: Policía, Bombero/a, Técnico/a en  Seguridad e Higiene, Oficial de seguridad aeroportuaria.  Competencias Importantes para desempeñarse en el área: Atención y concentración sostenida,  Responsabilidad, Cumplimiento de normas y protocolos, Autocontrol emocional, Toma de decisiones bajo  presión, Comunicación clara y firme, Trabajo en equipo, Observación de detalles, Puntualidad y compromiso."
      },
      {
        categoryId: 'PHYS',
        title: 'DESEMPEÑO FÍSICO',
        description: "Descripción breve: las personas con afinidad a esta área eligen ocupaciones vinculadas con el movimiento  corporal, la actividad física y el esfuerzo práctico como forma principal de trabajo. Realizar tareas donde el  cuerpo, la coordinación, la resistencia y la energía son herramientas centrales es importante para satisfacer  sus intereses. Suelen ser personas activas, dinámicas, disciplinadas, con gusto por el trabajo concreto y al aire  libre, y prefieren actividades prácticas antes que tareas sedentarias o de oficina. Por eso las ocupaciones  tienen que estar vinculadas al deporte, la recreación, el entrenamiento físico o tareas de apoyo que impliquen  un desempeño corporal sostenido.\n\nAlgunas ocupaciones que se vinculan al área: Asistente de entrenador/a deportivo, utilero/a en clubes,  personal de mantenimiento en gimnasios, ayudante de escenario en montajes escénicos, auxiliar en colonias  de vacaciones.   También puede incluir profesiones más técnicas o formales como: Profesor/a de Educación Física,  Preparador/a físico, Entrenador/a deportivo, Árbitro/a, Coordinador/a de actividades recreativas.\n\nCompetencias Importantes para desempeñarse en el área: Resistencia física, Coordinación motriz,  Disciplina y constancia, Trabajo en equipo, Responsabilidad, Seguridad y autocuidado, Perseverancia,  Iniciativa, Tolerancia a la frustración."
      },
      {
        categoryId: 'IND',
        title: 'INDUSTRIAL',
        description: "Descripción breve: las personas con afinidad a esta área eligen ocupaciones vinculadas con procesos de  producción, manufactura y trabajo en fábricas o talleres organizados. Realizar tareas concretas, repetitivas y  estructuradas, donde el cumplimiento de normas, la precisión y el trabajo en equipo son centrales, es  importante para satisfacer sus intereses. Suelen ser personas prácticas, constantes, responsables y prefieren  actividades con consignas claras y procedimientos definidos. Por eso las ocupaciones tienen que estar  vinculadas a la producción en serie, el armado, el empaquetado o el control básico de calidad.  Algunas ocupaciones que se vinculan al área: Operario/a de línea de producción, empaquetador/a, ayudante  de depósito, clasificador/a de productos, montador/a industrial, operario/a de control de calidad manual.   También puede incluir profesiones más técnicas o formales como: Técnico/a en procesos industriales,  Técnico/a electromecánico/a, Técnico/a en logística, Técnico/a en mantenimiento industrial.  Competencias Importantes para desempeñarse en el área: Cumplimiento de normas y procedimientos,  Responsabilidad, Puntualidad y asistencia sostenida, Trabajo en equipo, Atención al detalle, Orden y  organización, Perseverancia, Ritmo de trabajo adecuado."
      },
      {
        categoryId: 'MECH',
        title: 'MECÁNICA',
        description: "Descripción breve: las personas con afinidad a esta área eligen ocupaciones vinculadas al trabajo práctico con  máquinas, herramientas y sistemas técnicos. Realizar tareas de armado, reparación, mantenimiento o  instalación, donde el uso de la destreza manual y la aplicación concreta de conocimientos técnicos son  centrales, es importante para satisfacer sus intereses. Suelen ser personas prácticas, resolutivas, metódicas,  perseverantes y prefieren tareas concretas y estructuradas con resultados visibles. Por eso las ocupaciones  tienen que estar vinculadas al funcionamiento, mantenimiento y reparación de objetos, equipos o  instalaciones.  Algunas ocupaciones que se vinculan al área: Ayudante mecánico/a, operario/a de mantenimiento, auxiliar  electricista, soldador/a inicial, ayudante de taller, auxiliar en refrigeración.\n\nTambién puede incluir profesiones más técnicas o formales como: Técnico/a mecánico/a, Técnico/a  electromecánico/a, Técnico/a en mantenimiento industrial, Mecánico/a automotor, Técnico/a en refrigeración,  Ingeniería mecánica.\n\nCompetencias Importantes para desempeñarse en el área: Habilidad manual y coordinación motriz, Atención  al detalle, resolución de problemas, Organización, Cumplimiento de normas de seguridad, Responsabilidad,  Perseverancia."
      },
      {
        categoryId: 'NAT',
        title: 'PLANTAS Y ANIMALES',
        description: "Descripción breve: las personas con afinidad a esta área eligen ocupaciones vinculadas con el cuidado,  producción y manejo de recursos naturales, plantas y animales. Realizar tareas al aire libre, trabajar con seres  vivos y participar en procesos de cultivo, mantenimiento o cría es central para satisfacer sus intereses. Suelen  ser personas prácticas, observadoras, pacientes, responsables y con preferencia por actividades concretas y  físicas. Valoran el contacto con la naturaleza y se sienten cómodas en tareas organizadas, donde el  compromiso y la constancia son fundamentales. Por eso las ocupaciones tienen que estar vinculadas al trabajo  rural, ambiental o de cuidado animal y vegetal.  Algunas ocupaciones que se vinculan al área: Peón/a rural, jardinero/a, auxiliar de vivero, operario/a de  huerta, cuidador/a de animales.  También puede incluir profesiones más técnicas o formales como: Técnico/a agropecuario/a, Técnico/a  forestal, Veterinario/a, Ingeniero/a agrónomo/a, Guardaparque.  Competencias Importantes para desempeñarse en el área: Responsabilidad y compromiso sostenido,  Habilidad manual y manejo básico de herramientas, Observación y atención al detalle, Trabajo en equipo,  Autonomía en tareas simples, Cumplimiento de normas de seguridad e higiene, Conciencia ambiental."
      },
      {
        categoryId: 'LEAD',
        title: 'LIDERAZGO',
        description: "Descripción breve: las personas con afinidad a esta área eligen ocupaciones vinculadas con la organización,  coordinación y conducción de equipos de trabajo. Les interesa guiar a otros, tomar decisiones, distribuir tareas  y asumir responsabilidades para alcanzar objetivos concretos. Disfrutan de roles donde pueden influir  positivamente en el desempeño grupal, resolver problemas y sostener la dinámica laboral. Suelen ser  personas decididas, organizadas, proactivas, con seguridad personal y capacidad para comunicarse con  claridad. Prefieren tareas que impliquen responsabilidad, conducción y gestión de personas. Por eso las  ocupaciones tienen que estar vinculadas a la supervisión, coordinación y dirección de equipos.  Algunas ocupaciones que se vinculan al área: Supervisor/a de turno, encargado/a de depósito, líder de  cuadrilla, encargado/a de local comercial.  También puede incluir profesiones más técnicas o formales como: Recursos Humanos, Administración de  empresas, Gestión de proyectos, Dirección institucional, Gerencia comercial.  Competencias Importantes para desempeñarse en el área: Comunicación clara y asertiva, Organización y  planificación, Toma de decisiones, Resolución de conflictos, Liderazgo positivo, Autocontrol emocional,  Capacidad de influencia, gestión de equipo, Responsabilidad y orientación a resultados."
      },
      {
        categoryId: 'SCI',
        title: 'CIENTÍFICO',
        description: "Descripción breve: las personas con afinidad a esta área eligen ocupaciones vinculadas con la investigación, el  análisis y la aplicación de conocimientos científicos para comprender fenómenos y resolver problemas.  Realizar tareas de observación, medición, registro de datos y experimentación es importante para satisfacer  sus intereses. Suelen ser personas curiosas, analíticas, metódicas, precisas y prefieren tareas estructuradas  donde puedan comprobar resultados. Por eso las ocupaciones tienen que estar vinculadas al trabajo con  información, procedimientos técnicos y métodos científicos.  Algunas ocupaciones que se vinculan al área: Técnico/a auxiliar de laboratorio, ayudante de investigación,  operario/a de ensayos y pruebas, recolector/a de datos, asistente en control de calidad.  También puede incluir profesiones más técnicas o formales como: Biología, Bioquímica, Ingeniería en  alimentos, Investigación científica, Tecnología en laboratorio, Ciencias ambientales.  Competencias importantes para desempeñarse en el área:​ Pensamiento analítico, Rigor y atención al detalle, Capacidad de observación, Organización y método,  Aprendizaje continuo, Responsabilidad en el manejo de información y procedimientos técnicos."
      },
      {
        categoryId: 'SAL',
        title: 'VENTAS',
        description: "Descripción breve: las personas con afinidad a esta área eligen ocupaciones vinculadas con la promoción,  comercialización e intercambio de productos o servicios. Influir, persuadir y orientar al cliente en la toma de  decisiones es central para satisfacer sus intereses. Suelen ser personas sociables, dinámicas, con iniciativa y  orientación a resultados, que disfrutan el contacto con otras personas y los desafíos comerciales. Por eso las  ocupaciones tienen que estar vinculadas a la atención al cliente, negociación y generación de oportunidades  de venta.  Algunas ocupaciones que se vinculan al área:  Vendedor/a, promotor/a comercial, repositor/a, cajero/a,  auxiliar en atención al público.  También puede incluir profesiones más técnicas o formales como: Marketing, Comercialización, Ejecutivo/a  de cuentas, Representante de ventas, Community manager comercial.  Competencias Importantes para desempeñarse en el área:​ Comunicación efectiva y persuasiva, Orientación al cliente, Negociación, Iniciativa y proactividad, Tolerancia a  la frustración, Orientación a resultados, Flexibilidad."
      },
      {
        categoryId: 'BUS',
        title: 'NEGOCIOS Y DETALLE',
        description: "Descripción breve:​ Las personas con afinidad a esta área eligen ocupaciones vinculadas con tareas organizadas, estructuradas y  claramente definidas, donde la exactitud, el orden y la atención al detalle son centrales. Realizar actividades  administrativas, de registro, control, facturación o manejo de información les resulta satisfactorio,\n\nespecialmente cuando pueden trabajar con datos, números y procedimientos establecidos. Suelen ser  personas metódicas, responsables, organizadas, precisas y prefieren tareas rutinarias o con reglas claras. Por  eso las ocupaciones tienen que estar vinculadas a la organización, administración y control de información o  recursos.  Algunas ocupaciones que se vinculan al área: Auxiliar administrativo/a, data entry, cadete de oficina,  recepcionista, auxiliar contable, operador/a de carga de datos, asistente de archivo.  También puede incluir profesiones más técnicas o formales como: Administración de Empresas, Contabilidad,  Finanzas, Gestión Comercial, Analista administrativo.  Competencias Importantes para desempeñarse en el área:   Planificación y organización, Atención al detalle, Responsabilidad y confiabilidad, Manejo de información y  datos, Pensamiento lógico, Cumplimiento de normas y procedimientos, Gestión del tiempo, Orden y  sistematicidad."
      },
    ];

    for (const cat of catData) {
      const existingInfo = await catRepo.findOne({
        where: { categoryId: cat.categoryId },
      });
      if (!existingInfo) {
        await catRepo.save(catRepo.create(cat));
      } else {
        existingInfo.description = cat.description;
        existingInfo.title = cat.title;
        await catRepo.save(existingInfo);
      }
    }
    console.log('✅ Vocational Categories saved!');

    console.log('🏁 Seeding finished successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await dataSource.destroy();
  }
};

seedDatabase();
