import { DataSource } from 'typeorm';
import { typeOrmConfig } from '../../config/typeorm.config';
import { Session } from '../../sessions/entities/session.entity';
import { SessionResult } from '../../sessions/entities/session-result.entity';
import { SessionSwipe } from '../../sessions/entities/session-swipe.entity';

const seedDatabase = async () => {
  const seedConfig = { ...typeOrmConfig, migrations: [] };
  const dataSource = new DataSource(seedConfig);

  try {
    console.log('🌱 Initializing Seeding Process...');
    await dataSource.initialize();

    const sessionRepo = dataSource.getRepository(Session);
    const resultRepo = dataSource.getRepository(SessionResult);
    const swipeRepo = dataSource.getRepository(SessionSwipe);

    // 1. Omitimos la limpieza de la BD para evitar errores de restricción de llaves foráneas y protección de TypeORM.
    // La BD seguirá acumulando data demo cada vez que se ejecute el seed.

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

    // 3. Insertar Resultados Holland
    const resultsData = [
      { categoryId: 'R', score: 12, totalPossible: 15, percentage: 80 },
      { categoryId: 'I', score: 14, totalPossible: 15, percentage: 93 },
      { categoryId: 'A', score: 5, totalPossible: 15, percentage: 33 },
      { categoryId: 'S', score: 8, totalPossible: 15, percentage: 53 },
      { categoryId: 'E', score: 10, totalPossible: 15, percentage: 66 },
      { categoryId: 'C', score: 7, totalPossible: 15, percentage: 46 },
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
