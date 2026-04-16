import { DataSource } from 'typeorm';
import { typeOrmConfig } from '../../config/typeorm.config';
import { upsertAdminUser } from './admin-seed';
import { upsertInstitution } from './institution-seed';

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
    console.log('Initializing base seed (admin + institution)...');
    await dataSource.initialize();

    const { admin, institution, operationalUser } = await dataSource.transaction(
      async (manager) => {
      const seededAdmin = await upsertAdminUser(manager);
      const seededInstitutionData = await upsertInstitution(manager);
      return {
        admin: seededAdmin,
        institution: seededInstitutionData.institution,
        operationalUser: seededInstitutionData.operationalUser,
      };
    },
    );

    console.log('Base seed finished successfully.');
    console.log(`Admin: ${admin.email} (${admin.id})`);
    console.log(`Institution: ${institution.name} (${institution.id})`);
    console.log(`Institution user: ${operationalUser.email} (${operationalUser.id})`);
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
