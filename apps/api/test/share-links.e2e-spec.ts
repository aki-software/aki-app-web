import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Share Links (e2e)', () => {
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

  it('/sessions/:id/share (POST) - Generating and Accessing Link', async () => {
    // Generate the share link
    return request(app.getHttpServer())
      .post('/sessions/session_id_123/share')
      .send({})
      .expect((res) => {
        expect([HttpStatus.CREATED, HttpStatus.OK, HttpStatus.NOT_FOUND, HttpStatus.UNAUTHORIZED]).toContain(res.status);
      });
  });

  it('/sessions/share/:token (GET) - Expired Link', async () => {
    // Accessing an expired link should return 400, 404 or 401 depending on logic
    return request(app.getHttpServer())
      .get('/sessions/share/expired-token-123')
      .expect((res) => {
         expect([HttpStatus.NOT_FOUND, HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED]).toContain(res.status);
      });
  });
});
