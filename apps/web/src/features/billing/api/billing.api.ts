import { apiClient } from '../../../api/client';
import { CheckoutSessionRequest, CheckoutSessionResponse, PricingPlan, BillingHistory } from '@akit/contracts';

export const billingApi = {
  getPlans: () => apiClient.get<PricingPlan[]>('/payments/plans'),
  createCheckout: (data: CheckoutSessionRequest) => 
    apiClient.post<CheckoutSessionResponse>('/payments/checkout', data),
  getHistory: () => apiClient.get<BillingHistory>('/payments/history'),
};
