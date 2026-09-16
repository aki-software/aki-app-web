import { Building2, CircleDollarSign, Target, TicketCheck } from "lucide-react";
import { type ReactNode } from "react";
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

export function PlatformDashboardSummary({
  purchaseData,
  purchaseLoading,
  purchaseError,
  onRetry,
  adminStats,
  periodSelector,
}: PlatformDashboardSummaryProps) {
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

  return (
    <div className="space-y-8">
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
            description={purchaseUnavailable ? purchaseStatusDescription : amountComparison ?? amount.description}
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
