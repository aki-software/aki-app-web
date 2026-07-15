import { useState, useEffect } from "react";
import {
  fetchVoucherBatches,
  fetchVouchersPage,
  type VoucherBatchSummary,
  type VoucherData,
} from "../api/dashboard";
import { ITEMS_PER_PAGE } from "../constants/vouchers.constants";

export function calculateTotalPages(count: number, limit: number): number {
  return limit > 0 ? Math.ceil(count / limit) : 0;
}

export function clampPage(page: number, totalPages: number): number {
  if (totalPages <= 0) return 1;
  return Math.max(1, Math.min(page, totalPages));
}

export interface VoucherListFilters {
  searchTerm: string;
  statusFilter: "ALL" | "AVAILABLE" | "USED" | "EXPIRED";
  expirationFilter: "ALL" | "EXPIRING_7D" | "NO_EXPIRATION";
  clientFilter: string;
}

export const useVoucherList = (filters: VoucherListFilters, viewMode: "BATCHES" | "INDIVIDUAL", reloadToken: number = 0) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [batchItems, setBatchItems] = useState<VoucherBatchSummary[]>([]);
  const [batchTotalItems, setBatchTotalItems] = useState(0);
  const [individualItems, setIndividualItems] = useState<VoucherData[]>([]);
  const [individualTotalItems, setIndividualTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.searchTerm, filters.statusFilter, filters.expirationFilter, filters.clientFilter, viewMode]);

  useEffect(() => {
    const loadBatchData = async () => {
      if (viewMode !== "BATCHES") return;
      setLoading(true);
      try {
        const response = await fetchVoucherBatches({
          search: filters.searchTerm,
          clientId: filters.clientFilter === "ALL" ? undefined : filters.clientFilter,
          expiration: filters.expirationFilter,
          page: currentPage,
          limit: ITEMS_PER_PAGE,
        });
        setBatchItems(response.data);
        setBatchTotalItems(response.count);
      } catch (error) {
        console.error("Error loading voucher batches:", error);
      } finally {
        setLoading(false);
      }
    };
    loadBatchData();
  }, [
    filters.searchTerm,
    filters.statusFilter,
    filters.expirationFilter,
    filters.clientFilter,
    currentPage,
    viewMode,
    reloadToken
  ]);

  useEffect(() => {
    const loadIndividualData = async () => {
      if (viewMode !== "INDIVIDUAL") return;
      setLoading(true);
      try {
        const response = await fetchVouchersPage({
          search: filters.searchTerm,
          status: filters.statusFilter,
          clientId: filters.clientFilter === "ALL" ? undefined : filters.clientFilter,
          expiration: filters.expirationFilter,
          page: currentPage,
          limit: ITEMS_PER_PAGE,
        });
        setIndividualItems(response.data);
        setIndividualTotalItems(response.count);
      } catch (error) {
        console.error("Error loading individual vouchers:", error);
      } finally {
        setLoading(false);
      }
    };
    loadIndividualData();
  }, [
    filters.searchTerm,
    filters.statusFilter,
    filters.expirationFilter,
    filters.clientFilter,
    currentPage,
    viewMode,
    reloadToken
  ]);

  const batchTotalPages = Math.ceil(batchTotalItems / ITEMS_PER_PAGE);
  const individualTotalPages = Math.ceil(individualTotalItems / ITEMS_PER_PAGE);

  return {
    currentPage,
    setCurrentPage,
    batchItems,
    batchTotalPages,
    individualItems,
    individualTotalPages,
    loading,
  };
};
