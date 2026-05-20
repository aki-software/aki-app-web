import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Institution } from './entities/institution.entity.js';
import { InstitutionsController } from './institutions.controller.js';
import { InstitutionsService } from './institutions.service.js';
import { InstitutionAnalyticsService } from './services/institution-analytics.service.js';
import { InstitutionOperationalAccountService } from './services/institution-operational-account.service.js';
import { InstitutionPresenterService } from './services/institution-presenter.service.js';
import { UsersModule } from '../users/users.module.js';
import { MailModule } from '../mail/mail.module.js';
import { CategoriesModule } from '../categories/categories.module.js';
import { Voucher } from '../vouchers/entities/voucher.entity.js';
import { Session } from '../sessions/entities/session.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Institution, Voucher, Session]),
    UsersModule,
    MailModule,
    CategoriesModule,
  ],
  controllers: [InstitutionsController],
  providers: [
    InstitutionsService,
    InstitutionOperationalAccountService,
    InstitutionAnalyticsService,
    InstitutionPresenterService,
  ],
  exports: [TypeOrmModule, InstitutionsService],
})
export class InstitutionsModule {}

