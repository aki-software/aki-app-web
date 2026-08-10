import { createHash } from 'node:crypto';

export type PaymentPersistenceInput = {
  gateway: 'MERCADO_PAGO' | 'STRIPE';
  externalPaymentId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  voucherBatchId: string;
  rawBody: Buffer | string;
  outboxId?: string;
};

export function toPaymentEvent(input: PaymentPersistenceInput) {
  return {
    gateway: input.gateway,
    externalPaymentId: input.externalPaymentId,
    status: input.status,
    payloadDigest: createHash('sha256').update(input.rawBody).digest('hex'),
    voucherBatchId: input.voucherBatchId,
  };
}

export function toOutboxJob(input: Pick<PaymentPersistenceInput, 'outboxId'>) {
  return { outboxId: input.outboxId };
}
