import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Voucher } from './entities/voucher.entity.js';
import { VoucherBatch } from './entities/voucher-batch.entity.js';
import { VouchersController } from './vouchers.controller.js';
import { VouchersService } from './vouchers.service.js';
import { UsersModule } from '../users/users.module.js';
import { MailModule } from '../mail/mail.module.js';

import { VoucherNotifierService } from './voucher-notifier.service.js';
import { VoucherQueryService } from './voucher-query.service.js';
import { VoucherAccessService } from './services/voucher-access.service.js';
import { VoucherCodeGenerator } from './services/voucher-code-generator.service.js';
import { VoucherOwnerResolver } from './services/voucher-owner-resolver.service.js';
import { SessionsModule } from '../sessions/sessions.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Voucher, VoucherBatch]),
    UsersModule,
    MailModule,
    forwardRef(() => SessionsModule),
  ],
  controllers: [VouchersController],
  providers: [
    VouchersService,
    VoucherNotifierService,
    VoucherQueryService,
    VoucherAccessService,
    VoucherCodeGenerator,
    VoucherOwnerResolver,
  ],
  exports: [VouchersService, TypeOrmModule],
})
export class VouchersModule {}
