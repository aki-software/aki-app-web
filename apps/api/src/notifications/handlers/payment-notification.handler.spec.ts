import { Test, TestingModule } from '@nestjs/testing';
import { PaymentNotificationHandler } from './payment-notification.handler';

describe('PaymentNotificationHandler', () => {
  let handler: PaymentNotificationHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentNotificationHandler,
        { provide: 'BullQueue_email', useValue: { add: jest.fn() } },
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
