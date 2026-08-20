import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationsListener } from './notifications.listener.js';
import { TemplateRendererService } from './services/template-renderer.service.js';
import { EmailService } from './services/email.service.js';
import { MAIL_TRANSPORT_TOKEN } from './transports/mail-transport.interface.js';
import { SmtpTransportService } from './transports/smtp-transport.service.js';
import { ResendTransportService } from './transports/resend-transport.service.js';
import { AccountActivationHandler } from './handlers/account-activation.handler.js';
import { PasswordResetHandler } from './handlers/password-reset.handler.js';
import { VoucherAssignedHandler } from './handlers/voucher-assigned.handler.js';
import { VoucherBatchAssignedHandler } from './handlers/voucher-batch-assigned.handler.js';
import { ReportGeneratedHandler } from './handlers/report-generated.handler.js';
import { EmailRequestedHandler } from './handlers/email-requested.handler.js';
import { PaymentNotificationHandler } from './handlers/payment-notification.handler.js';

const handlers = [
  AccountActivationHandler,
  PasswordResetHandler,
  VoucherAssignedHandler,
  VoucherBatchAssignedHandler,
  ReportGeneratedHandler,
  EmailRequestedHandler,
  PaymentNotificationHandler,
];

@Module({
  imports: [ConfigModule],
  providers: [
    NotificationsListener,
    TemplateRendererService,
    EmailService,
    ...handlers,
    {
      provide: MAIL_TRANSPORT_TOKEN,
      useFactory: (configService: ConfigService) => {
        const transportType = configService.get<string>(
          'MAIL_TRANSPORT_TYPE',
          'smtp',
        );

        if (transportType === 'resend' || transportType === 'pro') {
          const resendApiKey =
            configService.get<string>('RESEND_API_KEY') ||
            configService.get<string>('MAIL_PRO_PASS', '');
          return new ResendTransportService(resendApiKey);
        }

        return new SmtpTransportService(
          configService.get<string>('SMTP_HOST', 'sandbox.smtp.mailtrap.io'),
          configService.get<number>('SMTP_PORT', 2525),
          configService.get<string>('SMTP_USER', ''),
          configService.get<string>('SMTP_PASS', ''),
        );
      },
      inject: [ConfigService],
    },
  ],
  exports: [
    NotificationsListener,
    TemplateRendererService,
    EmailService,
    ...handlers,
  ],
})
export class NotificationsModule {}
