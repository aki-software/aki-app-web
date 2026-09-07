import type { ClaimedDelivery } from './payment-notification-delivery-state.service.js';

export type PaymentNotificationRenderInput = Pick<
  ClaimedDelivery,
  'recipientKind' | 'recipientNameSnapshot' | 'contextSnapshot'
>;

type PurchaseRenderModel = {
  institutionName: string;
  planName: string;
  voucherQuantity: number;
  chargedAmount: string | null;
  fulfilledAt: string;
  gateway: string | null;
};

type BuyerRenderModel = PurchaseRenderModel & {
  recipientName: string;
};

type AdminRenderModel = PurchaseRenderModel & {
  buyerName: string | null;
  buyerEmail: string | null;
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
  const purchase = {
    institutionName: display(context.institution.name) ?? 'Tu institución',
    planName: display(context.commercial.planName) ?? 'Compra de vouchers',
    voucherQuantity: context.commercial.voucherQuantity,
    chargedAmount: formatAmount(context.charged),
    fulfilledAt: formatDate(context.fulfilledAt),
    gateway: context.payment ? formatGateway(context.payment.gateway) : null,
  };

  if (delivery.recipientKind === 'BUYER') {
    return {
      subject: 'Compra acreditada - A.kit',
      template: 'payment-confirmation-buyer.pug',
      model: {
        recipientName: display(delivery.recipientNameSnapshot) ?? 'Cliente',
        ...purchase,
      },
    };
  }

  return {
    subject: 'Nueva compra acreditada',
    template: 'payment-receipt-admin.pug',
    model: {
      ...purchase,
      buyerName: context.buyer ? display(context.buyer.name) : null,
      buyerEmail: context.buyer ? display(context.buyer.email) : null,
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
  const whole = minor.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const cents = minor.slice(-2);
  const localizedAmount = cents === '00' ? whole : `${whole},${cents}`;

  return charged.currency === 'ARS'
    ? `$${localizedAmount} ARS`
    : `${localizedAmount} ${charged.currency}`;
}

function formatGateway(value: unknown): string | null {
  const gateway = display(value);
  if (!gateway) return null;
  if (gateway === 'MERCADO_PAGO') return 'Mercado Pago';
  if (gateway === 'STRIPE') return 'Stripe';
  return gateway;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Fecha de acreditación no disponible';
  }

  const formatted = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    dateStyle: 'long',
    timeStyle: 'short',
    hourCycle: 'h23',
  }).format(date);
  return `${formatted} (hora de Argentina)`;
}
