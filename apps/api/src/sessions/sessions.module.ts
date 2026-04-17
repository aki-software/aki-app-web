import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesModule } from '../categories/categories.module';
import { VocationalCategory } from '../categories/entities/vocational-category.entity';
import { CommonModule } from '../common/common.module';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';
import { Voucher } from '../vouchers/entities/voucher.entity';
import { VouchersModule } from '../vouchers/vouchers.module';
import { SessionResult } from './entities/session-result.entity';
import { SessionSwipe } from './entities/session-swipe.entity';
import { Session } from './entities/session.entity';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { ReportService } from './services/report.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Session,
      SessionResult,
      SessionSwipe,
      Voucher,
      VocationalCategory,
    ]),
    CategoriesModule,
    MailModule,
    UsersModule,
    CommonModule,
    VouchersModule,
  ],
  controllers: [SessionsController],
  providers: [SessionsService, ReportService],
  exports: [SessionsService],
})
export class SessionsModule {}
