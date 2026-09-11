import { AlertTriangle, Building2, CircleDollarSign, Target, TicketCheck, X, Activity } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, type ReactNode } from "react";
import { StatCard } from "../../../../components/atoms/StatCard";
import type { PurchaseSummary } from "../../api/purchase-summary.api";
import {
  purchaseAmountComparison,
  purchaseAmountPresentation,
  purchaseComparison,
} from "../../utils/purchase-summary-presenters";
import type { DashboardStatsResponse } from "@akit/contracts";

type PlatformPurchaseSummary = Extract<PurchaseSummary, { scope: "PLATFORM" }>;

interface PlatformDashboardSummaryProps {
  purchaseData: PlatformPurchaseSummary | null;
  purchaseLoading: boolean;
  purchaseError: Error | null;
  onRetry: () => void;
  adminStats?: DashboardStatsResponse;
  periodSelector?: ReactNode;
}

function AlertStrip({
  children,
  to,
  closeLabel,
  onDismiss,
}: {
  children: ReactNode;
  to: string;
  closeLabel?: string;
  onDismiss?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-status-warning/30 bg-status-warning/10">
      <Link
        to={to}
        className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-2xl px-4 text-sm font-bold text-app-text-main transition-colors hover:bg-status-warning/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-primary"
      >
        <AlertTriangle className="h-5 w-5 shrink-0 text-status-warning" aria-hidden="true" />
        <span>{children}</span>
      </Link>
      {onDismiss && closeLabel && (
        <button
          type="button"
          aria-label={closeLabel}
          onClick={onDismiss}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-app-text-main hover:bg-status-warning/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-primary"
        >
          <X className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">{closeLabel}</span>
        </button>
      )}
    </div>
  );
}

export function PlatformDashboardSummary({
  purchaseData,
  purchaseLoading,
  purchaseError,
  onRetry,
  adminStats,
  periodSelector,
}: PlatformDashboardSummaryProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(() => new Set());
  const dismissAlert = (alertType: string, count: number) => {
    setDismissedAlerts((current) => new Set(current).add(`${alertType}:${count}`));
  };
  const isAlertVisible = (alertType: string, count: number) =>
    !dismissedAlerts.has(`${alertType}:${count}`);

  const purchaseUnavailable = purchaseLoading || purchaseError !== null || purchaseData === null;
  const purchaseStatusDescription = purchaseLoading
    ? "Cargando compras…"
    : "Datos no disponibles.";

  const amount = purchaseData
    ? purchaseAmountPresentation(purchaseData.current.accreditedAmountByCurrency)
    : { value: "—", description: purchaseStatusDescription };

  const amountComparison = purchaseData
    ? purchaseAmountComparison(
        purchaseData.current.accreditedAmountByCurrency,
        purchaseData.prior.accreditedAmountByCurrency,
      )
    : null;

  const institutionComparison = purchaseData
    ? purchaseComparison(
        purchaseData.current.purchasingInstitutionCount,
        purchaseData.prior.purchasingInstitutionCount,
      )
    : null;

  let revenueDescription = purchaseUnavailable ? purchaseStatusDescription : amountComparison ?? amount.description;
  if (!purchaseUnavailable && adminStats?.channelBreakdown?.googlePlay) {
    const b2cRevenue = adminStats.channelBreakdown.googlePlay.revenueUsd || 0;
    revenueDescription = `${revenueDescription} · Incluye B2C (App Móvil): USD ${b2cRevenue.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // Nivel 1: Alertas en Tiempo Real (Acción Requerida)
  const expiringVoucherAlert = adminStats?.alerts?.find(a => a.id === 'vouchers-expiring');
  
  // Dummy check for BullMQ queue status as requested (can be improved later)
  const hasQueueErrors = false; 

  const hasAnyAlert = 
    (purchaseData && purchaseData.alerts.paidButNotFulfilledCount > 0 && isAlertVisible("pending-accreditation", purchaseData.alerts.paidButNotFulfilledCount)) ||
    (purchaseData && purchaseData.alerts.notificationAttentionCount > 0 && isAlertVisible("purchase-notifications", purchaseData.alerts.notificationAttentionCount)) ||
    (expiringVoucherAlert) ||
    (hasQueueErrors);

  return (
    <div className="space-y-8">
      {/* Nivel 1: Alertas Operativas en Tiempo Real */}
      {hasAnyAlert && (
        <section aria-label="Requiere atención" className="rounded-2xl border border-status-warning/40 bg-status-warning/5 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-status-warning" />
            <h3 className="font-bold text-status-warning">Requiere atención</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {purchaseData && purchaseData.alerts.paidButNotFulfilledCount > 0 && isAlertVisible("pending-accreditation", purchaseData.alerts.paidButNotFulfilledCount) && (
              <AlertStrip
                to="/dashboard/payment-ledger"
                closeLabel="Cerrar alerta"
                onDismiss={() => dismissAlert("pending-accreditation", purchaseData.alerts.paidButNotFulfilledCount)}
              >
                {purchaseData.alerts.paidButNotFulfilledCount} pago(s) pendiente(s) de acreditación
              </AlertStrip>
            )}
            {purchaseData && purchaseData.alerts.notificationAttentionCount > 0 && isAlertVisible("purchase-notifications", purchaseData.alerts.notificationAttentionCount) && (
              <AlertStrip
                to="/dashboard/payment-ledger"
                closeLabel="Cerrar alerta"
                onDismiss={() => dismissAlert("purchase-notifications", purchaseData.alerts.notificationAttentionCount)}
              >
                {purchaseData.alerts.notificationAttentionCount} notificación(es) de pago fallida(s)
              </AlertStrip>
            )}
            {expiringVoucherAlert && (
              <AlertStrip to="/dashboard/vouchers">
                {expiringVoucherAlert.description}
              </AlertStrip>
            )}
            {hasQueueErrors && (
              <AlertStrip to="/dashboard/queues">
                Estado crítico en colas BullMQ (generate-pdf / send-email)
              </AlertStrip>
            )}
          </div>
        </section>
      )}

      {/* Nivel 2: 4 KPIs Principales vinculados al período */}
      <section aria-label="KPIs Principales" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div>
            <h3 className="text-sm font-bold text-app-text-main">Rendimiento del período</h3>
            <p className="text-xs text-app-text-muted">
              {adminStats ? adminStats.periodLabel : "Métricas en el rango seleccionado"}
            </p>
          </div>
          {periodSelector}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={CircleDollarSign}
            label="Facturación Acreditada"
            value={amount.value}
            description={revenueDescription}
            valueColor="text-app-primary"
          />
          <StatCard
            icon={TicketCheck}
            label="Vouchers Canjeados"
            value={adminStats ? adminStats.vouchersRedeemedPeriod : "—"}
            description={
              adminStats
                ? `${adminStats.availableVouchers} disponibles en circulación.`
                : "Consumo del período vs stock disponible."
            }
            valueColor="text-app-primary"
          />
          <StatCard
            icon={Target}
            label="Tasa de Finalización"
            value={adminStats ? `${adminStats.completionRate}%` : "—"}
            description="% de sesiones iniciadas que se completaron con éxito."
            valueColor="text-app-primary"
          />
          <StatCard
            icon={Building2}
            label="Instituciones Activas"
            value={purchaseUnavailable ? "—" : purchaseData.current.purchasingInstitutionCount}
            description={purchaseUnavailable ? purchaseStatusDescription : institutionComparison ?? "En el período seleccionado."}
            valueColor="text-app-primary"
          />
        </div>

        {purchaseError && (
          <div role="alert" className="flex flex-col gap-2 rounded-2xl border border-status-warning/30 bg-status-warning/10 p-3 text-sm text-app-text-main sm:flex-row sm:items-center sm:justify-between">
            <span>Las métricas de compras no están disponibles.</span>
            <button
              type="button"
              onClick={onRetry}
              className="min-h-11 rounded-xl px-4 font-bold text-app-primary hover:bg-app-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-primary"
            >
              Reintentar
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
