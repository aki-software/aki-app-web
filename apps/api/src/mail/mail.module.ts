import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailService } from './mail.service.js';
import { TemplateRendererService } from './services/template-renderer.service.js';
import { MAIL_TRANSPORT_TOKEN } from './transports/mail-transport.interface.js';
import { SmtpTransportService } from './transports/smtp-transport.service.js';
import { ResendTransportService } from './transports/resend-transport.service.js';

@Module({
  imports: [ConfigModule],
  providers: [
    MailService,
    TemplateRendererService,
    {
      provide: MAIL_TRANSPORT_TOKEN,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const type = configService.get<string>('MAIL_TRANSPORT_TYPE', 'smtp');
        if (type === 'resend') {
          const apiKey = configService.get<string>('MAIL_PRO_PASS', '');
          return new ResendTransportService(apiKey);
        } else {
          const host = configService.get<string>(
            'SMTP_HOST',
            'sandbox.smtp.mailtrap.io',
          );
          const port = Number(configService.get<number>('SMTP_PORT', 2525));
          const user = configService.get<string>('SMTP_USER', '');
          const pass = configService.get<string>('SMTP_PASS', '');
          return new SmtpTransportService(host, port, user, pass);
        }
      },
    },
  ],
  exports: [MailService],
})
export class MailModule {}
