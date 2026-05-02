import { AlertTriangle, Layers3 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../auth/hooks/useAuth";
import { PERIOD_DAYS } from "../constants/vouchers.constants";
import { useVouchersManager } from "../hooks/useVouchersManager"; 
import { Alert } from "../../../components/atoms/Alert";
import { VoucherEmitForm } from "../components/vouchers/VoucherEmitForm";
import { VoucherStatsCards } from "../components/vouchers/VoucherStatsCards";
import { VoucherSessionsTable } from "../components/vouchers/VoucherSessionsTable";
import { BatchDetailDrawer } from "../components/vouchers/BatchDetailDrawer";
import { VouchersFilterBar } from "../components/vouchers/VouchersFilterBar";
import { VouchersIndividualTable } from "../components/vouchers/VouchersIndividualTable";
import { VoucherBatchesGrid } from "../components/vouchers/VoucherBatchesGrid";

export function DashboardVouchers() {
  const { user } = useAuth();
  const manager = useVouchersManager(user); 
  const [showCreateForm, setShowCreateForm] = useState(false);

  if (manager.loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-app-text-muted">
        <Layers3 className="h-8 w-8 animate-pulse text-app-primary" />
        <span className="app-label">Sincronizando...</span>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in">
      
      {manager.alerts.length > 0 && (
        <div className="space-y-3">
          {manager.alerts.map((alert, idx) => (
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
        isAdmin={manager.isAdmin}
        showCreateForm={showCreateForm}
        onToggleForm={() => setShowCreateForm(prev => !prev)}
        stats={manager.stats}
        periodDays={PERIOD_DAYS}
      />

      <Alert type="success" message={manager.successMessage || ""} />
      <Alert type="error" message={manager.errorMessage || ""} />

      {showCreateForm && (
        <VoucherEmitForm
          institutions={manager.institutions}
          therapists={manager.therapists}
          formState={manager.formState}
          setFormState={manager.setFormState}
          onSubmit={manager.handleEmitVoucher}
          saving={manager.saving}
          errorMessage={manager.errorMessage}
          successMessage={manager.successMessage}
          resetMessages={manager.resetMessages}
        />
      )}

      <div className="space-y-8">
        <VouchersFilterBar
            isAdmin={manager.isAdmin}
            viewMode={manager.viewMode}
            setViewMode={manager.setViewMode}
            searchTerm={manager.searchTerm}
            setSearchTerm={manager.setSearchTerm}
            expirationFilter={manager.expirationFilter}
            setExpirationFilter={manager.setExpirationFilter}
            statusFilter={manager.statusFilter}
            setStatusFilter={manager.setStatusFilter}
            clientFilter={manager.clientFilter}
            setClientFilter={manager.setClientFilter}
            clientOptions={manager.clientOptions}
        />

        {/* ORQUESTACIÓN DE VISTAS */}
        {manager.viewMode === "BATCHES" ? (
          <VoucherBatchesGrid
            items={manager.batchItems}
            currentPage={manager.currentPage}
            totalPages={manager.batchTotalPages}
            onPageChange={manager.setCurrentPage}
            onOpenDetail={manager.handleOpenBatchDetail}
          />
        ) : (
          <VouchersIndividualTable
            items={manager.individualItems}
            isAdmin={manager.isAdmin}
            currentPage={manager.currentPage}
            totalPages={manager.individualTotalPages}
            onPageChange={manager.setCurrentPage}
            onVoucherUpdated={manager.handleVoucherActionResult}
            onViewSessions={manager.loadVoucherSessions}
          />
        )}
      </div>

      {manager.selectedBatchId && (
        <BatchDetailDrawer
          batchId={manager.selectedBatchId}
          detail={manager.selectedBatchDetail}
          loading={manager.batchDetailLoading}
          error={manager.batchDetailError}
          isAdmin={manager.isAdmin}
          onClose={manager.handleCloseBatchDetail}
        />
      )}

      {manager.selectedVoucherId && (
        <div className="mt-16 pt-16 border-t border-app-border">
          <VoucherSessionsTable
            voucherId={manager.selectedVoucherId}
            sessions={manager.voucherSessions}
            loading={manager.loadingVoucherSessions}
          />
        </div>
      )}
    </div>
  );
}