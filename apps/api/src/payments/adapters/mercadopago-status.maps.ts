import type {
  PaymentStatus,
  WebhookEventType,
} from '../interfaces/payment-gateway.interface.js';

/**
 * Maps MercadoPago payment statuses to our internal PaymentStatus.
 * Extend this map when MP introduces new statuses.
 */
export const MP_PAYMENT_STATUS_MAP: Record<string, PaymentStatus> = {
  approved: 'approved',
  pending: 'pending',
  in_process: 'pending',
};

/**
 * Maps MercadoPago webhook payment statuses to our internal WebhookEventType.
 * Extend this map when MP introduces new statuses.
 */
export const MP_WEBHOOK_STATUS_MAP: Record<string, WebhookEventType> = {
  approved: 'approved',
  refunded: 'refunded',
  charged_back: 'chargeback',
  rejected: 'rejected',
  cancelled: 'rejected',
};
