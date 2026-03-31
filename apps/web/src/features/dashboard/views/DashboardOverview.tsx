import { useEffect, useState } from "react";
import { Sparkles, Calendar, TrendingUp, BarChart3, Activity } from "lucide-react";
import { 
  fetchDashboardStats, 
  fetchInstitutionStats, 
  type InstitutionStats 
} from "../api/dashboard";
import { DashboardStatsResponse } from "@akit/contracts";
import { useAuth } from "../../auth/hooks/useAuth";
import { OverviewHighlights } from "../components/overview/OverviewHighlights";
import { ActivityFeed } from "../components/overview/ActivityFeed";
import { QuickActions } from "../components/overview/QuickActions";
import { SessionsChart } from "../components/SessionsChart";
import { ResultsDistributionChart } from "../components/ResultsDistributionChart";

export function DashboardOverview() {
  const { user } = useAuth();
  const isAdmin = user?.role?.toUpperCase() === "ADMIN";
  const isInstitution = !!user?.institutionId && !isAdmin;

  const [adminStats, setAdminStats] = useState<DashboardStatsResponse | null>(null);
  const [institutionStats, setInstitutionStats] = useState<InstitutionStats | null>(null);
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
        <span className="app-label !text-xs tracking-[0.4em] animate-pulse">Sincronizando Consola Maestro</span>
      </div>
    );
  }

  const displayStats = isInstitution ? {
    totalSessions: institutionStats?.totalSessions || 0,
    availableVouchers: institutionStats?.availableVouchers || 0,
    redeemedVouchers: institutionStats?.redeemedVouchers || 0,
    completionRate: 0 
  } : {
    totalSessions: adminStats?.totalSessions || 0,
    availableVouchers: 0,
    redeemedVouchers: 0,
    completionRate: adminStats?.completionRate || 0
  };

  const currentDate = new Intl.DateTimeFormat("es-AR", { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  }).format(new Date());

  return (
    <div className="space-y-12 animate-in pb-20">
      {/* ─── CABECERA DE ALTA GAMA ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-app-border pb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-5 w-5 text-app-primary" />
            <span className="app-label !text-app-primary">DASHBOARD INTELIGENTE DE RED</span>
          </div>
          <h2 className="text-4xl font-black text-app-text-main tracking-tighter font-sans leading-none">
             Resumen Operativo
          </h2>
          <p className="mt-3 text-sm font-medium text-app-text-muted/80 max-w-lg leading-relaxed">
            Consola centralizada para el monitoreo de créditos y rendimiento de sesiones.
          </p>
        </div>
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-app-bg border border-app-border shadow-sm">
            <Calendar className="h-4 w-4 text-app-text-muted opacity-40" />
            <span className="app-label !text-[10px] opacity-60 uppercase">{currentDate}</span>
        </div>
      </div>

      {/* ─── CAPA 1: MÉTRICAS DE IMPACTO (GAUGE) ──────────────────── */}
      <OverviewHighlights 
        totalSessions={displayStats.totalSessions}
        availableVouchers={displayStats.availableVouchers}
        redeemedVouchers={displayStats.redeemedVouchers}
        completionRate={displayStats.completionRate}
      />

      {/* ─── CAPA 2: TENDENCIAS VISUALES (GRÁFICOS) ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {isAdmin && adminStats ? (
          <>
            <div className="app-card !p-10 shadow-2xl bg-app-surface ring-1 ring-app-border/50">
               <div className="flex items-center gap-3 mb-10">
                  <BarChart3 className="h-5 w-5 text-app-primary" />
                  <span className="app-label opacity-60">Actividad de Sesiones</span>
               </div>
               <div className="h-[300px]">
                  <SessionsChart data={adminStats.sessionsActivity} />
               </div>
            </div>
            <div className="app-card !p-10 shadow-2xl bg-app-surface ring-1 ring-app-border/50">
               <div className="flex items-center gap-3 mb-10">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                  <span className="app-label opacity-60">Distribución de Resultados</span>
               </div>
               <div className="h-[300px]">
                  <ResultsDistributionChart data={adminStats.resultsDistribution} />
               </div>
            </div>
          </>
        ) : (
          <div className="col-span-full app-card !p-12 bg-app-bg/10 flex items-center justify-center border-dashed">
              <div className="text-center space-y-3 opacity-30">
                  <Activity className="h-10 w-10 mx-auto" />
                  <p className="app-label text-xs">Módulos analíticos en tiempo real</p>
              </div>
          </div>
        )}
      </div>

      {/* ─── CAPA 3: OPERACIÓN Y ACTIVIDAD ────────────────────── */}
      <div className="space-y-6">
          <div className="flex items-center gap-3 px-1">
              <span className="app-label opacity-40 tracking-[0.3em]">Centro de Operación</span>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            <div className="xl:col-span-8 space-y-6">
                <QuickActions isAdmin={isAdmin} />
                <div className="app-card !p-8 bg-app-bg/30 border-app-border/40 text-center flex flex-col items-center justify-center gap-4 group hover:bg-app-primary/[0.02] transition-colors cursor-pointer">
                    <div className="flex items-center gap-4 text-app-text-muted opacity-40 group-hover:opacity-100 group-hover:text-app-primary transition-all">
                        <span className="app-label text-xs">Acceder a logs de Auditoría Avanzada</span>
                        <TrendingUp className="h-4 w-4" />
                    </div>
                </div>
            </div>

            <div className="xl:col-span-4 h-full">
                <ActivityFeed />
            </div>
          </div>
      </div>
    </div>
  );
}
