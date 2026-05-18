import { Module } from '@nestjs/common';
import { MailModule } from '../../mail/mail.module.js';
import { PasswordResetNotifierService } from './password-reset-notifier.service.js';
import { AccountActivationNotifierService } from './account-activation-notifier.service.js';

@Module({
  imports: [MailModule],
  providers: [PasswordResetNotifierService, AccountActivationNotifierService],
  exports: [PasswordResetNotifierService, AccountActivationNotifierService],
})
export class NotificationsModule {}
