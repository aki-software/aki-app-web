import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Voucher } from './entities/voucher.entity.js';
import { VoucherBatch } from './entities/voucher-batch.entity.js';
import { VouchersController } from './vouchers.controller.js';
import { VouchersService } from './vouchers.service.js';
import { UsersModule } from '../users/users.module.js';
import { MailModule } from '../mail/mail.module.js';

import { VoucherNotifierService } from './voucher-notifier.service.js';
import { VoucherQueryService } from './voucher-query.service.js';
import { VoucherCodeGenerator } from './services/voucher-code-generator.service.js';
import { VoucherOwnerResolver } from './services/voucher-owner-resolver.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Voucher, VoucherBatch]),
    UsersModule,
    MailModule,
  ],
  controllers: [VouchersController],
  providers: [
    VouchersService,
    VoucherNotifierService,
    VoucherQueryService,
    VoucherCodeGenerator,
    VoucherOwnerResolver,
  ],
  exports: [VouchersService, TypeOrmModule],
})
export class VouchersModule {}
