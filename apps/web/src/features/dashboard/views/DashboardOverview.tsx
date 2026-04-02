import { DashboardStatsResponse } from "@akit/contracts";
import {
    Activity,
    BarChart3,
    Calendar,
    Sparkles,
    TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../../auth/hooks/useAuth";
import {
    fetchDashboardStats,
    fetchInstitutionStats,
    type InstitutionStats,
} from "../api/dashboard";
import { ActivityFeed } from "../components/overview/ActivityFeed";
import { AdminAlerts } from "../components/overview/AdminAlerts";
import { OverviewHighlights } from "../components/overview/OverviewHighlights";
import { QuickActions } from "../components/overview/QuickActions";
import { ResultsDistributionChart } from "../components/ResultsDistributionChart";
import { SessionsChart } from "../components/SessionsChart";

export function DashboardOverview() {
  const { user } = useAuth();
  const isAdmin = user?.role?.toUpperCase() === "ADMIN";
  const isInstitution = !!user?.institutionId && !isAdmin;

  const [adminStats, setAdminStats] = useState<DashboardStatsResponse | null>(
    null,
  );
  const [institutionStats, setInstitutionStats] =
    useState<InstitutionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        if (isInstitution && user?.institutionId) {
          const data = await fetchInstitutionStats(user.institutionId);
          setInstitutionStats(data);
        } else {
          const data = await fetchDashboardStats();
          setAdminStats(data);
        }
      } catch (error) {
        console.error("Error loading stats:", error);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, [isInstitution, user?.institutionId]);

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-app-text-muted">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-app-primary border-t-transparent" />
        <span className="app-label !text-xs tracking-[0.25em] animate-pulse">
          Sincronizando panel operativo
        </span>
      </div>
    );
  }

  const displayStats = isInstitution
    ? {
        availableVouchers: institutionStats?.availableVouchers || 0,
        redeemedVouchers: institutionStats?.redeemedVouchers || 0,
        periodLabel: "Ultimos 7 dias",
        testsStartedPeriod: institutionStats?.totalSessions || 0,
        testsCompletedPeriod: 0,
        voucherRedemptionRatePeriod: 0,
        channelBreakdown: {
          voucher: { started: 0, completed: 0, reportsUnlocked: 0 },
          individual: { started: 0, completed: 0, reportsUnlocked: 0 },
        },
      }
    : {
        availableVouchers: adminStats?.availableVouchers || 0,
        redeemedVouchers: adminStats?.redeemedVouchers || 0,
        periodLabel: adminStats?.periodLabel || "Ultimos 7 dias",
        testsStartedPeriod: adminStats?.testsStartedPeriod || 0,
        testsCompletedPeriod: adminStats?.testsCompletedPeriod || 0,
        voucherRedemptionRatePeriod:
          adminStats?.voucherRedemptionRatePeriod || 0,
        channelBreakdown: adminStats?.channelBreakdown || {
          voucher: { started: 0, completed: 0, reportsUnlocked: 0 },
          individual: { started: 0, completed: 0, reportsUnlocked: 0 },
        },
      };

  const currentDate = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <div className="space-y-12 animate-in pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-app-border pb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-5 w-5 text-app-primary" />
            <span className="app-label !text-app-primary">
              Dashboard operativo
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-app-text-main tracking-tight leading-none max-w-3xl">
            Resumen Operativo
          </h2>
          <p className="mt-3 text-sm font-medium text-app-text-muted max-w-lg leading-relaxed">
            Vista ejecutiva para controlar vouchers, informes y conversion por
            canal.
          </p>
        </div>
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-black/25 border border-app-border backdrop-blur-xl">
          <Calendar className="h-4 w-4 text-app-text-muted opacity-40" />
          <span className="app-label !text-[10px] opacity-60 uppercase">
            {currentDate}
          </span>
        </div>
      </div>

      <OverviewHighlights
        availableVouchers={displayStats.availableVouchers}
        redeemedVouchers={displayStats.redeemedVouchers}
        periodLabel={displayStats.periodLabel}
        testsStartedPeriod={displayStats.testsStartedPeriod}
        testsCompletedPeriod={displayStats.testsCompletedPeriod}
        voucherRedemptionRatePeriod={displayStats.voucherRedemptionRatePeriod}
        channelBreakdown={displayStats.channelBreakdown}
      />

      <div className="grid grid-cols-1 gap-6 xl:gap-8">
        {isAdmin && adminStats ? (
          <div className="app-card min-w-0 !p-6 sm:!p-8 xl:!p-10 ring-1 ring-app-border/50">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 sm:mb-8 xl:mb-10 min-w-0">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-5 w-5 text-app-primary" />
                  <span className="text-xs sm:text-sm font-semibold uppercase tracking-[0.12em] text-app-text-muted truncate">
                    Actividad de Sesiones
                  </span>
                </div>
                <p className="mt-2 text-sm text-app-text-muted/80 leading-relaxed">
                  Evolucion diaria de sesiones iniciadas durante{" "}
                  {displayStats.periodLabel.toLowerCase()}.
                </p>
              </div>
            </div>
            <div className="h-[220px] sm:h-[260px] xl:h-[300px] min-w-0">
              <SessionsChart data={adminStats.sessionsActivity} />
            </div>
          </div>
        ) : (
          <div className="col-span-full app-card !p-12 bg-black/20 flex items-center justify-center border-dashed">
            <div className="text-center space-y-3 opacity-30">
              <Activity className="h-10 w-10 mx-auto" />
              <p className="app-label text-xs">
                Analitica operativa en preparacion
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-3 px-1">
          <span className="app-label opacity-60 tracking-[0.2em]">
            Centro de operación
          </span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            {isAdmin ? <AdminAlerts alerts={adminStats?.alerts ?? []} /> : null}
            <QuickActions isAdmin={isAdmin} />
            <div className="app-card !p-8 bg-black/20 border-app-border/40 text-center flex flex-col items-center justify-center gap-4 group hover:bg-app-primary/[0.04] transition-colors cursor-pointer">
              <div className="flex items-center gap-4 text-app-text-muted opacity-50 group-hover:opacity-100 group-hover:text-app-primary transition-all">
                <span className="app-label text-xs">
                  Acceder al registro de auditoria
                </span>
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 xl:col-span-4 h-full">
            <ActivityFeed events={adminStats?.activity ?? []} />
          </div>
        </div>
      </div>

      {isAdmin && adminStats ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-1">
            <span className="app-label opacity-60 tracking-[0.2em]">
              Insights secundarios
            </span>
          </div>
          <div className="app-card min-w-0 !p-6 sm:!p-8 ring-1 ring-app-border/50">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 sm:mb-8 min-w-0">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                  <span className="text-xs sm:text-sm font-semibold uppercase tracking-[0.12em] text-app-text-muted truncate">
                    Distribucion de Resultados
                  </span>
                </div>
                <p className="mt-2 text-sm text-app-text-muted/80 leading-relaxed">
                  Cantidad de informes por categoria predominante.
                </p>
              </div>
            </div>
            <div className="h-[220px] sm:h-[260px] min-w-0">
              <ResultsDistributionChart data={adminStats.resultsDistribution} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
