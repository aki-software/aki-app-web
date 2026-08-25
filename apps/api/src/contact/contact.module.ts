import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [NotificationsModule],
  controllers: [ContactController],
})
export class ContactModule {}
