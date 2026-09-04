import { EmailService } from '../../notifications/services/email.service.js';
import { TemplateRendererService } from '../../notifications/services/template-renderer.service.js';
import { PaymentNotificationExecutor } from './payment-notification-executor.service.js';
import type { ClaimedDelivery } from './payment-notification-delivery-state.service.js';

const delivery = (
  overrides: Partial<ClaimedDelivery> = {},
): ClaimedDelivery => ({
  id: 'delivery-1',
  voucherBatchId: 'batch-1',
  recipientKind: 'BUYER',
  recipientUserId: 'user-1',
  recipientEmailSnapshot: 'buyer@example.com',
  recipientNameSnapshot: 'Buyer',
  attemptCount: 1,
  contextSnapshot: {
    version: 1,
    voucherBatchId: 'batch-1',
    checkoutAttemptId: null,
    paymentEventId: 'event-1',
    institution: { id: 'institution-1', name: 'Institution' },
    buyer: null,
    commercial: { pricingPlanId: null, planName: 'Plan', voucherQuantity: 1 },
    charged: null,
    payment: null,
    fulfilledAt: '2025-01-01T00:00:00.000Z',
  },
  ...overrides,
});

describe('PaymentNotificationExecutor', () => {
  const templateRenderer = { renderTemplate: jest.fn() };
  const emailService = { sendEmail: jest.fn() };
  const subject = () =>
    new PaymentNotificationExecutor(
      templateRenderer as unknown as TemplateRendererService,
      emailService as unknown as EmailService,
    );

  beforeEach(() => jest.resetAllMocks());

  it.each([
    [
      'BUYER',
      'buyer@example.com',
      'Compra acreditada - A.kit',
      'payment-confirmation-buyer.pug',
    ],
    [
      'PLATFORM_ADMIN',
      'admin@example.com',
      'Nueva compra acreditada',
      'payment-receipt-admin.pug',
    ],
  ] as const)(
    'sends the mapped %s notification only to its recipient snapshot',
    async (
      recipientKind,
      recipientEmailSnapshot,
      expectedSubject,
      template,
    ) => {
      templateRenderer.renderTemplate.mockReturnValue('<html>email</html>');

      await expect(
        subject().execute(delivery({ recipientKind, recipientEmailSnapshot })),
      ).resolves.toEqual({ status: 'SENT' });

      expect(templateRenderer.renderTemplate).toHaveBeenCalledWith(
        template,
        expect.any(Object),
      );
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        recipientEmailSnapshot,
        expectedSubject,
        '<html>email</html>',
      );
    },
  );

  it('returns a fixed render failure', async () => {
    templateRenderer.renderTemplate.mockImplementation(() => {
      throw new Error('template details');
    });

    await expect(subject().execute(delivery())).resolves.toEqual({
      status: 'RETRYABLE_FAILURE',
      classification: 'RENDER_FAILURE',
      message: 'Email content could not be rendered',
    });
    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });

  it.each([null, 'not-an-email'])(
    'permanently rejects an invalid recipient without using EmailService',
    async (recipientEmailSnapshot) => {
      await expect(
        subject().execute(delivery({ recipientEmailSnapshot })),
      ).resolves.toEqual({
        status: 'PERMANENT_FAILURE',
        classification: 'TRANSPORT_PERMANENT',
        message: 'Email provider rejected the recipient',
      });
      expect(templateRenderer.renderTemplate).not.toHaveBeenCalled();
      expect(emailService.sendEmail).not.toHaveBeenCalled();
    },
  );

  it('returns a fixed transient failure without exposing transport details', async () => {
    templateRenderer.renderTemplate.mockReturnValue('<html>email</html>');
    emailService.sendEmail.mockRejectedValue(new Error('provider secret'));

    await expect(subject().execute(delivery())).resolves.toEqual({
      status: 'RETRYABLE_FAILURE',
      classification: 'TRANSPORT_TRANSIENT',
      message: 'Email provider is temporarily unavailable',
    });
  });
});
