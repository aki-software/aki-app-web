import { randomBytes, scryptSync } from 'crypto';
import { DataSource } from 'typeorm';
import { typeOrmConfig } from '../../config/typeorm.config';
import { User, UserRole } from '../../users/entities/user.entity';

function hashPassword(plainPassword: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(plainPassword, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

async function seedAdminUser() {
  const seedConfig = { ...typeOrmConfig, migrations: [] };
  const dataSource = new DataSource(seedConfig);

  try {
    console.log('🌱 Initializing admin seed...');
    await dataSource.initialize();

    const userRepo = dataSource.getRepository(User);

    const adminEmail =
      process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase() || 'admin@akit.app';
    const adminName = process.env.SEED_ADMIN_NAME?.trim() || 'Platform Admin';
    const adminPassword =
      process.env.SEED_ADMIN_PASSWORD?.trim() || 'Admin1234!';

    const existingAdmin = await userRepo.findOne({
      where: { email: adminEmail },
    });

    if (existingAdmin) {
      existingAdmin.name = adminName;
      existingAdmin.role = UserRole.ADMIN;
      existingAdmin.passwordHash = hashPassword(adminPassword);
      existingAdmin.passwordSetAt = new Date();
      existingAdmin.passwordSetupToken = null;
      existingAdmin.passwordSetupExpiresAt = null;
      existingAdmin.institutionId = null;
      await userRepo.save(existingAdmin);
      console.log(`✅ Admin updated: ${adminEmail}`);
      return;
    }

    const admin = userRepo.create({
      name: adminName,
      email: adminEmail,
      role: UserRole.ADMIN,
      passwordHash: hashPassword(adminPassword),
      passwordSetAt: new Date(),
      passwordSetupToken: null,
      passwordSetupExpiresAt: null,
      institutionId: null,
    });

    await userRepo.save(admin);
    console.log(`✅ Admin created: ${adminEmail}`);
  } catch (error) {
    console.error('❌ Error seeding admin user:', error);
    process.exitCode = 1;
  } finally {
    await dataSource.destroy();
  }
}

void seedAdminUser();
