import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type {
  AdminPaymentLedgerDetail,
  AdminPaymentLedgerPage,
  AdminPaymentLedgerQuery,
} from "@akit/contracts";
import { paymentLedgerApi } from "../api/payment-ledger.api";

type LedgerFilters = Pick<
  AdminPaymentLedgerQuery,
  | "institutionName"
  | "settledFrom"
  | "settledTo"
  | "fulfillmentState"
  | "notificationStatus"
>;

const INITIAL_FILTERS: LedgerFilters = {};

export function usePaymentLedger() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<LedgerFilters>(INITIAL_FILTERS);
  const [sort, setSort] =
    useState<AdminPaymentLedgerQuery["sort"]>("SETTLED_DESC");
  const [data, setData] = useState<AdminPaymentLedgerPage | null>(null);
  const [detail, setDetail] = useState<AdminPaymentLedgerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [detailError, setDetailError] = useState<Error | null>(null);
  const selectedBatchId = searchParams.get("voucherBatchId");

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData(
        await paymentLedgerApi.list(
          paymentLedgerApi.createQuery({ page, sort, ...filters }),
        ),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error(String(cause)));
    } finally {
      setIsLoading(false);
    }
  }, [filters, page, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedBatchId) {
      setDetail(null);
      setDetailError(null);
      setIsDetailLoading(false);
      return;
    }
    let current = true;
    setDetail(null);
    setDetailError(null);
    setIsDetailLoading(true);
    void paymentLedgerApi
      .getDetail(selectedBatchId)
      .then(
        (result) => current && setDetail(result),
        (cause: unknown) =>
          current &&
          setDetailError(
            cause instanceof Error ? cause : new Error(String(cause)),
          ),
      )
      .finally(() => current && setIsDetailLoading(false));
    return () => {
      current = false;
    };
  }, [selectedBatchId]);

  const updateFilters = useCallback((next: Partial<LedgerFilters>) => {
    setPage(1);
    setFilters((current) => ({ ...current, ...next }));
  }, []);

  const updateSort = useCallback((next: AdminPaymentLedgerQuery["sort"]) => {
    setPage(1);
    setSort(next);
  }, []);

  const selectBatch = useCallback(
    (voucherBatchId: string) => {
      const next = new URLSearchParams(searchParams);
      next.set("voucherBatchId", voucherBatchId);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const closeDetail = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete("voucherBatchId");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  return {
    page,
    filters,
    sort,
    data,
    detail,
    selectedBatchId,
    isLoading,
    isDetailLoading,
    error,
    detailError,
    load,
    selectBatch,
    closeDetail,
    updateFilters,
    updateSort,
    previousPage: () => setPage((current) => Math.max(1, current - 1)),
    nextPage: () =>
      setPage((current) =>
        data && current < data.totalPages ? current + 1 : current,
      ),
  };
}
