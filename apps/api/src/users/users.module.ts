import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { UserRegistrationService } from './user-registration.service.js';
import { Institution } from '../institutions/entities/institution.entity.js';
import { MailModule } from '../mail/mail.module.js';
import { NotificationsModule } from '../common/notifications/notifications.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Institution]),
    MailModule,
    NotificationsModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, UserRegistrationService],
  exports: [UsersService, UserRegistrationService],
})
export class UsersModule {}
