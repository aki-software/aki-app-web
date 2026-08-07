import { Test, TestingModule } from '@nestjs/testing';
import { PaymentNotificationHandler } from './payment-notification.handler';
import { TemplateRendererService } from '../services/template-renderer.service';
import { EmailService } from '../services/email.service';

describe('PaymentNotificationHandler', () => {
  let handler: PaymentNotificationHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentNotificationHandler,
        { provide: TemplateRendererService, useValue: { renderTemplate: jest.fn() } },
        { provide: EmailService, useValue: { sendEmail: jest.fn() } },
      ],
    }).compile();
    handler = module.get<PaymentNotificationHandler>(
      PaymentNotificationHandler,
    );
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });
});
