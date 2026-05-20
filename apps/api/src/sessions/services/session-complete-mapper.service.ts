import { Injectable } from '@nestjs/common';
import { VouchersService } from '../../vouchers/vouchers.service.js';
import { CompleteSessionDto } from '../dto/complete-session.dto.js';
import { CreateSessionDto } from '../dto/create-session.dto.js';
import { SessionOwnerResolverService } from './session-owner-resolver.service.js';
import { SessionPayloadMapperService } from './session-payload-mapper.service.js';
import { SessionSyncKeyService } from './session-sync-key.service.js';

export type CompleteSessionAdapted = {
  createSessionDto: CreateSessionDto;
  voucher?: { code: string } | null;
  inferredPatientName: string;
  payloadId?: string | null;
  payloadUserId?: string | null;
  payloadStartedAt?: string;
};

@Injectable()
export class SessionCompleteMapperService {
  constructor(
    private readonly vouchersService: VouchersService,
    private readonly ownerResolver: SessionOwnerResolverService,
    private readonly payloadMapper: SessionPayloadMapperService,
    private readonly syncKeyService: SessionSyncKeyService,
  ) {}

  async toCreateSessionDto(
    payload: CompleteSessionDto,
  ): Promise<CompleteSessionAdapted> {
    const payloadUserId = this.nullIfBlank(payload.userId);
    const payloadTherapistUserId = this.nullIfBlank(payload.therapistUserId);
    const payloadInstitutionId = this.nullIfBlank(payload.institutionId);
    const payloadVoucherCode = this.nullIfBlank(payload.voucherCode);

    const payloadId = this.nullIfBlank(payload.id);

    const context = await this.ownerResolver.resolveContext(
      payloadUserId,
      payloadVoucherCode,
      payloadTherapistUserId,
      payloadInstitutionId,
      payload.patientName,
    );

    const createSessionDto: CreateSessionDto =
      this.payloadMapper.mapToCreateDto(payload, context);

    return {
      createSessionDto,
      voucher: context.voucher ? { code: context.voucher.code } : null,
      inferredPatientName: context.inferredPatientName,
      payloadId,
      payloadUserId,
      payloadStartedAt: payload.startedAt,
    };
  }

  async attachVoucherIfNeeded(
    mapped: CompleteSessionAdapted,
    sessionId: string,
  ): Promise<void> {
    if (!mapped.voucher?.code) return;
    await this.vouchersService.attachVoucherToSession(
      mapped.voucher.code,
      sessionId,
      mapped.inferredPatientName,
    );
  }

  buildSyncKey(
    payloadId: string | null,
    userId: string | null,
    startedAt?: string,
  ): string | null {
    return this.syncKeyService.buildSyncKey(payloadId, userId, startedAt);
  }

  private nullIfBlank(value: unknown): string | null {
    if (typeof value !== 'string') {
      return value == null ? null : String(value);
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}
