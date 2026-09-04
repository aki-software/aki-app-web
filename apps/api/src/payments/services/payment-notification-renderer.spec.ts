jest.mock(
  '@akit/design-tokens',
  () => ({
    colors: {
      background: { light: '#fff' },
      text: { primary: '#111', secondary: '#333' },
      surface: { light: '#fff', variantLight: '#eee' },
      primary: { DEFAULT: '#000' },
      tertiary: { DEFAULT: '#555' },
      outline: { light: '#666' },
    },
  }),
  { virtual: true },
);

import type { PaymentNotificationContextSnapshotV1 } from '@akit/contracts';
import { TemplateRendererService } from '../../notifications/services/template-renderer.service.js';
import {
  mapPaymentNotificationRender,
  type PaymentNotificationRenderInput,
} from './payment-notification-renderer.js';

const snapshot: PaymentNotificationContextSnapshotV1 = {
  version: 1,
  voucherBatchId: '11111111-1111-4111-8111-111111111111',
  checkoutAttemptId: '22222222-2222-4222-8222-222222222222',
  paymentEventId: '33333333-3333-4333-8333-333333333333',
  institution: {
    id: '44444444-4444-4444-8444-444444444444',
    name: 'Institución <script>alert(1)</script>',
  },
  buyer: {
    userId: '55555555-5555-4555-8555-555555555555',
    name: 'Comprador <script>alert(2)</script>',
    email: 'buyer@example.com',
  },
  commercial: {
    pricingPlanId: '66666666-6666-4666-8666-666666666666',
    planName: 'Plan anual',
    voucherQuantity: 12,
  },
  charged: { amountMinor: '123456', currency: 'USD' },
  payment: {
    gateway: 'STRIPE',
    externalReference: 'safe-reference',
    settledAt: '2025-01-02T03:04:05.000Z',
  },
  fulfilledAt: '2025-01-02T03:04:05.000Z',
};

function delivery(
  recipientKind: 'BUYER' | 'PLATFORM_ADMIN',
): PaymentNotificationRenderInput {
  return {
    recipientKind,
    recipientNameSnapshot: recipientKind === 'BUYER' ? 'Ana' : 'Admin',
    contextSnapshot: snapshot,
  };
}

describe('mapPaymentNotificationRender', () => {
  it('routes the buyer through an allowlisted purchase model', () => {
    const result = mapPaymentNotificationRender(delivery('BUYER'));

    expect(result).toEqual({
      subject: 'Compra acreditada - A.kit',
      template: 'payment-confirmation-buyer.pug',
      model: {
        recipientName: 'Ana',
        institutionName: 'Institución <script>alert(1)</script>',
        planName: 'Plan anual',
        voucherQuantity: 12,
        chargedAmount: 'USD 1,234.56',
        fulfilledAt: '02/01/2025, 03:04 UTC',
        gateway: 'STRIPE',
        paymentReference: 'safe-reference',
      },
    });
    expect(Object.keys(result.model)).toEqual([
      'recipientName',
      'institutionName',
      'planName',
      'voucherQuantity',
      'chargedAmount',
      'fulfilledAt',
      'gateway',
      'paymentReference',
    ]);
    expect(JSON.stringify(result.model)).not.toMatch(
      /contextSnapshot|voucherCode|rawPayload|body/i,
    );
  });

  it('routes the platform admin and safely omits unavailable optional values', () => {
    const result = mapPaymentNotificationRender({
      ...delivery('PLATFORM_ADMIN'),
      contextSnapshot: {
        ...snapshot,
        checkoutAttemptId: null,
        buyer: null,
        commercial: {
          ...snapshot.commercial,
          pricingPlanId: null,
          planName: null,
        },
        charged: null,
        payment: null,
      },
    });

    expect(result).toEqual({
      subject: 'Nueva compra acreditada',
      template: 'payment-receipt-admin.pug',
      model: {
        recipientName: 'Admin',
        institutionId: '44444444-4444-4444-8444-444444444444',
        institutionName: 'Institución <script>alert(1)</script>',
        buyerName: null,
        buyerEmail: null,
        pricingPlanId: null,
        planName: 'Compra de vouchers',
        voucherQuantity: 12,
        chargedAmount: null,
        voucherBatchId: '11111111-1111-4111-8111-111111111111',
        checkoutAttemptId: null,
        gateway: null,
        paymentReference: null,
        fulfilledAt: '02/01/2025, 03:04 UTC',
      },
    });
  });

  it('renders hostile snapshot text escaped in both recipient templates', () => {
    const renderer = new TemplateRendererService();
    const buyer = mapPaymentNotificationRender(delivery('BUYER'));
    const admin = mapPaymentNotificationRender(delivery('PLATFORM_ADMIN'));

    const buyerHtml = renderer.renderTemplate(buyer.template, buyer.model);
    const adminHtml = renderer.renderTemplate(admin.template, admin.model);

    for (const html of [buyerHtml, adminHtml]) {
      expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(html).not.toContain('<script>alert(1)</script>');
      expect(html).not.toContain('voucherCode');
    }
    expect(buyerHtml).toContain('Compra acreditada');
    expect(adminHtml).toContain('Nueva compra acreditada');
  });
});
