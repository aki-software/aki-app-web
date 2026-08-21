export class UserRegisteredEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
  ) {}
}

export type ReportDeliveryAudience = 'PATIENT' | 'EVALUATOR';

export class ReportGeneratedEvent {
  constructor(
    public readonly reportUrl: string | null,
    public readonly requestedByEmail: string,
    public readonly pdfBuffer?: Buffer,
    public readonly summary?: any,
    public readonly audience: ReportDeliveryAudience = 'PATIENT',
  ) {}
}

export class PaymentVerifiedEvent {
  constructor(
    public readonly paymentId: string,
    public readonly userEmail: string,
  ) {}
}

export class ReportFailedEvent {
  constructor(
    public readonly jobId: string,
    public readonly errorReason: string,
  ) {}
}

export class VoucherRedeemedEvent {
  constructor(
    public readonly sessionId: string,
    public readonly recipientEmail: string,
    public readonly voucherId: string,
    public readonly canonicalPatientId: string | null,
  ) {}
}

export class VoucherAssignedEvent {
  constructor(
    public readonly voucherId: string,
    public readonly targetEmail: string,
    public readonly voucherCode: string,
    public readonly patientName: string | null,
  ) {}
}

export class VoucherBatchAssignedEvent {
  constructor(
    public readonly targetEmail: string,
    public readonly institutionName: string,
    public readonly quantity: number,
    public readonly expiresAt: Date | null,
  ) {}
}

export class AccountActivationRequestedEvent {
  constructor(
    public readonly email: string,
    public readonly name: string,
    public readonly activationLink: string,
    public readonly institutionName: string | null,
  ) {}
}

export class PasswordResetRequestedEvent {
  constructor(
    public readonly email: string,
    public readonly name: string,
    public readonly resetLink: string,
  ) {}
}

export class EmailRequestedEvent {
  constructor(
    public readonly template: string,
    public readonly payload: any,
    public readonly meta: any,
  ) {}
}
