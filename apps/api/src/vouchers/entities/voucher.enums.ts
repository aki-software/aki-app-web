export enum VoucherOwnerType {
  THERAPIST = 'THERAPIST',
  INSTITUTION = 'INSTITUTION',
}

export enum VoucherStatus {
  AVAILABLE = 'AVAILABLE',
  SENT = 'SENT',
  USED = 'USED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

export enum VoucherBatchStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}
