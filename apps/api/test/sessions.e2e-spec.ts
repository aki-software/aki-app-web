import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module.js';
import { AuthTokenService } from '../src/auth/services/auth-token.service.js';
import {
  Session,
  SessionPaymentStatus,
} from '../src/sessions/entities/session.entity.js';
import { User, UserRole } from '../src/users/entities/user.entity.js';
import { Institution } from '../src/institutions/entities/institution.entity.js';
import { Voucher } from '../src/vouchers/entities/voucher.entity.js';

describe('SessionsController (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let authTokenService: AuthTokenService;

  // Mock roles and their generated tokens
  let adminToken: string;
  let patientToken: string;
  let patientTokenB: string;
  let institutionTokenX: string;

  // Mock entities
  let sessionPatientA: Session;
  let sessionPatientB: Session;
  let sessionInstXCard: Session;
  let sessionInstXVoucher: Session;
  let sessionInstYVoucher: Session;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get<DataSource>(DataSource);
    authTokenService = app.get<AuthTokenService>(AuthTokenService);

    const userRepo = dataSource.getRepository(User);
    const instRepo = dataSource.getRepository(Institution);
    const batchRepo = dataSource.getRepository('VoucherBatch');
    const sessionRepo = dataSource.getRepository(Session);
    const voucherRepo = dataSource.getRepository(Voucher);

    // 1. Create Institutions
    const instX = await instRepo.save(
      instRepo.create({ name: 'Inst X', billingEmail: 'x@x.com' }),
    );
    const instY = await instRepo.save(
      instRepo.create({ name: 'Inst Y', billingEmail: 'y@y.com' }),
    );

    // 2. Create Users
    const rnd = Date.now();
    const admin = await userRepo.save(
      userRepo.create({
        email: `admin-${rnd}@test.com`,
        name: 'Admin',
        role: UserRole.ADMIN,
        passwordHash: 'hashedpwd',
      }),
    );
    const patientA = await userRepo.save(
      userRepo.create({
        email: `pa-${rnd}@test.com`,
        name: 'PA',
        role: UserRole.PATIENT,
        passwordHash: 'hashedpwd',
      }),
    );
    const patientB = await userRepo.save(
      userRepo.create({
        email: `pb-${rnd}@test.com`,
        name: 'PB',
        role: UserRole.PATIENT,
        passwordHash: 'hashedpwd',
      }),
    );
    const userInstX = await userRepo.save(
      userRepo.create({
        email: `ux-${rnd}@test.com`,
        name: 'UX',
        role: UserRole.INSTITUTION_ADMIN,
        institutionId: instX.id,
        passwordHash: 'hashedpwd',
      }),
    );

    // 3. Generate Tokens
    adminToken = authTokenService.signAccessToken({
      email: admin.email,
      sub: admin.id,
      role: admin.role,
      institutionId: null,
    });
    patientToken = authTokenService.signAccessToken({
      email: patientA.email,
      sub: patientA.id,
      role: patientA.role,
      institutionId: null,
    });
    patientTokenB = authTokenService.signAccessToken({
      email: patientB.email,
      sub: patientB.id,
      role: patientB.role,
      institutionId: null,
    });
    institutionTokenX = authTokenService.signAccessToken({
      email: userInstX.email,
      sub: userInstX.id,
      role: userInstX.role,
      institutionId: instX.id,
    });

    // 4. Create Voucher Batches & Vouchers
    const batchX = await batchRepo.save(
      batchRepo.create({
        ownerType: 'INSTITUTION',
        ownerInstitutionId: instX.id,
        quantity: 1,
        totalPriceCents: 1000,
        currency: 'USD',
        stripePaymentIntentId: `pi_testX_${Date.now()}`,
      }),
    );
    const batchY = await batchRepo.save(
      batchRepo.create({
        ownerType: 'INSTITUTION',
        ownerInstitutionId: instY.id,
        quantity: 1,
        totalPriceCents: 1000,
        currency: 'USD',
        stripePaymentIntentId: `pi_testY_${Date.now()}`,
      }),
    );

    const rndCode = () =>
      Math.random().toString(36).substring(2, 9).toUpperCase();
    const voucherX = await voucherRepo.save(
      voucherRepo.create({
        code: `X${rndCode()}`,
        batchId: batchX.id,
        ownerType: 'INSTITUTION' as any,
        ownerInstitutionId: instX.id,
        status: 'USED' as any,
        redeemedAt: new Date(),
      }),
    );
    const voucherY = await voucherRepo.save(
      voucherRepo.create({
        code: `Y${rndCode()}`,
        batchId: batchY.id,
        ownerType: 'INSTITUTION' as any,
        ownerInstitutionId: instY.id,
        status: 'USED' as any,
        redeemedAt: new Date(),
      }),
    );

    // 5. Create Sessions
    const baseSession = {
      patientName: 'Test Patient',
      sessionDate: new Date(),
      totalTimeMs: 120000,
    };

    sessionPatientA = await sessionRepo.save(
      sessionRepo.create({
        ...baseSession,
        syncKey: `syncA-${Date.now()}`,
        patientId: patientA.id,
        paymentStatus: SessionPaymentStatus.PENDING,
      }),
    );

    sessionPatientB = await sessionRepo.save(
      sessionRepo.create({
        ...baseSession,
        syncKey: `syncB-${Date.now()}`,
        patientId: patientB.id,
        paymentStatus: SessionPaymentStatus.PAID,
      }),
    );

    sessionInstXCard = await sessionRepo.save(
      sessionRepo.create({
        ...baseSession,
        syncKey: `syncXC-${Date.now()}`,
        institutionId: instX.id,
        paymentStatus: SessionPaymentStatus.PAID,
      }),
    );

    sessionInstXVoucher = await sessionRepo.save(
      sessionRepo.create({
        ...baseSession,
        syncKey: `syncXV-${Date.now()}`,
        institutionId: instX.id,
        paymentStatus: SessionPaymentStatus.VOUCHER_REDEEMED,
        voucherId: voucherX.id,
      }),
    );

    sessionInstYVoucher = await sessionRepo.save(
      sessionRepo.create({
        ...baseSession,
        syncKey: `syncYV-${Date.now()}`,
        institutionId: instY.id,
        paymentStatus: SessionPaymentStatus.VOUCHER_REDEEMED,
        voucherId: voucherY.id,
      }),
    );
  });

  afterAll(async () => {
    // Cleanup generated sessions
    const sessionRepo = dataSource.getRepository(Session);
    await sessionRepo.delete([
      sessionPatientA.id,
      sessionPatientB.id,
      sessionInstXCard.id,
      sessionInstXVoucher.id,
      sessionInstYVoucher.id,
    ]);
    await app.close();
  });

  describe('Security Boundaries (IDOR & Monetization Bypass)', () => {
    it('GET /sessions/:id - Patient A cannot access Patient B session (IDOR)', () => {
      return request(app.getHttpServer())
        .get(`/sessions/${sessionPatientB.id}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(404); // Should not find it because scope filters it out
    });

    it('GET /sessions/:id - Patient A CAN access their own session', () => {
      return request(app.getHttpServer())
        .get(`/sessions/${sessionPatientA.id}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);
    });

    it('POST /sessions/:id/send-report - Fails if session is not PAID (Monetization Bypass)', () => {
      return request(app.getHttpServer())
        .post(`/sessions/${sessionPatientA.id}/send-report`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ email: 'test@example.com' })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('payment');
        });
    });

    it('POST /sessions/:id/send-report - Fails if not authenticated', () => {
      return request(app.getHttpServer())
        .post(`/sessions/${sessionPatientB.id}/send-report`)
        .send({ email: 'test@example.com' })
        .expect(401);
    });
  });

  describe('Authorization Scope (GET /sessions)', () => {
    it('ADMIN - Should ONLY see sessions WITHOUT vouchers (Card/Pending)', async () => {
      const response = await request(app.getHttpServer())
        .get('/sessions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const items: any[] =
        response.body.data || response.body.items || response.body;
      const ids = items.map((i) => i.id);

      // Must see Card and Pending without vouchers
      expect(ids).toContain(sessionPatientA.id);
      expect(ids).toContain(sessionPatientB.id);
      expect(ids).toContain(sessionInstXCard.id);

      // Must NOT see Voucher redeemed sessions
      expect(ids).not.toContain(sessionInstXVoucher.id);
      expect(ids).not.toContain(sessionInstYVoucher.id);
    });

    it('INSTITUTION X - Should ONLY see sessions with their institutionId AND a voucher', async () => {
      const response = await request(app.getHttpServer())
        .get('/sessions')
        .set('Authorization', `Bearer ${institutionTokenX}`)
        .expect(200);

      const items: any[] =
        response.body.data || response.body.items || response.body;
      const ids = items.map((i) => i.id);

      // Must see their voucher session
      expect(ids).toContain(sessionInstXVoucher.id);

      // Must NOT see their card session
      expect(ids).not.toContain(sessionInstXCard.id);

      // Must NOT see other institution's sessions
      expect(ids).not.toContain(sessionInstYVoucher.id);

      // Must NOT see global patient sessions
      expect(ids).not.toContain(sessionPatientA.id);
      expect(ids).not.toContain(sessionPatientB.id);
    });

    it('PATIENT - Should ONLY see their own sessions regardless of payment', async () => {
      const response = await request(app.getHttpServer())
        .get('/sessions')
        .set('Authorization', `Bearer ${patientTokenB}`)
        .expect(200);

      const items: any[] =
        response.body.data || response.body.items || response.body;
      const ids = items.map((i) => i.id);

      expect(ids).toContain(sessionPatientB.id);
      expect(ids).not.toContain(sessionPatientA.id);
      expect(ids).not.toContain(sessionInstXCard.id);
    });
  });
});
