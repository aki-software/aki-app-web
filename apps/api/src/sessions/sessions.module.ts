import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { V1SessionsController } from './v1-sessions.controller';
import { Session } from './entities/session.entity';
import { SessionResult } from './entities/session-result.entity';
import { SessionSwipe } from './entities/session-swipe.entity';
import { CategoriesModule } from '../categories/categories.module';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Session, SessionResult, SessionSwipe]),
    CategoriesModule,
    MailModule,
    UsersModule,
  ],
  controllers: [SessionsController, V1SessionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
