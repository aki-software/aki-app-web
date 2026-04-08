import {
    ChevronLeft,
    ChevronRight,
    Filter,
    Layers3,
    LayoutGrid,
    List,
    Search,
    X,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/hooks/useAuth";
import type {
    InstitutionOption,
    TherapistOption,
    VoucherBatchDetailResponse,
    VoucherBatchSummary,
    VoucherData,
} from "../api/dashboard";
import {
    createVoucher,
    fetchVoucherBatchDetail,
    fetchVoucherBatches,
    fetchInstitutions,
    fetchTherapists,
    fetchVouchersList,
    fetchVouchersPage,
} from "../api/dashboard";
import { VoucherBatchRow } from "../components/vouchers/VoucherBatchRow";
import {
    VoucherEmitForm,
    type VoucherFormState,
    initialFormState,
} from "../components/vouchers/VoucherEmitForm";
import { VoucherStatsCards } from "../components/vouchers/VoucherStatsCards";
import { VoucherTableRow } from "../components/vouchers/VoucherTableRow";

const ITEMS_PER_PAGE = 10;
type StatusFilter = "ALL" | "AVAILABLE" | "USED" | "EXPIRED";
type ExpirationFilter = "ALL" | "EXPIRING_7D" | "NO_EXPIRATION";

const PERIOD_DAYS = 30;

function formatDateTime(value: string | Date | number | null | undefined) {
  if (!value) return "Sin dato";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Sin dato";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getStatusLabel(status: string) {
  switch (status) {
    case "AVAILABLE":
      return "Disponible";
    case "USED":
      return "Consumido";
    case "EXPIRED":
      return "Vencido";
    case "REVOKED":
      return "Revocado";
    case "SENT":
      return "Enviado";
    default:
      return status;
  }
}

function getStatusPillClass(status: string) {
  switch (status) {
    case "AVAILABLE":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "USED":
      return "border-rose-500/30 bg-rose-500/10 text-rose-300";
    case "EXPIRED":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    case "REVOKED":
      return "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";
    case "SENT":
      return "border-sky-500/30 bg-sky-500/10 text-sky-300";
    default:
      return "border-app-border bg-app-bg text-app-text-muted";
  }
}

export function DashboardVouchers() {
  const { user } = useAuth();
  const isAdmin = user?.role?.toUpperCase() === "ADMIN";
  const [vouchers, setVouchers] = useState<VoucherData[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [therapists, setTherapists] = useState<TherapistOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [expirationFilter, setExpirationFilter] =
    useState<ExpirationFilter>("ALL");
  const [clientFilter, setClientFilter] = useState("ALL");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [viewMode, setViewMode] = useState<"BATCHES" | "INDIVIDUAL">("BATCHES");
  const [currentPage, setCurrentPage] = useState(1);
  const [batchItems, setBatchItems] = useState<VoucherBatchSummary[]>([]);
  const [batchTotalItems, setBatchTotalItems] = useState(0);
  const [individualItems, setIndividualItems] = useState<VoucherData[]>([]);
  const [individualTotalItems, setIndividualTotalItems] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedBatchDetail, setSelectedBatchDetail] =
    useState<VoucherBatchDetailResponse | null>(null);
  const [batchDetailLoading, setBatchDetailLoading] = useState(false);
  const [batchDetailError, setBatchDetailError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formState, setFormState] =
    useState<VoucherFormState>(initialFormState);

  const loadData = async () => {
    try {
      const [voucherData, institutionsData, therapistsData] = await Promise.all(
        [fetchVouchersList(), fetchInstitutions(), fetchTherapists()],
      );
      setVouchers(voucherData);
      setInstitutions(institutionsData);
      setTherapists(therapistsData);
    } catch (error) {
      console.error("No fue posible cargar los vouchers.", error);
      setErrorMessage(
        "No se pudieron cargar los vouchers. Reintenta en unos segundos.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, viewMode, statusFilter, expirationFilter, clientFilter]);

  useEffect(() => {
    const loadBatchData = async () => {
      if (viewMode !== "BATCHES") {
        return;
      }
      const response = await fetchVoucherBatches({
        search: searchTerm,
        clientId: clientFilter === "ALL" ? undefined : clientFilter,
        expiration: expirationFilter,
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      });
      setBatchItems(response.data);
      setBatchTotalItems(response.count);
    };

    void loadBatchData();
  }, [
    searchTerm,
    expirationFilter,
    clientFilter,
    currentPage,
    viewMode,
    reloadToken,
  ]);

  useEffect(() => {
    const loadIndividualData = async () => {
      if (viewMode !== "INDIVIDUAL") {
        return;
      }
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

    void loadIndividualData();
  }, [
    searchTerm,
    statusFilter,
    expirationFilter,
    clientFilter,
    currentPage,
    viewMode,
    reloadToken,
  ]);

  useEffect(() => {
    if (!selectedBatchId) {
      return;
    }

    let isActive = true;

    const loadBatchDetail = async () => {
      setBatchDetailLoading(true);
      setBatchDetailError(null);
      const detail = await fetchVoucherBatchDetail(selectedBatchId);
      if (!isActive) {
        return;
      }
      if (!detail) {
        setBatchDetailError("No se pudo cargar el detalle del lote.");
      } else {
        setSelectedBatchDetail(detail);
      }
      setBatchDetailLoading(false);
    };

    void loadBatchDetail();

    return () => {
      isActive = false;
    };
  }, [selectedBatchId]);

  const clientOptions = useMemo(() => {
    const entries = new Map<string, string>();
    vouchers.forEach((voucher) => {
      const key = voucher.ownerInstitutionId ?? "__UNASSIGNED__";
      const label =
        voucher.ownerInstitutionId && voucher.ownerInstitutionName
          ? voucher.ownerInstitutionName
          : "Cliente no informado";
      if (!entries.has(key)) {
        entries.set(key, label);
      }
    });

    return Array.from(entries.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [vouchers]);

  const paginatedData = useMemo(() => {
    if (viewMode === "BATCHES") {
      return {
        items: batchItems,
        totalItems: batchTotalItems,
        totalPages: Math.ceil(batchTotalItems / ITEMS_PER_PAGE),
      };
    } else {
      return {
        items: individualItems,
        totalItems: individualTotalItems,
        totalPages: Math.ceil(individualTotalItems / ITEMS_PER_PAGE),
      };
    }
  }, [
    viewMode,
    batchItems,
    batchTotalItems,
    individualItems,
    individualTotalItems,
  ]);

  const expiringSoonCount = useMemo(() => {
    const now = Date.now();
    const next7Days = now + 7 * 24 * 60 * 60 * 1000;
    return vouchers.filter((voucher) => {
      if (voucher.status !== "AVAILABLE" || !voucher.expiresAt) return false;
      const expiresAt = new Date(voucher.expiresAt).getTime();
      return (
        Number.isFinite(expiresAt) && expiresAt >= now && expiresAt <= next7Days
      );
    }).length;
  }, [vouchers]);

  const emittedInPeriod = useMemo(() => {
    const periodStart = Date.now() - PERIOD_DAYS * 24 * 60 * 60 * 1000;
    return vouchers.filter((voucher) => {
      const createdAt = new Date(voucher.createdAt).getTime();
      return Number.isFinite(createdAt) && createdAt >= periodStart;
    }).length;
  }, [vouchers]);

  const redeemedInPeriod = useMemo(() => {
    const periodStart = Date.now() - PERIOD_DAYS * 24 * 60 * 60 * 1000;
    return vouchers.filter((voucher) => {
      if (voucher.status !== "USED" || !voucher.redeemedAt) return false;
      const redeemedAt = new Date(voucher.redeemedAt).getTime();
      return Number.isFinite(redeemedAt) && redeemedAt >= periodStart;
    }).length;
  }, [vouchers]);

  const emittedHistorical = vouchers.length;
  const redeemedHistorical = useMemo(
    () => vouchers.filter((voucher) => voucher.status === "USED").length,
    [vouchers],
  );
  const batchesEmittedInPeriod = useMemo(() => {
    const periodStart = Date.now() - PERIOD_DAYS * 24 * 60 * 60 * 1000;
    const batchIds = new Set<string>();
    vouchers.forEach((voucher) => {
      const createdAt = new Date(voucher.createdAt).getTime();
      if (Number.isFinite(createdAt) && createdAt >= periodStart) {
        batchIds.add(voucher.batchId);
      }
    });
    return batchIds.size;
  }, [vouchers]);

  const usesHistoricalFallback = emittedInPeriod === 0 && emittedHistorical > 0;
  const effectiveEmitted = usesHistoricalFallback
    ? emittedHistorical
    : emittedInPeriod;
  const effectiveRedeemed = usesHistoricalFallback
    ? redeemedHistorical
    : redeemedInPeriod;

  const redemptionRate = effectiveEmitted
    ? Math.round((effectiveRedeemed / effectiveEmitted) * 100)
    : 0;

  const handleEmitVoucher = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!formState.ownerInstitutionId) {
      setErrorMessage("Selecciona un cliente antes de emitir el lote.");
      return;
    }

    if (formState.ownerUserId) {
      const selectedTherapist = therapists.find(
        (therapist) => therapist.id === formState.ownerUserId,
      );
      if (
        !selectedTherapist ||
        selectedTherapist.institutionId !== formState.ownerInstitutionId
      ) {
        setErrorMessage(
          "El responsable seleccionado no pertenece al cliente elegido.",
        );
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
      // After creation, reset filters and pagination so new vouchers are visible immediately.
      setSearchTerm("");
      setStatusFilter("ALL");
      setExpirationFilter("ALL");
      setClientFilter("ALL");
      setCurrentPage(1);
      setViewMode("BATCHES");
      setShowCreateForm(false);
      setFormState(initialFormState);
      setSuccessMessage(
        `Lote emitido correctamente (${created.createdCount} voucher${created.createdCount === 1 ? "" : "s"}).`,
      );
      return;
    }
    setErrorMessage(
      "No se pudo emitir el lote. Verifica los datos e intenta nuevamente.",
    );
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

  const handleVoucherActionResult = async (result: {
    ok: boolean;
    message: string;
  }) => {
    if (!result.ok) {
      setErrorMessage(result.message);
      setSuccessMessage(null);
      return;
    }

    setSuccessMessage(result.message);
    setErrorMessage(null);
    await loadData();
    setReloadToken((current) => current + 1);
  };

  const Pagination = () => (
    <div className="flex items-center justify-between pt-10 border-t border-app-border">
      <p className="app-label opacity-40">
        Mostrando{" "}
        {paginatedData.totalItems === 0
          ? 0
          : (currentPage - 1) * ITEMS_PER_PAGE + 1}
        -{Math.min(currentPage * ITEMS_PER_PAGE, paginatedData.totalItems)} de{" "}
        {paginatedData.totalItems} registros
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          aria-label="Ir a la página anterior"
          title="Página anterior"
          className="p-3 bg-app-surface border border-app-border rounded-xl text-app-text-muted hover:text-app-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-1.5 px-4 h-12 bg-app-bg border border-app-border rounded-xl">
          <span className="app-label !text-xs tracking-normal">
            Página {currentPage} de {paginatedData.totalPages || 1}
          </span>
        </div>
        <button
          onClick={() =>
            setCurrentPage((p) => Math.min(paginatedData.totalPages, p + 1))
          }
          disabled={
            currentPage === paginatedData.totalPages ||
            paginatedData.totalPages === 0
          }
          aria-label="Ir a la página siguiente"
          title="Página siguiente"
          className="p-3 bg-app-surface border border-app-border rounded-xl text-app-text-muted hover:text-app-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-app-text-muted">
        <Layers3 className="h-8 w-8 animate-pulse text-app-primary" />
        <span className="app-label">Sincronizando...</span>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in">
      <VoucherStatsCards
        isAdmin={isAdmin}
        showCreateForm={showCreateForm}
        onToggleForm={() => setShowCreateForm((prev) => !prev)}
        batchesEmittedInPeriod={batchesEmittedInPeriod}
        vouchersEmittedInPeriod={effectiveEmitted}
        vouchersRedeemedInPeriod={effectiveRedeemed}
        expiringSoonCount={expiringSoonCount}
        redemptionRate={redemptionRate}
        periodDays={PERIOD_DAYS}
        usesHistoricalFallback={usesHistoricalFallback}
      />

      {successMessage && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm font-semibold text-emerald-200">
          {successMessage}
        </div>
      )}

      {errorMessage && !showCreateForm && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm font-semibold text-rose-200">
          {errorMessage}
        </div>
      )}

      {showCreateForm && (
        <VoucherEmitForm
          institutions={institutions}
          therapists={therapists}
          formState={formState}
          setFormState={setFormState}
          onSubmit={handleEmitVoucher}
          saving={saving}
          errorMessage={errorMessage}
          successMessage={successMessage}
          resetMessages={() => {
            setErrorMessage(null);
            setSuccessMessage(null);
          }}
        />
      )}

      <div className="space-y-8">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
          <div className="flex flex-col md:flex-row items-stretch md:items-end gap-6 w-full max-w-5xl">
            <div className="relative flex-1 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-app-text-muted group-focus-within:text-app-primary transition-colors" />
              <input
                type="text"
                placeholder={
                  viewMode === "BATCHES"
                    ? "Buscar por lote o cliente..."
                    : "Buscar por código, cliente o paciente..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="app-card !p-4 !pl-14 w-full bg-app-surface border-app-border focus:border-app-primary outline-none transition-all shadow-xl !rounded-2xl"
              />
            </div>

            <div className="flex items-center gap-1.5 p-1.5 bg-app-bg border border-app-border rounded-xl">
              {[
                { id: "ALL", label: "Todos" },
                { id: "AVAILABLE", label: "Disponibles" },
                { id: "USED", label: "Consumidos" },
                { id: "EXPIRED", label: "Vencidos" },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setStatusFilter(filter.id as StatusFilter)}
                  className={`px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    statusFilter === filter.id
                      ? "bg-app-surface text-app-primary shadow-sm border border-app-border/20"
                      : "text-app-text-muted hover:text-app-primary"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <select
              value={expirationFilter}
              onChange={(event) =>
                setExpirationFilter(event.target.value as ExpirationFilter)
              }
              className="app-select rounded-xl border border-app-border bg-app-bg px-4 py-3 text-[11px] font-black uppercase tracking-wide text-app-text-main"
              aria-label="Filtrar por vencimiento"
            >
              <option value="ALL">Vencimiento: Todos</option>
              <option value="EXPIRING_7D">Vencen en 7 dias</option>
              <option value="NO_EXPIRATION">Sin expiracion</option>
            </select>

            {isAdmin && (
              <select
                value={clientFilter}
                onChange={(event) =>
                  setClientFilter(event.target.value)
                }
                className="app-select rounded-xl border border-app-border bg-app-bg px-4 py-3 text-[11px] font-black uppercase tracking-wide text-app-text-main"
                aria-label="Filtrar por cliente"
              >
                <option value="ALL">Cliente: Todos</option>
                {clientOptions.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-1.5 p-1.5 bg-app-bg border border-app-border rounded-xl shadow-inner min-w-[240px]">
            <button
              onClick={() => setViewMode("BATCHES")}
              className={`flex-1 flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
                viewMode === "BATCHES"
                  ? "bg-app-surface text-app-primary shadow-lg border border-app-border/40"
                  : "text-app-text-muted hover:text-app-primary"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Lotes
            </button>
            <button
              onClick={() => setViewMode("INDIVIDUAL")}
              className={`flex-1 flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
                viewMode === "INDIVIDUAL"
                  ? "bg-app-surface text-app-primary shadow-lg border border-app-border/40"
                  : "text-app-text-muted hover:text-app-primary"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              Individual
            </button>
          </div>
        </div>

        {viewMode === "BATCHES" ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {(paginatedData.items as VoucherBatchSummary[]).length === 0 ? (
                <div className="col-span-full app-card !p-20 text-center flex flex-col items-center gap-4 opacity-40">
                  <Filter className="h-12 w-12" />
                  <p className="app-label">
                    No hay lotes que coincidan con estos filtros
                  </p>
                </div>
              ) : (
                (paginatedData.items as VoucherBatchSummary[]).map((batch) => (
                  <VoucherBatchRow
                    key={batch.batchId}
                    batch={batch}
                    onOpenDetail={handleOpenBatchDetail}
                  />
                ))
              )}
            </div>
            {paginatedData.totalPages > 1 && <Pagination />}
          </div>
        ) : (
          <div className="space-y-8">
            <div className="app-card !p-0 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-app-bg/50 border-b border-app-border">
                    <tr>
                      <th className="px-5 py-5 app-label opacity-40">
                        Código de Acceso
                      </th>
                      <th className="px-5 py-5 app-label opacity-40">Estado</th>
                      {isAdmin && (
                        <th className="px-5 py-5 app-label opacity-40">
                          Cliente
                        </th>
                      )}
                      <th className="px-5 py-5 app-label opacity-40">
                        Paciente / destino
                      </th>
                      <th className="px-5 py-5 app-label opacity-40">
                        Fechas clave
                      </th>
                      <th className="px-5 py-5 app-label opacity-40 text-right">
                        Compartir
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border bg-app-surface">
                    {(paginatedData.items as VoucherData[]).length === 0 ? (
                      <tr>
                        <td
                          colSpan={isAdmin ? 6 : 5}
                          className="px-5 py-20 text-center opacity-40"
                        >
                          <div className="flex flex-col items-center gap-4">
                            <Filter className="h-10 w-10" />
                            <p className="app-label">
                              Sin resultados para estos filtros
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      (paginatedData.items as VoucherData[]).map((voucher) => (
                        <VoucherTableRow
                          key={voucher.id}
                          voucher={voucher}
                          isAdmin={isAdmin}
                          onVoucherUpdated={handleVoucherActionResult}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {paginatedData.totalPages > 1 && <Pagination />}
          </div>
        )}
      </div>

      {selectedBatchId && (
        <>
          <button
            type="button"
            aria-label="Cerrar detalle de lote"
            onClick={handleCloseBatchDetail}
            className="fixed inset-0 z-40 bg-app-bg/70 backdrop-blur-sm"
          />
          <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-2xl overflow-y-auto border-l border-app-border bg-app-surface p-6 shadow-2xl">
            <div className="sticky top-0 z-10 mb-6 flex items-center justify-between border-b border-app-border bg-app-surface/95 pb-4 backdrop-blur">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-app-text-muted">
                  Detalle de lote
                </p>
                <h3 className="mt-1 text-xl font-black text-app-text-main">
                  {`Lote ${(selectedBatchDetail?.batchId ?? selectedBatchId).slice(0, 8).toUpperCase()}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseBatchDetail}
                className="rounded-xl border border-app-border bg-app-bg p-2.5 text-app-text-muted transition-colors hover:text-app-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {batchDetailLoading && (
              <div className="flex h-48 items-center justify-center">
                <span className="app-label opacity-60">Cargando detalle...</span>
              </div>
            )}

            {!batchDetailLoading && batchDetailError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200">
                {batchDetailError}
              </div>
            )}

            {!batchDetailLoading && !batchDetailError && selectedBatchDetail && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="rounded-xl border border-app-border bg-app-bg p-3">
                    <p className="text-[10px] font-black uppercase tracking-wide text-app-text-muted">
                      Total
                    </p>
                    <p className="mt-2 text-2xl font-black text-app-text-main">
                      {selectedBatchDetail.total}
                    </p>
                  </div>
                  <div className="rounded-xl border border-app-border bg-app-bg p-3">
                    <p className="text-[10px] font-black uppercase tracking-wide text-app-text-muted">
                      Pendientes
                    </p>
                    <p className="mt-2 text-2xl font-black text-emerald-300">
                      {selectedBatchDetail.pending}
                    </p>
                  </div>
                  <div className="rounded-xl border border-app-border bg-app-bg p-3">
                    <p className="text-[10px] font-black uppercase tracking-wide text-app-text-muted">
                      Consumidos
                    </p>
                    <p className="mt-2 text-2xl font-black text-rose-300">
                      {selectedBatchDetail.used}
                    </p>
                  </div>
                  <div className="rounded-xl border border-app-border bg-app-bg p-3">
                    <p className="text-[10px] font-black uppercase tracking-wide text-app-text-muted">
                      Disponibles
                    </p>
                    <p className="mt-2 text-2xl font-black text-sky-300">
                      {selectedBatchDetail.available}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 rounded-xl border border-app-border bg-app-bg p-4 text-sm text-app-text-muted md:grid-cols-2">
                  <p>
                    Cliente:{" "}
                    <span className="font-semibold text-app-text-main">
                      {selectedBatchDetail.ownerInstitutionName}
                    </span>
                  </p>
                  <p>
                    Responsable:{" "}
                    <span className="font-semibold text-app-text-main">
                      {selectedBatchDetail.ownerUserName}
                    </span>
                  </p>
                  <p>
                    Emision:{" "}
                    <span className="font-semibold text-app-text-main">
                      {formatDateTime(selectedBatchDetail.createdAt)}
                    </span>
                  </p>
                  <p>
                    Vencimiento:{" "}
                    <span className="font-semibold text-app-text-main">
                      {formatDateTime(selectedBatchDetail.expiresAt)}
                    </span>
                  </p>
                </div>

                <div className="overflow-hidden rounded-xl border border-app-border">
                  <table className="w-full border-collapse text-left">
                    <thead className="bg-app-bg/70">
                      <tr>
                        <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wide text-app-text-muted">
                          Codigo
                        </th>
                        <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wide text-app-text-muted">
                          Estado
                        </th>
                        <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wide text-app-text-muted">
                          Paciente
                        </th>
                        <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wide text-app-text-muted">
                          Fechas
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border bg-app-surface">
                      {selectedBatchDetail.vouchers.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-3 py-8 text-center text-sm text-app-text-muted"
                          >
                            Este lote no tiene vouchers.
                          </td>
                        </tr>
                      ) : (
                        selectedBatchDetail.vouchers.map((voucher) => (
                          <tr key={voucher.id}>
                            <td className="px-3 py-3 text-sm font-semibold text-app-text-main">
                              {voucher.code}
                            </td>
                            <td className="px-3 py-3">
                              <span
                                className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wide ${getStatusPillClass(voucher.status)}`}
                              >
                                {getStatusLabel(voucher.status)}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-xs text-app-text-muted">
                              <p>{voucher.assignedPatientName ?? "Sin asignar"}</p>
                              <p>{voucher.assignedPatientEmail ?? "Sin email"}</p>
                            </td>
                            <td className="px-3 py-3 text-xs text-app-text-muted">
                              <p>Emision: {formatDateTime(voucher.createdAt)}</p>
                              <p>Canje: {formatDateTime(voucher.redeemedAt)}</p>
                              <p>Vence: {formatDateTime(voucher.expiresAt)}</p>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </aside>
        </>
      )}
    </div>
  );
}
