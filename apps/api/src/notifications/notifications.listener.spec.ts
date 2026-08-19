import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsListener } from './notifications.listener.js';
import {
  UserRegisteredEvent,
  PaymentVerifiedEvent,
  ReportFailedEvent,
} from '../events/domain-events.js';

describe('NotificationsListener', () => {
  let listener: NotificationsListener;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationsListener],
    }).compile();

    listener = module.get<NotificationsListener>(NotificationsListener);
  });

  it('should be defined', () => {
    expect(listener).toBeDefined();
  });

  it('should handle user.registered event', () => {
    expect(() =>
      listener.handleUserRegisteredEvent(
        new UserRegisteredEvent('user-1', 'test@test.com'),
      ),
    ).not.toThrow();
  });

  it('should handle payment.verified event', () => {
    expect(() =>
      listener.handlePaymentVerifiedEvent(
        new PaymentVerifiedEvent('pay-1', 'test@test.com'),
      ),
    ).not.toThrow();
  });

  it('should handle report.failed event', () => {
    expect(() =>
      listener.handleReportFailedEvent(
        new ReportFailedEvent('job-1', 'Timeout'),
      ),
    ).not.toThrow();
  });
});
