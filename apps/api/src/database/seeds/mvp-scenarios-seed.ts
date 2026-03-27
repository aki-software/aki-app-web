import { DataSource, Repository } from 'typeorm';
import { typeOrmConfig } from '../../config/typeorm.config';
import { Institution } from '../../institutions/entities/institution.entity';
import {
  Session,
  SessionPaymentStatus,
} from '../../sessions/entities/session.entity';
import { SessionResult } from '../../sessions/entities/session-result.entity';
import { SessionSwipe } from '../../sessions/entities/session-swipe.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import { Voucher } from '../../vouchers/entities/voucher.entity';
import { VoucherBatch } from '../../vouchers/entities/voucher-batch.entity';
import {
  VoucherBatchStatus,
  VoucherOwnerType,
  VoucherStatus,
} from '../../vouchers/entities/voucher.enums';

type VoucherSeedInput = {
  code: string;
  batchId: string;
  ownerInstitutionId: string;
  ownerUserId: string;
  status: VoucherStatus;
  assignedPatientName?: string;
  assignedPatientEmail?: string;
};

type SessionSeedInput = {
  paymentReference: string;
  patientName: string;
  patientId: string;
  therapistUserId: string;
  institutionId: string;
  voucherId: string | null;
  hollandCode: string;
  paymentStatus: SessionPaymentStatus;
  reportUnlockedAt: Date | null;
  paidAt: Date | null;
};

async function seedMvpScenarios() {
  const seedConfig = { ...typeOrmConfig, migrations: [] };
  const dataSource = new DataSource(seedConfig);

  try {
    console.log('🧪 Initializing MVP scenario seed...');
    await dataSource.initialize();

    const institutionRepo = dataSource.getRepository(Institution);
    const userRepo = dataSource.getRepository(User);
    const sessionRepo = dataSource.getRepository(Session);
    const resultRepo = dataSource.getRepository(SessionResult);
    const swipeRepo = dataSource.getRepository(SessionSwipe);
    const voucherRepo = dataSource.getRepository(Voucher);
    const voucherBatchRepo = dataSource.getRepository(VoucherBatch);

    const ownerInstitution = await ensureInstitution(
      institutionRepo,
      'Colegio Horizonte',
      'facturacion@horizonte.edu.ar',
    );
    const institutionTherapist = await ensureUser(
      userRepo,
      'Lic. Laura Perez',
      'laura.perez@horizonte.edu.ar',
      UserRole.THERAPIST,
      ownerInstitution.id,
    );
    ownerInstitution.responsibleTherapistUserId = institutionTherapist.id;
    await institutionRepo.save(ownerInstitution);

    const privateInstitution = await ensureInstitution(
      institutionRepo,
      'Consultorio Martin Soto',
      'martin.soto@akit.app',
    );
    const privateTherapist = await ensureUser(
      userRepo,
      'Lic. Martin Soto',
      'martin.soto@akit.app',
      UserRole.THERAPIST,
      privateInstitution.id,
    );
    privateInstitution.responsibleTherapistUserId = privateTherapist.id;
    await institutionRepo.save(privateInstitution);

    const platformInstitution = await ensureInstitution(
      institutionRepo,
      'A.Kit Individual Tests',
      'owner@akit.app',
    );
    const platformOwner = await ensureUser(
      userRepo,
      'Owner Plataforma',
      'owner@akit.app',
      UserRole.THERAPIST,
      platformInstitution.id,
    );
    platformInstitution.responsibleTherapistUserId = platformOwner.id;
    await institutionRepo.save(platformInstitution);

    const patientInstitutional = await ensureUser(
      userRepo,
      'Sofia Ramirez',
      'sofia.ramirez@seed.akit',
      UserRole.PATIENT,
      null,
    );
    const patientPrivate = await ensureUser(
      userRepo,
      'Mateo Garcia',
      'mateo.garcia@seed.akit',
      UserRole.PATIENT,
      null,
    );
    const patientIndividual = await ensureUser(
      userRepo,
      'Valentina Gomez',
      'valentina.gomez@seed.akit',
      UserRole.PATIENT,
      null,
    );

    const institutionBatch = await ensureVoucherBatch(
      voucherBatchRepo,
      ownerInstitution.id,
      institutionTherapist.id,
      2,
      'seed-batch-institution',
    );
    const privateBatch = await ensureVoucherBatch(
      voucherBatchRepo,
      privateInstitution.id,
      privateTherapist.id,
      2,
      'seed-batch-private',
    );

    const institutionAvailable = await ensureVoucher(voucherRepo, {
      code: 'INST-0001',
      batchId: institutionBatch.id,
      ownerInstitutionId: ownerInstitution.id,
      ownerUserId: institutionTherapist.id,
      status: VoucherStatus.AVAILABLE,
    });
    const institutionUsed = await ensureVoucher(voucherRepo, {
      code: 'INST-0002',
      batchId: institutionBatch.id,
      ownerInstitutionId: ownerInstitution.id,
      ownerUserId: institutionTherapist.id,
      status: VoucherStatus.USED,
      assignedPatientName: patientInstitutional.name,
      assignedPatientEmail: patientInstitutional.email,
    });
    const privateAvailable = await ensureVoucher(voucherRepo, {
      code: 'PRIV-0001',
      batchId: privateBatch.id,
      ownerInstitutionId: privateInstitution.id,
      ownerUserId: privateTherapist.id,
      status: VoucherStatus.AVAILABLE,
    });
    const privateUsed = await ensureVoucher(voucherRepo, {
      code: 'PRIV-0002',
      batchId: privateBatch.id,
      ownerInstitutionId: privateInstitution.id,
      ownerUserId: privateTherapist.id,
      status: VoucherStatus.USED,
      assignedPatientName: patientPrivate.name,
      assignedPatientEmail: patientPrivate.email,
    });

    const institutionSession = await ensureSession(sessionRepo, {
      paymentReference: 'seed-session-institution-used',
      patientName: patientInstitutional.name,
      patientId: patientInstitutional.id,
      therapistUserId: institutionTherapist.id,
      institutionId: ownerInstitution.id,
      voucherId: institutionUsed.id,
      hollandCode: 'LEAD-NAT-HUM',
      paymentStatus: SessionPaymentStatus.VOUCHER_REDEEMED,
      reportUnlockedAt: daysAgo(4),
      paidAt: null,
    });
    await ensureScenarioData(
      resultRepo,
      swipeRepo,
      institutionSession,
      buildResults('institutional'),
      buildSwipes('institutional'),
    );

    const privateSession = await ensureSession(sessionRepo, {
      paymentReference: 'seed-session-private-used',
      patientName: patientPrivate.name,
      patientId: patientPrivate.id,
      therapistUserId: privateTherapist.id,
      institutionId: privateInstitution.id,
      voucherId: privateUsed.id,
      hollandCode: 'SCI-MECH-BUS',
      paymentStatus: SessionPaymentStatus.VOUCHER_REDEEMED,
      reportUnlockedAt: daysAgo(2),
      paidAt: null,
    });
    await ensureScenarioData(
      resultRepo,
      swipeRepo,
      privateSession,
      buildResults('private'),
      buildSwipes('private'),
    );

    const individualSession = await ensureSession(sessionRepo, {
      paymentReference: 'seed-session-individual-paid',
      patientName: patientIndividual.name,
      patientId: patientIndividual.id,
      therapistUserId: platformOwner.id,
      institutionId: platformInstitution.id,
      voucherId: null,
      hollandCode: 'ART-HUM-SERV',
      paymentStatus: SessionPaymentStatus.PAID,
      reportUnlockedAt: daysAgo(1),
      paidAt: daysAgo(1),
    });
    await ensureScenarioData(
      resultRepo,
      swipeRepo,
      individualSession,
      buildResults('individual'),
      buildSwipes('individual'),
    );

    institutionUsed.redeemedSessionId = institutionSession.id;
    institutionUsed.redeemedAt = daysAgo(4);
    privateUsed.redeemedSessionId = privateSession.id;
    privateUsed.redeemedAt = daysAgo(2);
    await voucherRepo.save([institutionUsed, privateUsed]);

    console.log('✅ MVP scenario seed ready');
    console.log(
      `   vouchers: ${institutionAvailable.code}, ${institutionUsed.code}, ${privateAvailable.code}, ${privateUsed.code}`,
    );
  } catch (error) {
    console.error('❌ Error seeding MVP scenarios:', error);
    process.exitCode = 1;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

async function ensureInstitution(
  repo: Repository<Institution>,
  name: string,
  billingEmail: string,
): Promise<Institution> {
  const existing = await repo.findOne({ where: { name } });
  if (existing) {
    existing.billingEmail = billingEmail;
    existing.isActive = true;
    return await repo.save(existing);
  }
  return await repo.save(repo.create({ name, billingEmail, isActive: true }));
}

async function ensureUser(
  repo: Repository<User>,
  name: string,
  email: string,
  role: UserRole,
  institutionId: string | null,
): Promise<User> {
  const existing = await repo.findOne({ where: { email } });
  if (existing) {
    existing.name = name;
    existing.role = role;
    existing.institutionId = institutionId;
    return await repo.save(existing);
  }
  return await repo.save(
    repo.create({
      name,
      email,
      role,
      institutionId,
      passwordHash: 'seed-password',
    }),
  );
}

async function ensureVoucherBatch(
  repo: Repository<VoucherBatch>,
  ownerInstitutionId: string,
  ownerUserId: string,
  quantity: number,
  paymentReference: string,
): Promise<VoucherBatch> {
  const existing = await repo.findOne({ where: { paymentReference } });
  if (existing) {
    existing.ownerType = VoucherOwnerType.INSTITUTION;
    existing.ownerInstitutionId = ownerInstitutionId;
    existing.ownerUserId = ownerUserId;
    existing.quantity = quantity;
    existing.status = VoucherBatchStatus.PAID;
    existing.paidAt = daysAgo(7);
    return await repo.save(existing);
  }
  return await repo.save(
    repo.create({
      ownerType: VoucherOwnerType.INSTITUTION,
      ownerInstitutionId,
      ownerUserId,
      quantity,
      unitPrice: '0',
      totalPrice: '0',
      currency: 'ARS',
      paymentProvider: 'seed',
      paymentReference,
      status: VoucherBatchStatus.PAID,
      paidAt: daysAgo(7),
    }),
  );
}

async function ensureVoucher(
  repo: Repository<Voucher>,
  input: VoucherSeedInput,
): Promise<Voucher> {
  const existing = await repo.findOne({ where: { code: input.code } });
  if (existing) {
    Object.assign(existing, input);
    existing.ownerType = VoucherOwnerType.INSTITUTION;
    existing.sentAt = daysAgo(6);
    existing.expiresAt = daysFromNow(90);
    return await repo.save(existing);
  }
  return await repo.save(
    repo.create({
      ...input,
      ownerType: VoucherOwnerType.INSTITUTION,
      sentAt: daysAgo(6),
      expiresAt: daysFromNow(90),
    }),
  );
}

async function ensureSession(
  repo: Repository<Session>,
  input: SessionSeedInput,
): Promise<Session> {
  const existing = await repo.findOne({
    where: { paymentReference: input.paymentReference },
  });
  if (existing) {
    Object.assign(existing, input);
    existing.sessionDate = daysAgo(3);
    existing.totalTimeMs = 11 * 60 * 1000;
    return await repo.save(existing);
  }
  return await repo.save(
    repo.create({
      ...input,
      sessionDate: daysAgo(3),
      totalTimeMs: 11 * 60 * 1000,
    }),
  );
}

async function ensureScenarioData(
  resultRepo: Repository<SessionResult>,
  swipeRepo: Repository<SessionSwipe>,
  session: Session,
  results: Array<{
    categoryId: string;
    score: number;
    totalPossible: number;
    percentage: number;
    suggestedCareers: string[];
    materialSnippet: string;
  }>,
  swipes: Array<{
    cardId: string;
    categoryId: string;
    isLiked: boolean;
    timestamp: Date;
  }>,
): Promise<void> {
  const resultCount = await resultRepo
    .createQueryBuilder('result')
    .where('result.session_id = :sessionId', { sessionId: session.id })
    .getCount();
  if (resultCount === 0) {
    await resultRepo.save(
      results.map((result) => resultRepo.create({ ...result, session })),
    );
  }

  const swipeCount = await swipeRepo
    .createQueryBuilder('swipe')
    .where('swipe.session_id = :sessionId', { sessionId: session.id })
    .getCount();
  if (swipeCount === 0) {
    await swipeRepo.save(
      swipes.map((swipe) => swipeRepo.create({ ...swipe, session })),
    );
  }
}

function buildResults(scenario: 'institutional' | 'private' | 'individual') {
  if (scenario === 'institutional') {
    return [
      resultRow(
        'LEAD',
        14,
        15,
        93,
        ['Recursos Humanos', 'Coordinacion'],
        'Perfil orientado a liderazgo y coordinacion.',
      ),
      resultRow(
        'NAT',
        13,
        15,
        86,
        ['Veterinaria', 'Agronomia'],
        'Interes sostenido por entornos naturales y concretos.',
      ),
      resultRow(
        'HUM',
        12,
        15,
        80,
        ['Psicologia', 'Trabajo Social'],
        'Aparece una motivacion alta por acompanar personas.',
      ),
    ];
  }
  if (scenario === 'private') {
    return [
      resultRow(
        'SCI',
        15,
        15,
        100,
        ['Laboratorio', 'Bioquimica'],
        'Predomina el analisis riguroso y la curiosidad cientifica.',
      ),
      resultRow(
        'MECH',
        13,
        15,
        86,
        ['Mecanica', 'Electromecanica'],
        'Buen ajuste a tareas tecnicas y resolucion practica.',
      ),
      resultRow(
        'BUS',
        11,
        15,
        73,
        ['Administracion', 'Analisis de datos'],
        'Tambien aparece afinidad por orden y detalle.',
      ),
    ];
  }
  return [
    resultRow(
      'ART',
      14,
      15,
      93,
      ['Diseno grafico', 'Fotografia'],
      'Se observa un componente creativo dominante.',
    ),
    resultRow(
      'HUM',
      13,
      15,
      86,
      ['Docencia', 'Psicopedagogia'],
      'Interes alto por acompanamiento y trabajo interpersonal.',
    ),
    resultRow(
      'SERV',
      12,
      15,
      80,
      ['Hoteleria', 'Eventos'],
      'Buen ajuste a entornos de servicio y contacto directo.',
    ),
  ];
}

function buildSwipes(scenario: 'institutional' | 'private' | 'individual') {
  const categories =
    scenario === 'institutional'
      ? ['LEAD', 'NAT', 'HUM', 'PROT', 'SERV']
      : scenario === 'private'
        ? ['SCI', 'MECH', 'BUS', 'IND', 'PHYS']
        : ['ART', 'HUM', 'SERV', 'LEAD', 'SAL'];

  return categories.map((categoryId, index) => ({
    cardId: `${scenario}-card-${index + 1}`,
    categoryId,
    isLiked: index < 3,
    timestamp: new Date(Date.now() - (index + 1) * 60_000),
  }));
}

function resultRow(
  categoryId: string,
  score: number,
  totalPossible: number,
  percentage: number,
  suggestedCareers: string[],
  materialSnippet: string,
) {
  return {
    categoryId,
    score,
    totalPossible,
    percentage,
    suggestedCareers,
    materialSnippet,
  };
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

void seedMvpScenarios();
