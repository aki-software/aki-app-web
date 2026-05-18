import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatsService } from './stats.service.js';
import { StatsController } from './stats.controller.js';
import { Voucher } from '../vouchers/entities/voucher.entity.js';
import { StatsAccessService } from './services/stats-access.service.js';
import { VoucherAlertsService } from './services/voucher-alerts.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Voucher])],
  controllers: [StatsController],
  providers: [StatsService, StatsAccessService, VoucherAlertsService],
})
export class StatsModule {}
