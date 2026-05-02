import { DataSource, EntityManager } from 'typeorm';
import { typeOrmConfig } from '../../config/typeorm.config';
import { User, UserRole } from '../../users/entities/user.entity';
import { buildSeedPasswordHash } from './seed-password';

type RepoProvider = Pick<DataSource, 'getRepository'> | EntityManager;

export async function upsertAdminUser(provider: RepoProvider): Promise<User> {
  const userRepo = provider.getRepository(User);

  const adminEmail =
    process.env.ADMIN_USER?.trim().toLowerCase() || 'admin@akit.app';
  const adminName = process.env.ADMIN_NAME?.trim() || 'Platform Admin';
  const adminPassword = process.env.ADMIN_PASS?.trim() || 'Admin1234!';

  const existingAdmin = await userRepo.findOne({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    existingAdmin.name = adminName;
    existingAdmin.role = UserRole.ADMIN;
    existingAdmin.passwordHash = buildSeedPasswordHash(adminPassword);
    existingAdmin.passwordSetAt = new Date();
    existingAdmin.passwordSetupToken = null;
    existingAdmin.passwordSetupExpiresAt = null;
    existingAdmin.institutionId = null;
    const updatedAdmin = await userRepo.save(existingAdmin);
    console.log(`Admin updated: ${adminEmail}`);
    return updatedAdmin;
  }

  const admin = userRepo.create({
    name: adminName,
    email: adminEmail,
    role: UserRole.ADMIN,
    passwordHash: buildSeedPasswordHash(adminPassword),
    passwordSetAt: new Date(),
    passwordSetupToken: null,
    passwordSetupExpiresAt: null,
    institutionId: null,
  });

  const createdAdmin = await userRepo.save(admin);
  console.log(`Admin created: ${adminEmail}`);
  return createdAdmin;
}

async function seedAdminUserCli() {
  const seedConfig = { ...typeOrmConfig, migrations: [] };
  const dataSource = new DataSource(seedConfig);

  try {
    console.log('Initializing admin seed...');
    await dataSource.initialize();
    await upsertAdminUser(dataSource);
    console.log('Admin seed finished successfully.');
  } catch (error) {
    console.error('Error seeding admin user:', error);
    process.exitCode = 1;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

if (require.main === module) {
  void seedAdminUserCli();
}
