import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Voucher } from './entities/voucher.entity';
import { VoucherBatch } from './entities/voucher-batch.entity';
import { VouchersController } from './vouchers.controller';
import { VouchersService } from './vouchers.service';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Voucher, VoucherBatch]), 
    UsersModule, 
    MailModule
  ],
  controllers: [VouchersController],
  providers: [VouchersService],
  exports: [TypeOrmModule, VouchersService],
})
export class VouchersModule {}
