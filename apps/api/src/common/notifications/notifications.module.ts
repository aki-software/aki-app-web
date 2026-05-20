import { Module } from '@nestjs/common';
import { MailModule } from '../../mail/mail.module.js';
import { CommonModule } from '../common.module.js';
import { PasswordResetNotifierService } from './password-reset-notifier.service.js';
import { AccountActivationNotifierService } from './account-activation-notifier.service.js';

@Module({
  imports: [MailModule, CommonModule],
  providers: [PasswordResetNotifierService, AccountActivationNotifierService],
  exports: [PasswordResetNotifierService, AccountActivationNotifierService],
})
export class NotificationsModule {}
