import { PaymentEvent } from './payment-event.entity';
// Removed unused import

describe('PaymentEvent Entity', () => {
  it('should be defined', () => {
    expect(new PaymentEvent()).toBeDefined();
  });

  it('should allow setting properties', () => {
    const event = new PaymentEvent();
    event.gateway = 'STRIPE';
    event.status = 'PENDING';
    event.externalPaymentId = 'ext-123';

    expect(event.gateway).toBe('STRIPE');
    expect(event.status).toBe('PENDING');
    expect(event.externalPaymentId).toBe('ext-123');
  });
});
