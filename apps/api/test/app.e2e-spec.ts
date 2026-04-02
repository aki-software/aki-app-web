import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/sessions/:id/send-report (POST) rejects unauthenticated request', () => {
    return request(app.getHttpServer())
      .post('/sessions/test-session-id/send-report')
      .send({ email: 'test@example.com' })
      .expect(401);
  });

  it('/vouchers/:id/send-email (POST) rejects unauthenticated request', () => {
    return request(app.getHttpServer())
      .post('/vouchers/test-voucher-id/send-email')
      .send({ email: 'test@example.com' })
      .expect(401);
  });
});
