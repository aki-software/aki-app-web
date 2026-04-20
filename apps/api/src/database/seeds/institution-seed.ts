import { DataSource, EntityManager } from 'typeorm';
import { typeOrmConfig } from '../../config/typeorm.config';
import { Institution } from '../../institutions/entities/institution.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import { buildSeedPasswordHash } from './seed-password';

type UpsertInstitutionParams = {
  name: string;
  billingEmail: string | null;
  isActive: boolean;
  userEmail: string;
  userName: string;
  userPassword: string;
};

function getInstitutionSeedParams(): UpsertInstitutionParams {
  const name =
    process.env.SEED_INSTITUTION_NAME?.trim() || 'Institucion Demo A.KIT';
  const billingEmailRaw = process.env.SEED_INSTITUTION_BILLING_EMAIL?.trim();
  const isActiveRaw = process.env.SEED_INSTITUTION_IS_ACTIVE?.trim();
  const userEmailRaw =
    process.env.SEED_INSTITUTION_USER_EMAIL?.trim().toLowerCase() ||
    billingEmailRaw?.trim().toLowerCase() ||
    'institucion@akit.app';
  const userName =
    process.env.SEED_INSTITUTION_USER_NAME?.trim() || 'Operador Institucion';
  const userPassword =
    process.env.SEED_INSTITUTION_USER_PASSWORD?.trim() || 'Institucion1234!';

  if (!name) {
    throw new Error('SEED_INSTITUTION_NAME cannot be empty.');
  }

  if (!userEmailRaw) {
    throw new Error('SEED_INSTITUTION_USER_EMAIL cannot be empty.');
  }

  const isActive = isActiveRaw ? isActiveRaw.toLowerCase() !== 'false' : true;

  return {
    name,
    billingEmail: billingEmailRaw ? billingEmailRaw.toLowerCase() : null,
    isActive,
    userEmail: userEmailRaw,
    userName,
    userPassword,
  };
}

type RepoProvider = Pick<DataSource, 'getRepository'> | EntityManager;

export async function upsertInstitution(
  provider: RepoProvider,
): Promise<{ institution: Institution; operationalUser: User }> {
  const institutionRepo = provider.getRepository(Institution);
  const userRepo = provider.getRepository(User);
  const { name, billingEmail, isActive, userEmail, userName, userPassword } =
    getInstitutionSeedParams();

  const existingInstitution = billingEmail
    ? await institutionRepo.findOne({
        where: [{ billingEmail }, { name }],
      })
    : await institutionRepo.findOne({
        where: { name },
      });

  const institution =
    existingInstitution ??
    institutionRepo.create({
      name,
      billingEmail,
      isActive,
      responsibleTherapistUserId: null,
    });

  institution.name = name;
  institution.billingEmail = billingEmail;
  institution.isActive = isActive;

  const savedInstitution = await institutionRepo.save(institution);

  let operationalUser = await userRepo.findOne({
    where: { email: userEmail },
  });

  if (!operationalUser) {
    operationalUser = userRepo.create({
      name: userName,
      email: userEmail,
      role: UserRole.THERAPIST,
      institutionId: savedInstitution.id,
      passwordHash: buildSeedPasswordHash(userPassword),
      passwordSetAt: new Date(),
      passwordSetupToken: null,
      passwordSetupExpiresAt: null,
    });
  } else {
    operationalUser.name = userName;
    operationalUser.role = UserRole.THERAPIST;
    operationalUser.institutionId = savedInstitution.id;
    operationalUser.passwordHash = buildSeedPasswordHash(userPassword);
    operationalUser.passwordSetAt = new Date();
    operationalUser.passwordSetupToken = null;
    operationalUser.passwordSetupExpiresAt = null;
  }

  operationalUser = await userRepo.save(operationalUser);

  if (savedInstitution.responsibleTherapistUserId !== operationalUser.id) {
    savedInstitution.responsibleTherapistUserId = operationalUser.id;
  }

  const finalInstitution = await institutionRepo.save(savedInstitution);

  if (existingInstitution) {
    existingInstitution.name = name;
    existingInstitution.billingEmail = billingEmail;
    existingInstitution.isActive = isActive;
    console.log(`Institution updated: ${finalInstitution.name}`);
  } else {
    console.log(`Institution created: ${finalInstitution.name}`);
  }

  console.log(`Operational user ready: ${operationalUser.email}`);

  return {
    institution: finalInstitution,
    operationalUser,
  };
}

async function seedInstitutionCli() {
  const seedConfig = { ...typeOrmConfig, migrations: [] };
  const dataSource = new DataSource(seedConfig);

  try {
    console.log('Initializing institution seed...');
    await dataSource.initialize();
    await upsertInstitution(dataSource);
    console.log('Institution seed finished successfully.');
  } catch (error) {
    console.error('Error seeding institution:', error);
    process.exitCode = 1;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

if (require.main === module) {
  void seedInstitutionCli();
}
