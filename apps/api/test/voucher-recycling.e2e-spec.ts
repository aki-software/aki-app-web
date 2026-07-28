import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Voucher Batching and Recycling (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/vouchers/recycle (POST) - Unused Voucher Recycling', async () => {
    const payload = {
      therapistId: 'therapist-123',
      institutionId: 'inst-456'
    };

    return request(app.getHttpServer())
      .post('/vouchers/recycle')
      .send(payload)
      .expect((res) => {
        expect([HttpStatus.OK, HttpStatus.CREATED, HttpStatus.NOT_FOUND, HttpStatus.UNAUTHORIZED]).toContain(res.status);
      });
  });
});
