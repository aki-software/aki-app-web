import { useState, useEffect, useCallback, type FormEvent, useMemo } from "react";
import {
  createVoucher,
  fetchVoucherBatchDetail,
  fetchVoucherBatches,
  fetchInstitutions,
  fetchTherapists,
  fetchVouchersList,
  fetchVouchersPage,
  fetchVoucherStats,
  fetchVoucherSessions,
  type InstitutionOption,
  type TherapistOption,
  type VoucherBatchDetailResponse,
  type VoucherBatchSummary,
  type VoucherData,
  type VoucherStats,
  type VoucherAlert,
} from "../api/dashboard";
import type { SessionData } from "../api/sessions.api";
import { initialFormState, type VoucherFormState } from "../components/vouchers/VoucherEmitForm";
import { ITEMS_PER_PAGE } from "../constants/vouchers.constants";

export const useVouchersManager = (user: any) => {
  const isAdmin = user?.role?.toUpperCase() === "ADMIN";
  const [vouchers, setVouchers] = useState<VoucherData[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [therapists, setTherapists] = useState<TherapistOption[]>([]);
  const [stats, setStats] = useState<VoucherStats | null>(null);
  const [alerts, setAlerts] = useState<VoucherAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "AVAILABLE" | "USED" | "EXPIRED">("ALL");
  const [expirationFilter, setExpirationFilter] = useState<"ALL" | "EXPIRING_7D" | "NO_EXPIRATION">("ALL");
  const [clientFilter, setClientFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"BATCHES" | "INDIVIDUAL">(isAdmin ? "BATCHES" : "INDIVIDUAL");
  const effectiveViewMode = isAdmin ? "BATCHES" : viewMode;
  const [currentPage, setCurrentPage] = useState(1);
  const [formState, setFormState] = useState<VoucherFormState>(initialFormState);
  const [batchItems, setBatchItems] = useState<VoucherBatchSummary[]>([]);
  const [batchTotalItems, setBatchTotalItems] = useState(0);
  const [individualItems, setIndividualItems] = useState<VoucherData[]>([]);
  const [individualTotalItems, setIndividualTotalItems] = useState(0);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedBatchDetail, setSelectedBatchDetail] = useState<VoucherBatchDetailResponse | null>(null);
  const [batchDetailLoading, setBatchDetailLoading] = useState(false);
  const [batchDetailError, setBatchDetailError] = useState<string | null>(null);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);
  const [voucherSessions, setVoucherSessions] = useState<SessionData[]>([]);
  const [loadingVoucherSessions, setLoadingVoucherSessions] = useState(false);

  const resetMessages = useCallback(() => {
    setErrorMessage(null);
    setSuccessMessage(null);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [voucherData, institutionsData, therapistsData, statsData] = await Promise.all([
        fetchVouchersList(),
        isAdmin ? fetchInstitutions() : Promise.resolve([]),
        isAdmin ? fetchTherapists() : Promise.resolve([]),
        fetchVoucherStats(user?.institutionId),
      ]);
      setVouchers(voucherData);
      setInstitutions(institutionsData);
      setTherapists(therapistsData);
      setStats(statsData.stats);
      setAlerts(statsData.alerts);
    } catch (error) {
      console.error("No fue posible cargar los vouchers.", error);
      setErrorMessage("No se pudieron cargar los vouchers. Reintenta en unos segundos.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, user?.institutionId]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  useEffect(() => {
    setViewMode(isAdmin ? "BATCHES" : "INDIVIDUAL");
  }, [isAdmin]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, effectiveViewMode, statusFilter, expirationFilter, clientFilter]);
  useEffect(() => {
    const loadBatchData = async () => {
      try {
        const response = await fetchVoucherBatches({
          search: searchTerm,
          clientId: clientFilter === "ALL" ? undefined : clientFilter,
          expiration: expirationFilter,
          page: currentPage,
          limit: ITEMS_PER_PAGE,
        });
        setBatchItems(response.data);
        setBatchTotalItems(response.count);
      } catch (error) {
        console.error("Error loading voucher batches:", error);
      }
    };
    loadBatchData();
  }, [searchTerm, clientFilter, expirationFilter, currentPage, reloadToken]);

  useEffect(() => {
    const loadIndividualData = async () => {
      if (effectiveViewMode !== "INDIVIDUAL") return;
      
      const response = await fetchVouchersPage({
        search: searchTerm,
        status: statusFilter,
        clientId: clientFilter === "ALL" ? undefined : clientFilter,
        expiration: expirationFilter,
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      });
      setIndividualItems(response.data);
      setIndividualTotalItems(response.count);
    };
    loadIndividualData();
  }, [searchTerm, statusFilter, expirationFilter, clientFilter, currentPage, effectiveViewMode, reloadToken]);

  useEffect(() => {
    if (!selectedBatchId) return;

    let isActive = true;
    const loadBatchDetail = async () => {
      setBatchDetailLoading(true);
      setBatchDetailError(null);
      const detail = await fetchVoucherBatchDetail(selectedBatchId);
      if (!isActive) return;
      if (!detail) {
        setBatchDetailError("No se pudo cargar el detalle del lote.");
      } else {
        setSelectedBatchDetail(detail);
      }
      setBatchDetailLoading(false);
    };

    void loadBatchDetail();
    return () => { isActive = false; };
  }, [selectedBatchId]);

  const handleEmitVoucher = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetMessages();

    if (!formState.ownerInstitutionId) {
      setErrorMessage("Selecciona una institución antes de emitir el lote.");
      return;
    }

    if (formState.ownerUserId) {
      const selectedTherapist = therapists.find((t) => t.id === formState.ownerUserId);
      if (!selectedTherapist || selectedTherapist.institutionId !== formState.ownerInstitutionId) {
        setErrorMessage("La cuenta operativa seleccionada no pertenece a la institución elegida.");
        return;
      }
    }

    setSaving(true);
    const created = await createVoucher({
      ownerType: "INSTITUTION",
      ownerInstitutionId: formState.ownerInstitutionId,
      ownerUserId: formState.ownerUserId || undefined,
      quantity: Number(formState.quantity || "1"),
      expiresAt: formState.expiresAt || undefined,
    });
    setSaving(false);

    if (created) {
      await loadData();
      setSearchTerm("");
      setStatusFilter("ALL");
      setExpirationFilter("ALL");
      setClientFilter("ALL");
      setCurrentPage(1);
      setViewMode("BATCHES");
      setFormState(initialFormState);
      setSuccessMessage(`Lote emitido correctamente (${created.createdCount} voucher${created.createdCount === 1 ? "" : "s"}).`);
      return true; // Para cerrar el modal en el UI
    }
    setErrorMessage("No se pudo emitir el lote. Verifica los datos e intenta nuevamente.");
    return false;
  };

  const handleOpenBatchDetail = (batchId: string) => {
    setSelectedBatchId(batchId);
    setSelectedBatchDetail(null);
    setBatchDetailError(null);
  };

  const handleCloseBatchDetail = () => {
    setSelectedBatchId(null);
    setSelectedBatchDetail(null);
    setBatchDetailLoading(false);
    setBatchDetailError(null);
  };

  const loadVoucherSessions = async (voucherId: string) => {
    setLoadingVoucherSessions(true);
    try {
      const sessions = await fetchVoucherSessions(voucherId);
      setVoucherSessions(sessions);
      setSelectedVoucherId(voucherId);
    } catch (error) {
      console.error('Error loading voucher sessions:', error);
      setErrorMessage('No se pudieron cargar las sesiones del voucher');
    } finally {
      setLoadingVoucherSessions(false);
    }
  };

  const handleVoucherActionResult = async (result: { ok: boolean; message: string; }) => {
    if (!result.ok) {
      setErrorMessage(result.message);
      setSuccessMessage(null);
      return;
    }
    setSuccessMessage(result.message);
    setErrorMessage(null);
    await loadData();
    setReloadToken((current) => current + 1); // Fuerza recarga de lotes e individuales
  };

  const clientOptions = useMemo(() => {
  const entries = new Map<string, string>();
  vouchers.forEach((voucher) => {
    const key = voucher.ownerInstitutionId ?? "__UNASSIGNED__";
    const label = voucher.ownerInstitutionName || "Institución no informada";
    if (!entries.has(key)) entries.set(key, label);
  });
  return Array.from(entries.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}, [vouchers]);

  // --- CÁLCULOS DERIVADOS ---
  const batchTotalPages = Math.ceil(batchTotalItems / ITEMS_PER_PAGE);
  const individualTotalPages = Math.ceil(individualTotalItems / ITEMS_PER_PAGE);

  return {
    isAdmin,
    loading,
    saving,
    
    // Data
    institutions,
    therapists,
    stats,
    alerts,
    batchItems,
    individualItems,
    
    // Filters & States
    searchTerm, setSearchTerm,
    statusFilter, setStatusFilter,
    expirationFilter, setExpirationFilter,
    clientFilter, setClientFilter,
    viewMode: effectiveViewMode, setViewMode,
    currentPage, setCurrentPage,
    formState, setFormState,
    
    // Derived Pagination
    batchTotalPages,
    individualTotalPages,

    // Drawer / Modals Data
    selectedBatchId, selectedBatchDetail, batchDetailLoading, batchDetailError,
    selectedVoucherId, voucherSessions, loadingVoucherSessions,
    
    // Messages
    errorMessage, successMessage, resetMessages,

    // Actions
    handleEmitVoucher,
    handleOpenBatchDetail,
    handleCloseBatchDetail,
    loadVoucherSessions,
    handleVoucherActionResult,
    clientOptions
  };
};