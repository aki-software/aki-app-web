export interface InstitutionResponse {
  id: string;
  name: string;
  billingEmail: string | null;
  legalName: string | null;
  taxId: string | null;
  taxCondition: string | null;
  billingAddress: string | null;
  billingCity: string | null;
  billingProvince: string | null;
  billingPhone: string | null;
  isActive: boolean;
  createdAt: string | Date;
  responsibleTherapistUserId?: string | null;
  responsibleTherapistName?: string | null;
}

export interface InstitutionListItemResponse extends InstitutionResponse {
  responsibleTherapistActive: boolean;
  activationEmailSent?: boolean;
}

export type InstitutionOption = InstitutionListItemResponse;

export interface InstitutionStats {
  totalSessions: number;
  availableVouchers: number;
  redeemedVouchers: number;
}

export interface InstitutionOverviewResponse {
  periodDays: number;
  periodLabel: string;
  vouchers: {
    total: number;
    available: number;
    used: number;
    expired: number;
    sent: number;
    revoked: number;
    vouchersGeneratedPeriod: number;
    vouchersRedeemedPeriod: number;
    voucherRedemptionRatePeriod: number;
    vouchersExpiringSoon7d: number;
    vouchersUnassignedAvailable: number;
  };
  tests: {
    testsStartedPeriod: number;
    testsCompletedPeriod: number;
    reportsUnlockedPeriod: number;
    channelBreakdown: {
      voucher: { started: number; completed: number; reportsUnlocked: number };
      individual: { started: number; completed: number; reportsUnlocked: number };
    };
  };
  topSessions: Array<{
    id: string;
    patientName: string;
    createdAt: string | null;
    sessionDate: string | null;
    hollandCode: string;
    paymentStatus: string;
    voucherCode: string | null;
    reportUnlockedAt: string | null;
    resultsCount: number;
  }>;
  resultsDistribution: Array<{
    categoryId: string;
    name: string;
    count: number;
  }>;
}

export interface CreateInstitutionDto {
  name: string;
  email: string;
  billingEmail?: string;
  legalName?: string;
  taxId?: string;
  taxCondition?: string;
  billingAddress?: string;
  billingCity?: string;
  billingProvince?: string;
  billingPhone?: string;
  responsibleTherapistUserId?: string;
}

export interface UpdateInstitutionDto {
  name?: string;
  billingEmail?: string;
}

export interface UpdateBillingProfileDto {
  legalName: string;
  taxId: string;
  taxCondition: string;
  billingAddress: string;
  billingCity: string;
  billingProvince: string;
  billingPhone: string;
}
