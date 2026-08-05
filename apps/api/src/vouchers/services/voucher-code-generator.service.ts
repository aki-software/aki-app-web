import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Voucher } from '../entities/voucher.entity.js';
import { VoucherBatch } from '../entities/voucher-batch.entity.js';
import { VOUCHER_CONFIG } from '../vouchers.constants.js';

@Injectable()
export class VoucherCodeGenerator {
  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
    @InjectRepository(VoucherBatch)
    private readonly voucherBatchRepository: Repository<VoucherBatch>,
  ) {}

  async generateUniqueBatchCode(): Promise<string> {
    for (
      let attempt = 0;
      attempt < VOUCHER_CONFIG.GENERATION_ATTEMPTS;
      attempt++
    ) {
      const raw = randomBytes(4).toString('base64url').toUpperCase();
      const code = raw.replace(/[^A-Z0-9]/g, '').slice(0, 5);

      if (code.length < 4) continue;

      const existing = await this.voucherBatchRepository.findOne({
        where: { shortCode: code },
        select: ['id'],
      });

      if (!existing) return code;
    }
    throw new BadRequestException(
      'No se pudo generar un código de lote único después de varios intentos',
    );
  }

  async generateUniqueCode(): Promise<string> {
    for (
      let attempt = 0;
      attempt < VOUCHER_CONFIG.GENERATION_ATTEMPTS;
      attempt++
    ) {
      const raw = randomBytes(6).toString('base64url').toUpperCase();
      const code = raw
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, VOUCHER_CONFIG.CODE_LENGTH);

      if (code.length !== VOUCHER_CONFIG.CODE_LENGTH) continue;

      const existing = await this.voucherRepository.findOne({
        where: { code },
        select: ['id'], // Optimization: only select ID
      });

      if (!existing) return code;
    }

    throw new BadRequestException(
      'No se pudo generar un código de voucher único después de varios intentos',
    );
  }

  normalize(code: string): string {
    return code.trim().toUpperCase();
  }
}
