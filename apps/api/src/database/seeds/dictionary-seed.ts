import { DataSource } from 'typeorm';
import { typeOrmConfig } from '../../config/typeorm.config.js';
import { upsertVocationalCategories } from './categories-seed.js';
import { upsertTresAreasCombinations } from './tres-areas-combinations-seed.js';

async function runDictionarySeed() {
  const seedConfig = { ...typeOrmConfig, migrations: [] };
  const dataSource = new DataSource(seedConfig);

  try {
    console.log('Initializing dictionary seed (categories + tres areas)...');
    await dataSource.initialize();

    const { categoriesCount, tresAreasCount } = await dataSource.transaction(
      async (manager) => {
        const seededCategories = await upsertVocationalCategories(manager);
        const seededTresAreas = await upsertTresAreasCombinations(manager);
        return {
          categoriesCount: seededCategories.insertedOrUpdated,
          tresAreasCount: seededTresAreas.insertedOrUpdated,
        };
      },
    );

    console.log('Dictionary seed finished successfully.');
    console.log(`Categories upserted: ${categoriesCount}`);
    console.log(`Tres areas combinations upserted: ${tresAreasCount}`);
  } catch (error) {
    console.error('Error seeding dictionary data:', error);
    process.exitCode = 1;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

void runDictionarySeed();
