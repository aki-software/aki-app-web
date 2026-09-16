import { BarChart3, Calendar, Clock, Sparkles } from "lucide-react";
import type { AdminAlert } from "@akit/contracts";
import { useAuth } from "../../auth/hooks/useAuth";
import { getFormattedCurrentDate } from "../../../utils/date";
import { DEFAULT_DASHBOARD_STATS, DASHBOARD_UI_TEXTS } from "../constants/dashboard.constants";
import { Spinner } from "../../../components/atoms/Spinner";
import { DashboardWidget } from "../../../components/molecules/DashboardWidget";
import { PeriodSelector } from "../../../components/molecules/PeriodSelector";
import { EmptyState } from "../../../components/molecules/EmptyState";
import { ActivityFeed } from "../components/overview/ActivityFeed";
import { AdminAlerts } from "../components/overview/AdminAlerts";
import { OverviewHighlights } from "../components/overview/OverviewHighlights";
import { QuickActions } from "../components/overview/QuickActions";
import { SessionsChart } from "../components/SessionsChart";
import { ResultsDistributionChart } from "../components/ResultsDistributionChart";
import { PlatformDashboardSummary } from "../components/admin/PlatformDashboardSummary";
import { InstitutionDashboardOverview } from "./InstitutionDashboardOverview";
import { useAdminDashboardStats } from "../hooks/useAdminDashboardStats";
import { usePurchaseSummary, type PurchaseSummaryPeriod } from "../hooks/usePurchaseSummary";
import type { PurchaseSummary } from "../api/purchase-summary.api";

type PlatformPurchaseSummary = Extract<PurchaseSummary, { scope: "PLATFORM" }>;

function getPurchaseAlerts(
  purchaseData: PlatformPurchaseSummary | null,
): AdminAlert[] {
  if (!purchaseData) return [];

  const alerts: AdminAlert[] = [];
  const { alerts: purchaseAlerts } = purchaseData;

  if (purchaseAlerts.paidButNotFulfilledCount > 0) {
    alerts.push({
      id: `pending-accreditation:${purchaseAlerts.paidButNotFulfilledCount}`,
      severity: "warning",
      title: "Acreditaciones pendientes",
      description: `${purchaseAlerts.paidButNotFulfilledCount} pago(s) esperan la acreditación de sus vouchers.`,
      actionLabel: "Revisar pagos",
      actionPath: "/dashboard/payment-ledger?fulfillmentState=PENDING",
    });
  }

  if (purchaseAlerts.notificationAttentionCount > 0) {
    alerts.push({
      id: `purchase-notifications:${purchaseAlerts.notificationAttentionCount}`,
      severity: "critical",
      title: "Notificaciones de pago fallidas",
      description: `${purchaseAlerts.notificationAttentionCount} notificación(es) requieren revisión.`,
      actionLabel: "Revisar notificaciones",
      actionPath: "/dashboard/payment-ledger?notificationStatus=RETRYABLE_FAILED",
    });
  }

  return alerts;
}

function AdminDashboardOverview({ isAdmin }: { isAdmin: boolean }) {
  const { stats: adminStats, loading, periodDays, setPeriodDays } = useAdminDashboardStats();
  const isPurchasePeriod = [7, 30, 90].includes(periodDays);
  const purchaseSummary = usePurchaseSummary(
    periodDays as PurchaseSummaryPeriod,
    isPurchasePeriod,
  );

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-app-text-muted">
        <Spinner size="lg" className="border-app-primary" />
        <span className="app-label !text-xs tracking-[0.25em] animate-pulse">
          Sincronizando panel operativo
        </span>
      </div>
    );
  }
  const displayStats = adminStats || DEFAULT_DASHBOARD_STATS;
  const uiTexts = DASHBOARD_UI_TEXTS;
  const directResults = displayStats.resultsDistribution.filter((item) => item.count > 0);
  const pendingDirectReports = displayStats.individualPendingReports ?? Math.max(
    0,
    displayStats.channelBreakdown.individual.completed -
      displayStats.channelBreakdown.individual.reportsUnlocked,
  );
  const platformPurchaseData = purchaseSummary.data?.scope === "PLATFORM"
    ? purchaseSummary.data
    : null;
  const operationalAlerts = [
    ...displayStats.alerts,
    ...getPurchaseAlerts(platformPurchaseData),
  ];
  const pendingPaymentCount = platformPurchaseData?.alerts.paidButNotFulfilledCount ?? 0;

  return (
    <div className="space-y-12 animate-in pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-app-border pb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-5 w-5 text-app-primary" />
            <span className="app-label !text-app-primary">{uiTexts.header.tag}</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-app-text-main tracking-tight leading-none max-w-3xl">
            {uiTexts.header.title}
          </h2>
          <p className="mt-3 text-sm font-medium text-app-text-muted max-w-lg leading-relaxed">
            {uiTexts.header.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-app-surface/80 border border-app-border backdrop-blur-xl">
            <Calendar className="h-4 w-4 text-app-text-muted opacity-40" />
            <span className="app-label !text-[10px] opacity-60 uppercase">
              {getFormattedCurrentDate()}
            </span>
          </div>
        </div>
      </div>

      <section aria-label="Requiere atención">
        <AdminAlerts alerts={operationalAlerts} />
      </section>

          <PlatformDashboardSummary
            purchaseData={platformPurchaseData}
            purchaseLoading={purchaseSummary.loading}
            purchaseError={purchaseSummary.error}
            onRetry={purchaseSummary.retry}
            adminStats={displayStats}
            periodSelector={<PeriodSelector value={periodDays} onChange={setPeriodDays} />}
          />

          <details className="rounded-2xl border border-app-border bg-app-surface/50">
            <summary className="cursor-pointer list-none px-5 py-3 text-sm font-bold text-app-text-main focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-primary">
              Ver detalle operativo de vouchers y canales
            </summary>
            <div className="border-t border-app-border p-4 sm:p-6">
              <OverviewHighlights {...displayStats} />
            </div>
          </details>
      <div className="grid grid-cols-1 gap-6 xl:gap-8">
        {isAdmin && adminStats ? (
          <DashboardWidget
            title={uiTexts.widgets.sessions.title}
            description={`${uiTexts.widgets.sessions.description} ${displayStats.periodLabel.toLowerCase()}.`}
            icon={BarChart3}
          >
                {adminStats.sessionsActivity.length > 0 ? (
                  <div className="h-[220px] sm:h-[260px] xl:h-[300px]">
                    <SessionsChart data={adminStats.sessionsActivity} />
                  </div>
                ) : (
                  <EmptyState
                    title="Sin sesiones en el período"
                    description="No hay actividad de sesiones para mostrar en el período seleccionado."
                  />
                )}
          </DashboardWidget>
        ) : (
          <div className="col-span-full app-card !p-1 bg-app-surface/70 border-dashed">
            <EmptyState
              title="Analítica operativa en preparación"
              description="Estamos procesando los datos para mostrarte las métricas de este periodo."
            />
          </div>
        )}
      </div>

      <section className="space-y-4" aria-labelledby="direct-results-heading">
        <div className="flex items-center gap-3 px-1">
          <span className="app-label opacity-60 tracking-[0.2em]">Resultados de plataforma</span>
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <DashboardWidget
              title="Resultados predominantes"
              description="Distribución histórica de tests directos: Google Play y sesiones pendientes de desbloqueo, sin voucher."
              icon={BarChart3}
              iconColorClass="text-status-success"
            >
              <h3 id="direct-results-heading" className="sr-only">Resultados predominantes de sesiones directas</h3>
              {directResults.length > 0 ? (
                <div className="h-[240px] sm:h-[280px]">
                  <ResultsDistributionChart data={directResults} />
                </div>
              ) : (
                <EmptyState
                  title="Sin resultados directos"
                  description="Todavía no hay tests sin voucher con resultados para distribuir."
                />
              )}
            </DashboardWidget>
          </div>
          <div className="rounded-2xl border border-status-warning/30 bg-status-warning/5 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-status-warning" aria-hidden="true" />
              <div>
                <p className="app-label !text-[10px] text-status-warning">Seguimiento de informes</p>
                <p className="mt-3 text-4xl font-black tracking-tight text-app-text-main">
                  {pendingDirectReports}
                </p>
                <p className="mt-1 text-sm font-bold text-app-text-main">Sesiones directas pendientes</p>
                <p className="mt-2 text-xs leading-relaxed text-app-text-muted">
                  Tests completados sin voucher que todavía no tienen el informe desbloqueado.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="space-y-6">
        <div className="flex items-center gap-3 px-1">
          <span className="app-label opacity-60 tracking-[0.2em]">Centro de operación</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            <QuickActions
              isAdmin={isAdmin}
              pendingPaymentCount={pendingPaymentCount}
              pendingReportCount={pendingDirectReports}
            />
          </div>
          <div className="lg:col-span-5 xl:col-span-4 h-full">
            <ActivityFeed events={adminStats?.activity ?? []} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardOverview() {
  const { user } = useAuth();
  const isAdmin = user?.role?.toUpperCase() === "ADMIN";

  if (!isAdmin) {
    return <InstitutionDashboardOverview />;
  }

  return <AdminDashboardOverview isAdmin={isAdmin} />;
}
