import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Institution } from './entities/institution.entity';
import { InstitutionsController } from './institutions.controller';
import { InstitutionsService } from './institutions.service';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [TypeOrmModule.forFeature([Institution]), UsersModule, MailModule],
  controllers: [InstitutionsController],
  providers: [InstitutionsService],
  exports: [TypeOrmModule, InstitutionsService],
})
export class InstitutionsModule {}
