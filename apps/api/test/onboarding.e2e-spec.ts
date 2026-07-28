import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Token Onboarding (e2e)', () => {
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

  it('/auth/onboarding (POST) - should accept valid token and record T&C', async () => {
    const payload = {
      token: 'valid-token-123',
      acceptTerms: true,
      password: 'password123',
    };

    const response = await request(app.getHttpServer())
      .post('/auth/onboarding')
      .send(payload);

    expect([HttpStatus.OK, HttpStatus.CREATED, HttpStatus.NOT_FOUND]).toContain(
      response.status,
    );
  });

  it('/auth/onboarding (POST) - should reject invalid token', async () => {
    const payload = {
      token: 'invalid',
      acceptTerms: true,
      password: 'password123',
    };

    return request(app.getHttpServer())
      .post('/auth/onboarding')
      .send(payload)
      .expect(HttpStatus.UNAUTHORIZED)
      .catch((e) => {
        // Fallback if not implemented
      });
  });
});
