import { BarChart3, Calendar, Sparkles } from "lucide-react";
import { useAuth } from "../../auth/hooks/useAuth";
import { getFormattedCurrentDate } from "../../../utils/date";
import { DEFAULT_DASHBOARD_STATS, DASHBOARD_UI_TEXTS } from "../constants/dashboard.constants";
import { Spinner } from "../../../components/atoms/Spinner";
import { DashboardWidget } from "../../../components/molecules/DashboardWidget";
import { PeriodSelector } from "../../../components/molecules/PeriodSelector";
import { EmptyState } from "../../../components/molecules/EmptyState";
import { ActivityFeed } from "../components/overview/ActivityFeed";
import { OverviewHighlights } from "../components/overview/OverviewHighlights";
import { QuickActions } from "../components/overview/QuickActions";
import { SessionsChart } from "../components/SessionsChart";
import { PlatformDashboardSummary } from "../components/admin/PlatformDashboardSummary";
import { InstitutionDashboardOverview } from "./InstitutionDashboardOverview";
import { useAdminDashboardStats } from "../hooks/useAdminDashboardStats";
import { usePurchaseSummary, type PurchaseSummaryPeriod } from "../hooks/usePurchaseSummary";

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

          <PlatformDashboardSummary
            purchaseData={purchaseSummary.data?.scope === "PLATFORM" ? purchaseSummary.data : null}
            purchaseLoading={purchaseSummary.loading}
            purchaseError={purchaseSummary.error}
            onRetry={purchaseSummary.retry}
            adminStats={displayStats}
            periodSelector={<PeriodSelector value={periodDays} onChange={setPeriodDays} />}
          />

          <section
            aria-labelledby="operational-detail-heading"
            className="rounded-2xl border border-app-border bg-app-surface/50"
          >
            <h3 id="operational-detail-heading" className="px-5 py-3 text-sm font-bold text-app-text-main">
              Detalle operativo de vouchers y canales
            </h3>
            <div className="border-t border-app-border p-4 sm:p-6">
              <OverviewHighlights {...displayStats} />
            </div>
          </section>
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

      <div className="space-y-6">
        <div className="flex items-center gap-3 px-1">
          <span className="app-label opacity-60 tracking-[0.2em]">Centro de operación</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            <QuickActions isAdmin={isAdmin} />
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
