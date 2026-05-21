import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Voucher } from '../../vouchers/entities/voucher.entity.js';
import { Session } from '../../sessions/entities/session.entity.js';
import { VoucherRedemptionService } from '../services/voucher-redemption.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Voucher, Session])],
  providers: [VoucherRedemptionService],
  exports: [VoucherRedemptionService],
})
export class VoucherRedemptionModule {}
