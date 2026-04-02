import {
    ChevronLeft,
    ChevronRight,
    Filter,
    Layers3,
    LayoutGrid,
    List,
    Search,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/hooks/useAuth";
import type {
    InstitutionOption,
    TherapistOption,
    VoucherData,
} from "../api/dashboard";
import {
    createVoucher,
    fetchInstitutions,
    fetchTherapists,
    fetchVouchersList,
} from "../api/dashboard";
import { VoucherBatchRow } from "../components/vouchers/VoucherBatchRow";
import {
    VoucherEmitForm,
    type VoucherFormState,
    initialFormState,
} from "../components/vouchers/VoucherEmitForm";
import { VoucherStatsCards } from "../components/vouchers/VoucherStatsCards";
import { VoucherTableRow } from "../components/vouchers/VoucherTableRow";

export type BatchSummary = {
  batchId: string;
  ownerInstitutionName: string;
  ownerUserName: string;
  createdAt: string | number | Date;
  expiresAt: string | number | Date | null;
  total: number;
  available: number;
  used: number;
};

const ITEMS_PER_PAGE = 10;
type StatusFilter = "ALL" | "AVAILABLE" | "USED" | "EXPIRED";
type ExpirationFilter = "ALL" | "EXPIRING_7D" | "NO_EXPIRATION";
type OriginFilter = "ALL" | "ORGANIZATION" | "THERAPIST" | "UNASSIGNED";

const PERIOD_DAYS = 30;

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
  const [originFilter, setOriginFilter] = useState<OriginFilter>("ALL");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [viewMode, setViewMode] = useState<"BATCHES" | "INDIVIDUAL">("BATCHES");
  const [currentPage, setCurrentPage] = useState(1);
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
  }, [searchTerm, viewMode, statusFilter, expirationFilter, originFilter]);

  const filteredVouchers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const now = Date.now();
    const next7Days = now + 7 * 24 * 60 * 60 * 1000;
    return vouchers.filter((voucher) => {
      const matchesSearch =
        !term ||
        [
          voucher.code,
          voucher.status,
          voucher.batchId,
          voucher.ownerInstitutionName,
          voucher.ownerUserName,
          voucher.assignedPatientName,
          voucher.assignedPatientEmail,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      const matchesStatus =
        statusFilter === "ALL" || voucher.status === statusFilter;

      const expiresAtTimestamp = voucher.expiresAt
        ? new Date(voucher.expiresAt).getTime()
        : NaN;
      const hasValidExpiration = Number.isFinite(expiresAtTimestamp);
      const matchesExpiration =
        expirationFilter === "ALL" ||
        (expirationFilter === "EXPIRING_7D" &&
          hasValidExpiration &&
          expiresAtTimestamp >= now &&
          expiresAtTimestamp <= next7Days) ||
        (expirationFilter === "NO_EXPIRATION" && !hasValidExpiration);

      const matchesOrigin =
        originFilter === "ALL" ||
        (originFilter === "ORGANIZATION" && !!voucher.ownerInstitutionId) ||
        (originFilter === "THERAPIST" && !!voucher.ownerUserId) ||
        (originFilter === "UNASSIGNED" &&
          !voucher.ownerInstitutionId &&
          !voucher.ownerUserId);

      return (
        matchesSearch && matchesStatus && matchesExpiration && matchesOrigin
      );
    });
  }, [searchTerm, vouchers, statusFilter, expirationFilter, originFilter]);

  const batchSummaries = useMemo<BatchSummary[]>(() => {
    const grouped = new Map<string, BatchSummary>();
    filteredVouchers.forEach((voucher) => {
      const existing = grouped.get(voucher.batchId);
      if (!existing) {
        grouped.set(voucher.batchId, {
          batchId: voucher.batchId,
          ownerInstitutionName: voucher.ownerInstitutionName,
          ownerUserName: voucher.ownerUserName,
          createdAt: voucher.createdAt,
          expiresAt: voucher.expiresAt,
          total: 1,
          available: voucher.status === "AVAILABLE" ? 1 : 0,
          used: voucher.status === "USED" ? 1 : 0,
        });
        return;
      }
      existing.total += 1;
      if (voucher.status === "AVAILABLE") existing.available += 1;
      if (voucher.status === "USED") existing.used += 1;
    });
    return Array.from(grouped.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [filteredVouchers]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    if (viewMode === "BATCHES") {
      return {
        items: batchSummaries.slice(startIndex, endIndex),
        totalItems: batchSummaries.length,
        totalPages: Math.ceil(batchSummaries.length / ITEMS_PER_PAGE),
      };
    } else {
      return {
        items: filteredVouchers.slice(startIndex, endIndex),
        totalItems: filteredVouchers.length,
        totalPages: Math.ceil(filteredVouchers.length / ITEMS_PER_PAGE),
      };
    }
  }, [currentPage, viewMode, batchSummaries, filteredVouchers]);

  const availableCount = vouchers.filter(
    (v) => v.status === "AVAILABLE",
  ).length;

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
    setSaving(true);
    const created = await createVoucher({
      ownerType: formState.ownerType,
      ownerInstitutionId:
        formState.ownerType === "INSTITUTION"
          ? formState.ownerInstitutionId
          : undefined,
      ownerUserId:
        formState.ownerType === "THERAPIST" ? formState.ownerUserId : undefined,
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
      setOriginFilter("ALL");
      setCurrentPage(1);
      setViewMode("BATCHES");
      setShowCreateForm(false);
      setSuccessMessage(
        `Lote emitido correctamente (${created.createdCount} voucher${created.createdCount === 1 ? "" : "s"}).`,
      );
      return;
    }
    setErrorMessage(
      "No se pudo emitir el lote. Verifica los datos e intenta nuevamente.",
    );
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
        availableCount={availableCount}
        expiringSoonCount={expiringSoonCount}
        emittedInPeriod={effectiveEmitted}
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
                placeholder="Filtrar por código o paciente..."
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
                value={originFilter}
                onChange={(event) =>
                  setOriginFilter(event.target.value as OriginFilter)
                }
                className="app-select rounded-xl border border-app-border bg-app-bg px-4 py-3 text-[11px] font-black uppercase tracking-wide text-app-text-main"
                aria-label="Filtrar por origen"
              >
                <option value="ALL">Origen: Todos</option>
                <option value="ORGANIZATION">Con organizacion</option>
                <option value="THERAPIST">Con terapeuta</option>
                <option value="UNASSIGNED">Sin asignacion</option>
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
              {(paginatedData.items as BatchSummary[]).length === 0 ? (
                <div className="col-span-full app-card !p-20 text-center flex flex-col items-center gap-4 opacity-40">
                  <Filter className="h-12 w-12" />
                  <p className="app-label">
                    No hay lotes que coincidan con estos filtros
                  </p>
                </div>
              ) : (
                (paginatedData.items as BatchSummary[]).map((batch) => (
                  <VoucherBatchRow key={batch.batchId} batch={batch} />
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
                          Origen de emisión
                        </th>
                      )}
                      <th className="px-5 py-5 app-label opacity-40">
                        Paciente / Destino
                      </th>
                      <th className="px-5 py-5 app-label opacity-40">
                        Registro de Uso
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
    </div>
  );
}
