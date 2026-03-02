import { DataSource } from 'typeorm';
import { typeOrmConfig } from '../../config/typeorm.config';
import { Session } from '../../sessions/entities/session.entity';
import { SessionResult } from '../../sessions/entities/session-result.entity';
import { SessionSwipe } from '../../sessions/entities/session-swipe.entity';
import { VocationalCategory } from '../../categories/entities/vocational-category.entity';

const seedDatabase = async () => {
  const seedConfig = { ...typeOrmConfig, migrations: [] };
  const dataSource = new DataSource(seedConfig);

  try {
    console.log('🌱 Initializing Seeding Process...');
    await dataSource.initialize();

    const sessionRepo = dataSource.getRepository(Session);
    const resultRepo = dataSource.getRepository(SessionResult);
    const swipeRepo = dataSource.getRepository(SessionSwipe);
    const catRepo = dataSource.getRepository(VocationalCategory);

    // 1. Omitimos la limpieza de la BD para evitar errores de restricción de llaves foráneas y protección de TypeORM.
    // La BD seguirá acumulando data demo cada vez que se ejecute el seed.

    // 1.5. Insertar Categorías Teóricas
    console.log('📚 Loading Vocational Categories from text payload...');
    const catData = [
      {
        categoryId: "ART",
        title: "Artístico",
        description: "Descripción breve: las personas con afinidad a esta área eligen ocupaciones vinculadas con la creación, expresión y comunicación de ideas o emociones. Realizar producción manual, visual o escénica, donde la creatividad y la sensibilidad son centrales es importante para satisfacer sus intereses. Suelen ser personas imaginativas, sensibles, expresivas, originales y prefieren tareas no rutinarias. Por eso las ocupaciones tienen que estar vinculadas a la expresión creativa y producción artística.\n\nAlgunas ocupaciones que se vincular al área:\nPintor/a artesanal, ayudante de escenografía, asistente en imprenta, operario/a de serigrafía, ayudante en utilería teatral.\nTambién puede incluir profesiones más técnicas o formales como: Diseño gráfico, Ilustración, Escenografía, Actuación, Música, Fotografía\n\nCompetencias Importantes para desempeñarse en el área:\nCreatividad e innovación, Habilidad manual y destreza fina, Autonomía, Perseverancia, Iniciativa, Atención al detalle, Tolerancia a la ambigüedad"
      },
      {
        categoryId: "HUM",
        title: "Humanitario",
        description: "Descripción breve: Las personas con afinidad a esta área eligen ocupaciones vinculadas al cuidado, acompañamiento y apoyo a otras personas en sus dimensiones físicas, emocionales, sociales o educativas. Ayudar, contener y contribuir al bienestar del otro es central para satisfacer sus intereses. Suelen ser personas empáticas, solidarias, pacientes, responsables y comprometidas socialmente.\nPrefieren tareas con sentido social y contacto interpersonal directo. Las ocupaciones deben estar vinculadas al servicio, la asistencia y el trabajo comunitario, donde el vínculo humano es el eje principal.\n\nAlgunas ocupaciones que se vinculan al área: auxiliar de cuidados, acompañante de personas mayores, asistente en comedor comunitario, promotor/a comunitario\n\nTambién puede incluir profesiones más técnicas o formales como: Enfermería, Trabajo Social, Terapia Ocupacional, Psicología, Docencia, Acompañamiento Terapéutico.\n\nCompetencias importantes para desempeñarse en el área:\nEmpatía y escucha activa, Orientación al servicio, Responsabilidad y compromiso, Trabajo en equipo, Autocontrol emocional, Comunicación clara y respetuosa, Tolerancia."
      },
      {
        categoryId: "SERV",
        title: "Servicios y Acomodación",
        description: "Descripción breve: Las personas con afinidad a esta área eligen ocupaciones vinculadas con la atención directa a las personas, la hospitalidad, el cuidado del entorno y la satisfacción de necesidades concretas. Disfrutan realizar tareas donde el trato interpersonal, la colaboración y la disposición al servicio son centrales. Suelen ser personas amables, empáticas, responsables, pacientes y con buena disposición corporal para tareas dinámicas y prácticas. Prefieren actividades con objetivos claros, contacto con otros y resultados visibles como el orden y la limpieza.\n\nAlgunas ocupaciones vinculadas al área: Mozo/a – camarero/a, ayudante de cocina, personal de limpieza, recepcionista, asistente en eventos.\n\nTambién puede incluir profesiones más técnicas o formales como: Gastronomía, Hotelería y Turismo, Gestión de Servicios, Organización de Eventos\n\nCompetencias importantes para desempeñarse en el área:\nOrientación al servicio, Empatía, Responsabilidad y puntualidad, Trabajo en equipo, Organización y orden, Adaptabilidad, Perseverancia ante tareas repetitivas"
      },
      {
        categoryId: "PROT",
        title: "Protección",
        description: "Descripción breve: las personas con afinidad a esta área eligen ocupaciones vinculadas con el cuidado, la vigilancia y la protección de personas, bienes y espacios comunitarios. Realizar tareas de control, prevención y cumplimiento de normas, donde la responsabilidad y el orden son centrales, es importante para satisfacer sus intereses. Suelen ser personas observadoras, disciplinadas, firmes, responsables y prefieren tareas estructuradas con consignas claras.\nPor eso las ocupaciones tienen que estar vinculadas a la seguridad, el control y la prevención de riesgos.\n\nAlgunas ocupaciones que se vinculan al área: Guardia de seguridad, vigilador/a, sereno/a, asistente de prevención, personal de control de accesos.\n\nTambién puede incluir profesiones más técnicas o formales como: Policía, Bombero/a, Técnico/a en Seguridad e Higiene, Oficial de seguridad aeroportuaria.\n\nCompetencias Importantes para desempeñarse en el área: Atención y concentración sostenida, Responsabilidad, Cumplimiento de normas y protocolos, Autocontrol emocional, Toma de decisiones bajo presión, Comunicación clara y firme, Trabajo en equipo, Observación de detalles."
      },
      {
        categoryId: "PHYS",
        title: "Desempeño Físico",
        description: "Descripción breve: las personas con afinidad a esta área eligen ocupaciones vinculadas con el movimiento corporal, la actividad física y el esfuerzo práctico como forma principal de trabajo. Realizar tareas donde el cuerpo, la coordinación, la resistencia y la energía son herramientas centrales es importante para satisfacer sus intereses. Suelen ser personas activas, dinámicas, disciplinadas, con gusto por el trabajo concreto y al aire libre, y prefieren actividades prácticas.\n\nAlgunas ocupaciones que se vinculan al área: Asistente de entrenador/a deportivo, utilero/a en clubes, mantenimiento en gimnasios, ayudante de escenario, auxiliar en colonias de vacaciones.\n\nProfesiones más técnicas o formales: Profesor/a de Educación Física, Preparador/a físico, Entrenador/a deportivo, Coordinador/a de actividades."
      },
      {
        categoryId: "IND",
        title: "Industrial",
        description: "Descripción breve: las personas con afinidad a esta área eligen ocupaciones vinculadas con procesos de producción, manufactura y trabajo en fábricas o talleres organizados. Realizar tareas concretas, repetitivas y estructuradas, donde el cumplimiento de normas, la precisión y el trabajo en equipo son centrales.\n\nAlgunas ocupaciones que se vinculan al área: Operario/a de línea de producción, empaquetador/a, ayudante de depósito, clasificador/a de productos.\n\nProfesiones más formales: Técnico/a en procesos industriales, electromecánico/a, Técnico/a en logística."
      },
      {
        categoryId: "MECH",
        title: "Mecánica",
        description: "Descripción breve: las personas con afinidad a esta área eligen ocupaciones vinculadas al trabajo práctico con máquinas, herramientas y sistemas técnicos. Realizar tareas de armado, reparación, mantenimiento o instalación.\n\nAlgunas ocupaciones que se vinculan al área: Ayudante mecánico/a, operario/a de mantenimiento, auxiliar electricista, soldador/a, ayudante de taller.\n\nProfesiones más formales: Técnico/a mecánico/a, electromecánico/a, Mecánico/a automotor, Ingeniería mecánica."
      },
      {
        categoryId: "NAT",
        title: "Plantas y Animales",
        description: "Descripción breve: las personas con afinidad a esta área eligen ocupaciones vinculadas con el cuidado, producción y manejo de recursos naturales, plantas y animales. Realizar tareas al aire libre, trabajar con seres vivos y participar en procesos de cultivo es central.\n\nAlgunas ocupaciones vinculadas: Peón/a rural, jardinero/a, auxiliar de vivero, operario/a de huerta, cuidador/a de animales.\n\nProfesiones más formales: Técnico/a agropecuario/a, forestal, Veterinario/a, Ingeniero/a agrónomo/a, Guardaparque."
      },
      {
        categoryId: "LEAD",
        title: "Liderazgo",
        description: "Descripción breve: las personas con afinidad a esta área eligen ocupaciones vinculadas con la organización, coordinación y conducción de equipos de trabajo. Les interesa guiar a otros, tomar decisiones, distribuir tareas y asumir responsabilidades para alcanzar objetivos.\n\nAlgunas ocupaciones vinculadas: Supervisor/a de turno, encargado/a de depósito, líder de cuadrilla, encargado/a de local comercial.\n\nProfesiones más formales: Recursos Humanos, Administración de empresas, Gestión de proyectos, Dirección institucional, Gerencia comercial."
      },
      {
        categoryId: "SCI",
        title: "Científico",
        description: "Descripción breve: las personas con afinidad a esta área eligen ocupaciones vinculadas con la investigación, el análisis y la aplicación de conocimientos científicos para comprender fenómenos y resolver problemas. Realizar tareas de observación, medición, registro de datos y experimentación es importante.\n\nAlgunas ocupaciones vinculadas: Técnico/a auxiliar de laboratorio, ayudante de investigación, operario/a de ensayos y pruebas, recolector/a de datos.\n\nProfesiones más formales: Biología, Bioquímica, Ingeniería en alimentos, Investigación científica, Tecnología en laboratorio."
      },
      {
        categoryId: "SAL",
        title: "Ventas",
        description: "Descripción breve: las personas con afinidad a esta área eligen ocupaciones vinculadas con la promoción, comercialización e intercambio de productos o servicios. Influir, persuadir y orientar al cliente en la toma de decisiones.\n\nAlgunas ocupaciones vinculadas: Vendedor/a, promotor/a comercial, repositor/a, cajero/a, auxiliar en atención al público.\n\nProfesiones más formales: Marketing, Comercialización, Ejecutivo/a de cuentas, Representante de ventas, Community manager comercial."
      },
      {
        categoryId: "BUS",
        title: "Negocios y Detalle",
        description: "Descripción breve: Las personas con afinidad a esta área eligen ocupaciones vinculadas con tareas organizadas, estructuradas y claramente definidas, donde la exactitud, el orden y la atención al detalle son centrales. Realizar actividades administrativas, de registro, control, facturación o manejo de información.\n\nAlgunas ocupaciones vinculadas: Auxiliar administrativo/a, data entry, cadete de oficina, recepcionista, auxiliar contable.\n\nProfesiones más formales: Administración de Empresas, Contabilidad, Finanzas, Gestión Comercial, Analista administrativo."
      }
    ];

    for (const cat of catData) {
      const existingInfo = await catRepo.findOne({ where: { categoryId: cat.categoryId }});
      if (!existingInfo) {
         await catRepo.save(catRepo.create(cat));
      }
    }
    console.log('✅ Vocational Categories saved!');

    // 2. Crear una Sesión Inicial
    const session = sessionRepo.create({
      patientId: 'patient-demo-123',
      patientName: 'Demo Patient',
      sessionDate: new Date(),
      hollandCode: 'IRE', // Investigador, Realista, Emprendedor
      totalTimeMs: 150000, 
    });
    const savedSession = await sessionRepo.save(session);
    console.log(`✅ Session created with ID: ${savedSession.id}`);

    // 3. Insertar Resultados Holland Extendido (12 Categorías)
    const resultsData = [
      { categoryId: 'ART', score: 12, totalPossible: 15, percentage: 80 },
      { categoryId: 'HUM', score: 14, totalPossible: 15, percentage: 93 },
      { categoryId: 'SERV', score: 5, totalPossible: 15, percentage: 33 },
      { categoryId: 'PROT', score: 8, totalPossible: 15, percentage: 53 },
      { categoryId: 'PHYS', score: 10, totalPossible: 15, percentage: 66 },
      { categoryId: 'IND', score: 7, totalPossible: 15, percentage: 46 },
      { categoryId: 'MECH', score: 9, totalPossible: 15, percentage: 60 },
      { categoryId: 'NAT', score: 13, totalPossible: 15, percentage: 86 },
      { categoryId: 'LEAD', score: 15, totalPossible: 15, percentage: 100 },
      { categoryId: 'SCI', score: 11, totalPossible: 15, percentage: 73 },
      { categoryId: 'SAL', score: 6, totalPossible: 15, percentage: 40 },
      { categoryId: 'BUS', score: 4, totalPossible: 15, percentage: 26 },
    ];

    const results = resultsData.map(res => 
      resultRepo.create({ ...res, session: savedSession })
    );
    await resultRepo.save(results);
    console.log('✅ Holland Results created');

    // 4. Insertar algunos Swipes representativos
    const swipesData = [
      { cardId: 'card-001', categoryId: 'R', isLiked: true, timestamp: new Date(Date.now() - 120000) },
      { cardId: 'card-002', categoryId: 'I', isLiked: true, timestamp: new Date(Date.now() - 110000) },
      { cardId: 'card-003', categoryId: 'A', isLiked: false, timestamp: new Date(Date.now() - 100000) },
      { cardId: 'card-004', categoryId: 'S', isLiked: false, timestamp: new Date(Date.now() - 90000) },
      { cardId: 'card-005', categoryId: 'E', isLiked: true, timestamp: new Date(Date.now() - 80000) },
    ];

    const swipes = swipesData.map(swipe => 
      swipeRepo.create({ ...swipe, session: savedSession })
    );
    await swipeRepo.save(swipes);
    console.log('✅ Swipes created');

    console.log('🏁 Seeding finished successfully!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await dataSource.destroy();
  }
};

seedDatabase();
