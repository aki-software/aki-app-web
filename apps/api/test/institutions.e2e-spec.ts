import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { AuthTokenService } from '../src/auth/services/auth-token.service';
import { User, UserRole } from '../src/users/entities/user.entity';
import { Institution } from '../src/institutions/entities/institution.entity';
import { StorageService } from '../src/common/services/storage.service';

describe('InstitutionsController (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let authTokenService: AuthTokenService;
  let storageService: StorageService;

  let instAdminToken: string;
  let therapistToken: string;
  let institutionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(StorageService)
      .useValue({
        getPresignedUploadUrl: jest
          .fn()
          .mockResolvedValue('https://mock-s3-url.com/upload'),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get<DataSource>(DataSource);
    authTokenService = app.get<AuthTokenService>(AuthTokenService);
    storageService = app.get<StorageService>(StorageService);

    const userRepo = dataSource.getRepository(User);
    const instRepo = dataSource.getRepository(Institution);

    // Create Institution
    const inst = await instRepo.save(
      instRepo.create({
        name: 'Test Inst Logo',
        billingEmail: 'logo@test.com',
      }),
    );
    institutionId = inst.id;

    // Create Users
    const rnd = Date.now();
    const instAdmin = await userRepo.save(
      userRepo.create({
        email: `admin-${rnd}@test.com`,
        name: 'Inst Admin',
        role: UserRole.INSTITUTION_ADMIN,
        institutionId: inst.id,
        passwordHash: 'hashed',
      }),
    );

    const therapist = await userRepo.save(
      userRepo.create({
        email: `therapist-${rnd}@test.com`,
        name: 'Therapist',
        role: UserRole.THERAPIST,
        institutionId: inst.id,
        passwordHash: 'hashed',
      }),
    );

    // Generate Tokens
    instAdminToken = authTokenService.signAccessToken({
      email: instAdmin.email,
      sub: instAdmin.id,
      role: instAdmin.role,
      institutionId: inst.id,
    });

    therapistToken = authTokenService.signAccessToken({
      email: therapist.email,
      sub: therapist.id,
      role: therapist.role,
      institutionId: inst.id,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Logo Upload', () => {
    it('GIVEN an Institution Admin WHEN requesting upload URL THEN returns { uploadUrl, fileKey }', async () => {
      const res = await request(app.getHttpServer())
        .post(`/institutions/${institutionId}/logo/upload-url`)
        .set('Authorization', `Bearer ${instAdminToken}`)
        .send({ mimeType: 'image/png' })
        .expect(201);

      expect(res.body).toHaveProperty(
        'uploadUrl',
        'https://mock-s3-url.com/upload',
      );
      expect(res.body).toHaveProperty('fileKey');
      expect(res.body.fileKey).toContain(`institutions/${institutionId}/logo/`);
    });

    it('GIVEN a Therapist linked to an institution WHEN requesting upload URL THEN returns 403', async () => {
      await request(app.getHttpServer())
        .post(`/institutions/${institutionId}/logo/upload-url`)
        .set('Authorization', `Bearer ${therapistToken}`)
        .send({ mimeType: 'image/png' })
        .expect(403);
    });

    it('GIVEN a valid fileKey WHEN PATCH /logo is called THEN logoUrl is updated in DB', async () => {
      const fileKey = `institutions/${institutionId}/logo/test.png`;
      await request(app.getHttpServer())
        .patch(`/institutions/${institutionId}/logo`)
        .set('Authorization', `Bearer ${instAdminToken}`)
        .send({ fileKey })
        .expect(200);

      // Verify DB update
      const instRepo = dataSource.getRepository(Institution);
      const updatedInst = await instRepo.findOne({
        where: { id: institutionId },
      });
      expect(updatedInst?.logoUrl).toBe(fileKey);
    });
  });
});
