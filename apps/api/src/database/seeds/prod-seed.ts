import { DataSource } from 'typeorm';
import { typeOrmConfig } from '../../config/typeorm.config.js';
import { upsertAdminUser } from './admin-seed.js';
import { upsertVocationalCategories } from './categories-seed.js';
import { upsertTresAreasCombinations } from './tres-areas-combinations-seed.js';

function validateRequiredSeedVariables() {
  const hasAdminEmail = Boolean(
    process.env.SEED_ADMIN_EMAIL?.trim() || process.env.ADMIN_USER?.trim(),
  );
  const hasAdminPassword = Boolean(
    process.env.SEED_ADMIN_PASSWORD?.trim() || process.env.ADMIN_PASS?.trim(),
  );
  const missingVariables: string[] = [];

  if (!hasAdminEmail) {
    missingVariables.push('SEED_ADMIN_EMAIL (or ADMIN_USER)');
  }

  if (!hasAdminPassword) {
    missingVariables.push('SEED_ADMIN_PASSWORD (or ADMIN_PASS)');
  }

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVariables.join(', ')}`,
    );
  }
}

async function runBaseSeed() {
  const seedConfig = { ...typeOrmConfig, migrations: [] };
  const dataSource = new DataSource(seedConfig);

  try {
    validateRequiredSeedVariables();
    console.log(
      'Initializing base seed (admin + institution + categories + tres areas)...',
    );
    await dataSource.initialize();

    const { admin, categoriesCount, tresAreasCount } =
      await dataSource.transaction(async (manager) => {
        const seededAdmin = await upsertAdminUser(manager);
        const seededCategories = await upsertVocationalCategories(manager);
        const seededTresAreas = await upsertTresAreasCombinations(manager);
        return {
          admin: seededAdmin,
          categoriesCount: seededCategories.insertedOrUpdated,
          tresAreasCount: seededTresAreas.insertedOrUpdated,
        };
      });

    console.log('Prod seed finished successfully.');
    console.log(`Admin: ${admin.email} (${admin.id})`);
    console.log(`Categories upserted: ${categoriesCount}`);
    console.log(`Tres areas combinations upserted: ${tresAreasCount}`);
  } catch (error) {
    console.error('Error seeding base data:', error);
    process.exitCode = 1;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

void runBaseSeed();
