import { useCallback, useEffect, useState } from "react";
import type {
  AdminPaymentLedgerDetail,
  AdminPaymentLedgerPage,
} from "@akit/contracts";
import { paymentLedgerApi } from "../api/payment-ledger.api";

export function usePaymentLedger() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AdminPaymentLedgerPage | null>(null);
  const [detail, setDetail] = useState<AdminPaymentLedgerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [detailError, setDetailError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await paymentLedgerApi.list(paymentLedgerApi.createQuery(page)));
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error(String(cause)));
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectBatch = useCallback(async (voucherBatchId: string) => {
    setDetail(null);
    setDetailError(null);
    setIsDetailLoading(true);
    try {
      setDetail(await paymentLedgerApi.getDetail(voucherBatchId));
    } catch (cause) {
      setDetailError(cause instanceof Error ? cause : new Error(String(cause)));
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  return {
    page,
    data,
    detail,
    isLoading,
    isDetailLoading,
    error,
    detailError,
    load,
    selectBatch,
    closeDetail: () => setDetail(null),
    previousPage: () => setPage((current) => Math.max(1, current - 1)),
    nextPage: () =>
      setPage((current) =>
        data && current < data.totalPages ? current + 1 : current,
      ),
  };
}
