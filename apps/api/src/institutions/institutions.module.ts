import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Institution } from './entities/institution.entity';
import { InstitutionsController } from './institutions.controller';
import { InstitutionsService } from './institutions.service';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';
import { Voucher } from '../vouchers/entities/voucher.entity';
import { Session } from '../sessions/entities/session.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Institution, Voucher, Session]),
    UsersModule,
    MailModule,
  ],
  controllers: [InstitutionsController],
  providers: [InstitutionsService],
  exports: [TypeOrmModule, InstitutionsService],
})
export class InstitutionsModule {}
