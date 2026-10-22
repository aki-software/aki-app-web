import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { UserRegistrationService } from './user-registration.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([User]), forwardRef(() => AuthModule)],
  controllers: [UsersController],
  providers: [UsersService, UserRegistrationService],
  exports: [UsersService, UserRegistrationService],
})
export class UsersModule {}
