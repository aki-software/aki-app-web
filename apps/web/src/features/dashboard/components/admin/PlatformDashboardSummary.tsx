import { AlertTriangle, Building2, CircleDollarSign, ClipboardCheck, TicketCheck } from "lucide-react";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { StatCard } from "../../../../components/atoms/StatCard";
import type { PurchaseSummary } from "../../api/purchase-summary.api";
import {
      purchaseAmountComparison,
      purchaseAmountPresentation,
      purchaseComparison,
      purchaseCountLabel,

} from "../../utils/purchase-summary-presenters";

type PlatformPurchaseSummary = Extract<PurchaseSummary, { scope: "PLATFORM" }>;

interface PlatformDashboardSummaryProps {
  purchaseData: PlatformPurchaseSummary | null;
  purchaseLoading: boolean;
  purchaseError: Error | null;
  onRetry: () => void;
  triageCount: number | null;
  institutionAlertsCount: number;
}

function AlertStrip({ children, to }: { children: ReactNode; to: string }) {
  return (
    <Link
      to={to}
      className="flex min-h-11 items-center gap-3 rounded-2xl border border-status-warning/30 bg-status-warning/10 px-4 text-sm font-bold text-app-text-main transition-colors hover:bg-status-warning/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-primary"
    >
      <AlertTriangle className="h-5 w-5 shrink-0 text-status-warning" aria-hidden="true" />
      <span>{children}</span>
    </Link>
  );
}

export function PlatformDashboardSummary({
  purchaseData,
  purchaseLoading,
  purchaseError,
  onRetry,
  triageCount,
  institutionAlertsCount,
}: PlatformDashboardSummaryProps) {
  const purchaseUnavailable = purchaseLoading || purchaseError !== null || purchaseData === null;
  const purchaseStatusDescription = purchaseLoading
    ? "Cargando compras…"
    : "Datos de compras no disponibles.";
  const amount = purchaseData
    ? purchaseAmountPresentation(purchaseData.current.accreditedAmountByCurrency)
    : { value: "—", description: purchaseStatusDescription };
  const voucherComparison = purchaseData
    ? purchaseComparison(
        purchaseData.current.accreditedVoucherCount,
        purchaseData.prior.accreditedVoucherCount,
      )
    : null;
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

  return (
    <section aria-label="Resumen de plataforma" className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={TicketCheck}
          label="Vouchers acreditados"
          value={purchaseUnavailable ? "—" : purchaseData.current.accreditedVoucherCount}
          description={purchaseUnavailable ? purchaseStatusDescription : voucherComparison ?? "En el período seleccionado."}
          valueColor="text-app-primary"
        />
        <StatCard
          icon={CircleDollarSign}
          label="Monto acreditado"
          value={amount.value}
          description={purchaseUnavailable ? purchaseStatusDescription : amountComparison ?? amount.description}
          valueColor="text-app-primary"
        />
        <StatCard
          icon={Building2}
          label="Instituciones compradoras"
          value={purchaseUnavailable ? "—" : purchaseData.current.purchasingInstitutionCount}
          description={purchaseUnavailable ? purchaseStatusDescription : institutionComparison ?? "En el período seleccionado."}
          valueColor="text-app-primary"
        />
        <StatCard
          icon={ClipboardCheck}
          label="Sesiones por revisar"
          value={triageCount ?? "—"}
          description={triageCount === null ? "Datos de sesiones no disponibles." : "Sesiones que requieren revisión."}
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

      <div className="grid gap-3">
        {purchaseData && purchaseData.alerts.paidButNotFulfilledCount > 0 && (
          <AlertStrip to="/dashboard/payment-ledger">
            {purchaseCountLabel(
                  purchaseData.alerts.paidButNotFulfilledCount,
                  "compra pendiente de acreditación",
                  "compras pendientes de acreditación",
                )}
          </AlertStrip>
        )}
        {purchaseData && purchaseData.alerts.notificationAttentionCount > 0 && (
          <AlertStrip to="/dashboard/payment-ledger">
            {purchaseCountLabel(
                  purchaseData.alerts.notificationAttentionCount,
                  "notificación de compra no enviada",
                  "notificaciones de compra no enviadas",
                )}
          </AlertStrip>
        )}
        {institutionAlertsCount > 0 && (
          <AlertStrip to="/dashboard/users">
            {purchaseCountLabel(
                  institutionAlertsCount,
                  "alerta institucional pendiente",
                  "alertas institucionales pendientes",
                )}
          </AlertStrip>
        )}
      </div>
    </section>
  );
}
