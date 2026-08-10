import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Voucher } from './entities/voucher.entity.js';
import {
  VoucherAssignedEvent,
  VoucherBatchAssignedEvent,
} from '../events/domain-events.js';

@Injectable()
export class VoucherNotifierService {
  private readonly logger = new Logger(VoucherNotifierService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {}

  async sendVoucherEmail(
    voucher: Voucher,
    targetEmail: string,
  ): Promise<boolean> {
    this.logger.log(
      `Emitting voucher.assigned event for voucher ${voucher.id} to ${targetEmail}`,
    );
    await this.eventEmitter.emitAsync(
      'voucher.assigned',
      new VoucherAssignedEvent(
        voucher.id,
        targetEmail,
        voucher.code,
        voucher.assignedPatientName ?? null,
      ),
    );
    return true;
  }

  async notifyBatchAssignment(
    targetEmail: string,
    institutionName: string,
    quantity: number,
    expiresAt: Date | null,
  ): Promise<boolean> {
    this.logger.log(
      `Emitting voucher.batch.assigned event to ${targetEmail} for institution ${institutionName}`,
    );
    await this.eventEmitter.emitAsync(
      'voucher.batch.assigned',
      new VoucherBatchAssignedEvent(
        targetEmail,
        institutionName,
        quantity,
        expiresAt,
      ),
    );
    return true;
  }
}
