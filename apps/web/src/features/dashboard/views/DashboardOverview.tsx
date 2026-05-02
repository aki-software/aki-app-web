import { DashboardStatsResponse } from "@akit/contracts";
import { Activity, BarChart3, Calendar, Sparkles, TrendingUp } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../../auth/hooks/useAuth";
import { fetchDashboardStats } from "../api/dashboard";
import { getFormattedCurrentDate } from "../../../utils/date";
import { DEFAULT_DASHBOARD_STATS, DASHBOARD_UI_TEXTS } from "../constants/dashboard.constants";
import { Spinner } from "../../../components/atoms/Spinner";
import { StatCard } from "../../../components/molecules/StatCard";
import { DashboardWidget } from "../../../components/molecules/DashboardWidget";
import { ActivityFeed } from "../components/overview/ActivityFeed";
import { AdminAlerts } from "../components/overview/AdminAlerts";
import { OverviewHighlights } from "../components/overview/OverviewHighlights";
import { QuickActions } from "../components/overview/QuickActions";
import { ResultsDistributionChart } from "../components/ResultsDistributionChart";
import { SessionsChart } from "../components/SessionsChart";
import { InstitutionDashboardOverview } from "./InstitutionDashboardOverview";

function AdminDashboardOverview({ isAdmin }: { isAdmin: boolean }) {
  const [adminStats, setAdminStats] = useState<DashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await fetchDashboardStats();
        setAdminStats(data);
      } catch (error) {
        console.error("Error loading stats:", error);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  const sessionsSummary = useMemo(() => {
    if (!adminStats || adminStats.sessionsActivity.length === 0) return null;

    const totalStarted = adminStats.sessionsActivity.reduce((acc, item) => acc + item.count, 0);
    const daysCount = adminStats.sessionsActivity.length;
    const DECIMALS = 1;
    const factor = Math.pow(10, DECIMALS);
    const dailyAverage = Math.round((totalStarted / daysCount) * factor) / factor;
    
    const peakDay = adminStats.sessionsActivity.reduce((best, item) => {
      return item.count > best.count ? item : best;
    }, adminStats.sessionsActivity[0]);

    return { totalStarted, dailyAverage, peakDay };
  }, [adminStats]);

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
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-app-surface/80 border border-app-border backdrop-blur-xl">
          <Calendar className="h-4 w-4 text-app-text-muted opacity-40" />
          <span className="app-label !text-[10px] opacity-60 uppercase">
            {getFormattedCurrentDate()}
          </span>
        </div>
      </div>

      <OverviewHighlights {...displayStats} />
      <div className="grid grid-cols-1 gap-6 xl:gap-8">
        {isAdmin && adminStats ? (
          <DashboardWidget
            title={uiTexts.widgets.sessions.title}
            description={`${uiTexts.widgets.sessions.description} ${displayStats.periodLabel.toLowerCase()}.`}
            icon={BarChart3}
          >
            {sessionsSummary && (
              <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
                <StatCard label="Total del periodo" value={sessionsSummary.totalStarted} />
                <StatCard label="Promedio diario" value={sessionsSummary.dailyAverage} />
                <StatCard 
                  label="Mejor día" 
                  value={sessionsSummary.peakDay.date} 
                  subtext={`${sessionsSummary.peakDay.count} iniciadas`} 
                />
              </div>
            )}
            <div className="h-[220px] sm:h-[260px] xl:h-[300px]">
              <SessionsChart data={adminStats.sessionsActivity} />
            </div>
          </DashboardWidget>
        ) : (
          <div className="col-span-full app-card !p-12 bg-app-surface/70 flex items-center justify-center border-dashed">
            <div className="text-center space-y-3 opacity-30">
              <Activity className="h-10 w-10 mx-auto" />
              <p className="app-label text-xs">Analítica operativa en preparación</p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-3 px-1">
          <span className="app-label opacity-60 tracking-[0.2em]">Centro de operación</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            {isAdmin && <AdminAlerts alerts={adminStats?.alerts ?? []} />}
            <QuickActions isAdmin={isAdmin} />
          </div>
          <div className="lg:col-span-5 xl:col-span-4 h-full">
            <ActivityFeed events={adminStats?.activity ?? []} />
          </div>
        </div>
      </div>

      {isAdmin && adminStats && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-1">
            <span className="app-label opacity-60 tracking-[0.2em]">Insights secundarios</span>
          </div>
          <DashboardWidget
            title={uiTexts.widgets.results.title}
            description={uiTexts.widgets.results.description}
            icon={TrendingUp}
            iconColorClass="text-emerald-500"
          >
            <div className="h-[220px] sm:h-[260px]">
              <ResultsDistributionChart data={adminStats.resultsDistribution} />
            </div>
          </DashboardWidget>
        </div>
      )}
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