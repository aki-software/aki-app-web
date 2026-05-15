import { AlertTriangle, Layers3 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "../../auth/hooks/useAuth";
import { PERIOD_DAYS } from "../constants/vouchers.constants";
import { useVoucherList } from "../hooks/useVoucherList";
import { useVoucherStats } from "../hooks/useVoucherStats";
import { useVoucherForm } from "../hooks/useVoucherForm";
import { useVoucherActions } from "../hooks/useVoucherActions";
import { Alert } from "../../../components/atoms/Alert";
import { VoucherEmitForm } from "../components/vouchers/VoucherEmitForm";
import { VoucherStatsCards } from "../components/vouchers/VoucherStatsCards";
import { VoucherSessionsTable } from "../components/vouchers/VoucherSessionsTable";
import { BatchDetailDrawer } from "../components/vouchers/BatchDetailDrawer";
import { VouchersFilterBar } from "../components/vouchers/VouchersFilterBar";
import { VouchersIndividualTable } from "../components/vouchers/VouchersIndividualTable";
import { VoucherBatchesGrid } from "../components/vouchers/VoucherBatchesGrid";
import { fetchVoucherBatchDetail, fetchVoucherSessions } from "../api/dashboard";
import type { SessionData } from "../api/sessions.api";
import type { VoucherBatchDetailResponse } from "@akit/contracts";

export function DashboardVouchers() {
  const { user } = useAuth();
  const isAdmin = user?.role?.toUpperCase() === "ADMIN";

  // Messages State
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // 1. Stats & Metadata Hook
  const statsManager = useVoucherStats(user, isAdmin);

  // 2. Form Hook
  const formManager = useVoucherForm(statsManager.therapists);

  // 3. Actions Hook
  const actionManager = useVoucherActions(
    (msg) => {
      setSuccessMessage(msg);
      setErrorMessage(null);
      setReloadToken(prev => prev + 1);
      statsManager.refreshStats();
    },
    (msg) => {
      setErrorMessage(msg);
      setSuccessMessage(null);
    }
  );

  // 4. List & Filters State
  const [viewMode, setViewMode] = useState<"BATCHES" | "INDIVIDUAL">(isAdmin ? "BATCHES" : "INDIVIDUAL");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "AVAILABLE" | "USED" | "EXPIRED">("ALL");
  const [expirationFilter, setExpirationFilter] = useState<"ALL" | "EXPIRING_7D" | "NO_EXPIRATION">("ALL");
  const [clientFilter, setClientFilter] = useState("ALL");

  const listManager = useVoucherList({
    searchTerm, statusFilter, expirationFilter, clientFilter
  }, viewMode, reloadToken);

  // UI Local State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedBatchDetail, setSelectedBatchDetail] = useState<VoucherBatchDetailResponse | null>(null);
  const [batchDetailLoading, setBatchDetailLoading] = useState(false);
  const [batchDetailError, setBatchDetailError] = useState<string | null>(null);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);
  const [voucherSessions, setVoucherSessions] = useState<SessionData[]>([]);
  const [loadingVoucherSessions, setLoadingVoucherSessions] = useState(false);

  // Detail Loading Logic (Extracted from component)
  useEffect(() => {
    if (!selectedBatchId) return;
    let isActive = true;
    const load = async () => {
      setBatchDetailLoading(true);
      setBatchDetailError(null);
      try {
        const detail = await fetchVoucherBatchDetail(selectedBatchId);
        if (isActive) {
          if (!detail) setBatchDetailError("No se pudo cargar el detalle del lote.");
          else setSelectedBatchDetail(detail);
        }
      } catch (err) {
        if (isActive) setBatchDetailError("Error de red.");
      } finally {
        if (isActive) setBatchDetailLoading(false);
      }
    };
    load();
    return () => { isActive = false; };
  }, [selectedBatchId]);

  const handleLoadVoucherSessions = async (voucherId: string) => {
    setLoadingVoucherSessions(true);
    try {
      const sessions = await fetchVoucherSessions(voucherId);
      setVoucherSessions(sessions);
      setSelectedVoucherId(voucherId);
    } catch (error) {
      setErrorMessage('No se pudieron cargar las sesiones del voucher');
    } finally {
      setLoadingVoucherSessions(false);
    }
  };

  const handleEmitVoucherSubmit = async (e: any) => {
    const result = await formManager.handleEmitVoucher(e);
    if (result) {
      setSuccessMessage(formManager.success); // Use message from hook
      setShowCreateForm(false);
      setReloadToken(prev => prev + 1);
      statsManager.refreshStats();
    } else {
      setErrorMessage(formManager.error);
    }
  };

  if (statsManager.loading && listManager.batchItems.length === 0) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-app-text-muted">
        <Layers3 className="h-8 w-8 animate-pulse text-app-primary" />
        <span className="app-label">Sincronizando...</span>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in">
      {statsManager.alerts.length > 0 && (
        <div className="space-y-3">
          {statsManager.alerts.map((alert, idx) => (
            <Alert 
              key={idx} 
              type={alert.severity === 'critical' ? "error" : "warning"} 
              message={alert.message} 
              icon={<AlertTriangle />}
            />
          ))}
        </div>
      )}

      <VoucherStatsCards
        isAdmin={isAdmin}
        showCreateForm={showCreateForm}
        onToggleForm={() => setShowCreateForm(prev => !prev)}
        stats={statsManager.stats}
        periodDays={PERIOD_DAYS}
      />

      <Alert type="success" message={successMessage || ""} />
      <Alert type="error" message={errorMessage || ""} />

      {showCreateForm && (
        <VoucherEmitForm
          institutions={statsManager.institutions}
          therapists={statsManager.therapists}
          formState={formManager.formState}
          setFormState={formManager.setFormState}
          onSubmit={handleEmitVoucherSubmit}
          saving={formManager.saving}
          errorMessage={formManager.error}
          successMessage={formManager.success}
          resetMessages={() => { formManager.resetFormMessages(); setErrorMessage(null); setSuccessMessage(null); }}
        />
      )}

      <div className="space-y-8">
        <VouchersFilterBar
            isAdmin={isAdmin}
            viewMode={viewMode}
            setViewMode={setViewMode}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            expirationFilter={expirationFilter}
            setExpirationFilter={setExpirationFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            clientFilter={clientFilter}
            setClientFilter={setClientFilter}
            clientOptions={statsManager.clientOptions}
        />

        {viewMode === "BATCHES" ? (
          <VoucherBatchesGrid
            items={listManager.batchItems}
            currentPage={listManager.currentPage}
            totalPages={listManager.batchTotalPages}
            onPageChange={listManager.setCurrentPage}
            onOpenDetail={setSelectedBatchId}
          />
        ) : (
          <VouchersIndividualTable
            items={listManager.individualItems}
            isAdmin={isAdmin}
            currentPage={listManager.currentPage}
            totalPages={listManager.individualTotalPages}
            onPageChange={listManager.setCurrentPage}
            onVoucherUpdated={() => { if (!actionManager.actionBusy) setReloadToken(p => p + 1); }}
            onViewSessions={handleLoadVoucherSessions}
            actionManager={actionManager}
          />
        )}
      </div>

      {selectedBatchId && (
        <BatchDetailDrawer
          batchId={selectedBatchId}
          detail={selectedBatchDetail}
          loading={batchDetailLoading}
          error={batchDetailError}
          isAdmin={isAdmin}
          onClose={() => { setSelectedBatchId(null); setSelectedBatchDetail(null); }}
        />
      )}

      {selectedVoucherId && (
        <div className="mt-16 pt-16 border-t border-app-border">
          <VoucherSessionsTable
            voucherId={selectedVoucherId}
            sessions={voucherSessions}
            loading={loadingVoucherSessions}
          />
        </div>
      )}
    </div>
  );
}
