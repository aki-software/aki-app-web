import type { ClaimedDelivery } from './payment-notification-delivery-state.service.js';

export type PaymentNotificationRenderInput = Pick<
  ClaimedDelivery,
  'recipientKind' | 'recipientNameSnapshot' | 'contextSnapshot'
>;

type BuyerRenderModel = {
  recipientName: string;
  institutionName: string;
  planName: string;
  voucherQuantity: number;
  chargedAmount: string | null;
  fulfilledAt: string;
  gateway: string | null;
  paymentReference: string | null;
};

type AdminRenderModel = {
  recipientName: string;
  institutionId: string;
  institutionName: string;
  buyerName: string | null;
  buyerEmail: string | null;
  pricingPlanId: string | null;
  planName: string;
  voucherQuantity: number;
  chargedAmount: string | null;
  voucherBatchId: string;
  checkoutAttemptId: string | null;
  gateway: string | null;
  paymentReference: string | null;
  fulfilledAt: string;
};

export type PaymentNotificationRender =
  | {
      subject: 'Compra acreditada - A.kit';
      template: 'payment-confirmation-buyer.pug';
      model: BuyerRenderModel;
    }
  | {
      subject: 'Nueva compra acreditada';
      template: 'payment-receipt-admin.pug';
      model: AdminRenderModel;
    };

export function mapPaymentNotificationRender(
  delivery: PaymentNotificationRenderInput,
): PaymentNotificationRender {
  const { contextSnapshot: context } = delivery;
  const shared = {
    recipientName: display(delivery.recipientNameSnapshot) ?? 'Cliente',
    institutionName: display(context.institution.name) ?? 'Tu institución',
    planName: display(context.commercial.planName) ?? 'Compra de vouchers',
    voucherQuantity: context.commercial.voucherQuantity,
    chargedAmount: formatAmount(context.charged),
    fulfilledAt: formatDate(context.fulfilledAt),
    gateway: context.payment ? display(context.payment.gateway) : null,
    paymentReference: context.payment
      ? display(context.payment.externalReference)
      : null,
  };

  if (delivery.recipientKind === 'BUYER') {
    return {
      subject: 'Compra acreditada - A.kit',
      template: 'payment-confirmation-buyer.pug',
      model: shared,
    };
  }

  return {
    subject: 'Nueva compra acreditada',
    template: 'payment-receipt-admin.pug',
    model: {
      ...shared,
      institutionId: context.institution.id,
      buyerName: context.buyer ? display(context.buyer.name) : null,
      buyerEmail: context.buyer ? display(context.buyer.email) : null,
      pricingPlanId: context.commercial.pricingPlanId,
      voucherBatchId: context.voucherBatchId,
      checkoutAttemptId: context.checkoutAttemptId,
    },
  };
}

function display(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function formatAmount(
  charged: PaymentNotificationRenderInput['contextSnapshot']['charged'],
): string | null {
  if (
    !charged ||
    !/^\d+$/.test(charged.amountMinor) ||
    !/^[A-Z]{3}$/.test(charged.currency)
  ) {
    return null;
  }
  const minor = charged.amountMinor.padStart(3, '0');
  const whole = minor.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${charged.currency} ${whole}.${minor.slice(-2)}`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime()))
    return 'Fecha de acreditación no disponible';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}, ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`;
}
