import { apiClient } from "../../../../api/client";
import {
  AdminPaymentLedgerDetail,
  AdminPaymentLedgerPage,
  AdminPaymentLedgerQuery,
  type AdminPaymentLedgerQuery as AdminPaymentLedgerQueryType,
} from "@akit/contracts";

function queryParams(query: AdminPaymentLedgerQueryType): Record<string, string> {
  return Object.fromEntries(
    Object.entries(query).map(([key, value]) => [key, String(value)]),
  );
}

export const paymentLedgerApi = {
  async list(query: AdminPaymentLedgerQueryType) {
    const response = await apiClient.get<unknown>("/admin/payment-ledger", {
      params: queryParams(query),
    });
    return AdminPaymentLedgerPage.parse(response);
  },
  async getDetail(voucherBatchId: string) {
    const response = await apiClient.get<unknown>(
      `/admin/payment-ledger/${voucherBatchId}`,
    );
    return AdminPaymentLedgerDetail.parse(response);
  },
  createQuery(page: number) {
    return AdminPaymentLedgerQuery.parse({ page });
  },
};
