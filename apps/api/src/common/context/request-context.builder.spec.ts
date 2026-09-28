import { ForbiddenException } from '@nestjs/common';
import { RequestContextBuilder } from './request-context.builder.js';
import type { AuthenticatedRequest } from '../../auth/auth.types.js';

const buildReq = (
  user: AuthenticatedRequest['user'],
): AuthenticatedRequest =>
  ({
    user,
    headers: {},
    method: 'GET',
    url: '/test',
  }) as unknown as AuthenticatedRequest;

describe('RequestContextBuilder', () => {
  let builder: RequestContextBuilder;

  beforeEach(() => {
    builder = new RequestContextBuilder();
  });

  describe('ADMIN role', () => {
    it('returns SystemContext', () => {
      const ctx = builder.fromRequest(
        buildReq({ userId: 'admin-1', role: 'ADMIN' }),
      );
      expect(ctx.kind).toBe('system');
    });
  });

  describe('INSTITUTION_ADMIN role', () => {
    it('returns InstitutionContext when institutionId is present', () => {
      const ctx = builder.fromRequest(
        buildReq({
          userId: 'ia-1',
          role: 'INSTITUTION_ADMIN',
          institutionId: 'inst-42',
        }),
      );
      expect(ctx).toEqual({
        kind: 'institution',
        userId: 'ia-1',
        institutionId: 'inst-42',
        email: null,
        rawRole: 'INSTITUTION_ADMIN',
      });
    });

    it('throws ForbiddenException when institutionId is missing', () => {
      expect(() =>
        builder.fromRequest(
          buildReq({ userId: 'ia-1', role: 'INSTITUTION_ADMIN' }),
        ),
      ).toThrow(ForbiddenException);
    });
  });

  describe('THERAPIST role', () => {
    it('returns InstitutionContext when institutionId is present', () => {
      const ctx = builder.fromRequest(
        buildReq({
          userId: 'th-1',
          role: 'THERAPIST',
          institutionId: 'inst-99',
        }),
      );
      expect(ctx).toEqual({
        kind: 'institution',
        userId: 'th-1',
        institutionId: 'inst-99',
        email: null,
        rawRole: 'THERAPIST',
      });
    });
  });

  describe('PATIENT role (Firebase)', () => {
    it('returns InstitutionContext when patient belongs to a clinic', () => {
      const ctx = builder.fromRequest(
        buildReq({
          userId: 'pat-1',
          role: 'PATIENT',
          institutionId: 'inst-10',
          email: 'test@example.com',
        }),
      );
      expect(ctx).toEqual({
        kind: 'institution',
        userId: 'pat-1',
        institutionId: 'inst-10',
        email: 'test@example.com',
        rawRole: 'PATIENT',
      });
    });

    it('returns PersonalContext for B2C patient with no institution (legacy)', () => {
      const ctx = builder.fromRequest(
        buildReq({ userId: 'pat-b2c', role: 'PATIENT' }),
      );
      expect(ctx).toEqual({
        kind: 'personal',
        userId: 'pat-b2c',
        email: null,
        rawRole: 'PATIENT',
      });
    });
  });

  describe('Unauthenticated request', () => {
    it('throws ForbiddenException when user is missing', () => {
      expect(() => builder.fromRequest(buildReq(undefined))).toThrow(
        ForbiddenException,
      );
    });
  });
});
