import { Ticket, Users2, ArrowRight, Clock, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { Spinner } from "../../../components/atoms/Spinner";
import { useInstitutionOverviewManager, LOW_STOCK_ALERT_THRESHOLD } from "../hooks/useInstitutionOverviewManager";
import { LowStockAlert } from "../components/institucion/LowStockAlert";
import { TopSessionsTable } from "../components/institucion/TopSessionsTable";
import { StatCard } from "../../../components/molecules/StatCard";
import { DashboardWidget } from "../../../components/molecules/DashboardWidget";
import { ResultsDistributionChart } from "../components/ResultsDistributionChart";

export function InstitutionDashboardOverview() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const {
    loading,
    overview,
    voucherStats,
    testsStats,
    showLowStockAlert,
    handleDismissAlert,
    periodDays,
    setPeriodDays,
  } = useInstitutionOverviewManager(user?.institutionId);

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

  return (
    <div className="space-y-12 animate-in pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-app-border pb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Ticket className="h-5 w-5 text-app-primary" />
            <span className="app-label !text-app-primary">Dashboard de institución</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-app-text-main tracking-tight leading-none max-w-3xl">
            Operación y consumo
          </h2>
          <p className="mt-3 text-sm font-medium text-app-text-muted max-w-2xl leading-relaxed">
            Seguimiento de vouchers, alertas y tests recientes.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <select 
            value={periodDays} 
            onChange={(e) => setPeriodDays(Number(e.target.value))}
            className="px-4 py-3 rounded-2xl bg-app-surface border border-app-border text-xs font-bold text-app-text-main focus:outline-none focus:ring-2 focus:ring-app-primary/20 uppercase tracking-wider"
          >
            <option style={{ backgroundColor: 'var(--color-app-bg)', color: 'var(--color-app-text-main)' }} value={7}>Últimos 7 días</option>
            <option style={{ backgroundColor: 'var(--color-app-bg)', color: 'var(--color-app-text-main)' }} value={15}>Últimos 15 días</option>
            <option style={{ backgroundColor: 'var(--color-app-bg)', color: 'var(--color-app-text-main)' }} value={30}>Últimos 30 días</option>
            <option style={{ backgroundColor: 'var(--color-app-bg)', color: 'var(--color-app-text-main)' }} value={90}>Últimos 90 días</option>
            <option style={{ backgroundColor: 'var(--color-app-bg)', color: 'var(--color-app-text-main)' }} value={365}>Último año</option>
          </select>
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-app-surface/80 border border-app-border backdrop-blur-xl">
            <Users2 className="h-4 w-4 text-app-text-muted opacity-40" />
            <span className="app-label !text-[10px] opacity-60 uppercase">
              {user?.name ?? "Institución"}
            </span>
          </div>
        </div>
      </div>

      {/* ALERTA DE STOCK (Componente extraído) */}
      {showLowStockAlert && (
        <LowStockAlert 
          available={voucherStats?.available ?? 0}
          threshold={LOW_STOCK_ALERT_THRESHOLD}
          onDismiss={handleDismissAlert}
          onNavigate={() => navigate("/dashboard/vouchers")}
        />
      )}

      {/* SECCIÓN VOUCHERS */}
      <section className="space-y-6">
        <div className="flex items-center justify-between gap-4 mb-2">
          <h3 className="text-xl font-black tracking-tight text-app-text-main flex items-center gap-2">
            Resumen de vouchers
          </h3>
          <button 
            onClick={() => navigate("/dashboard/vouchers")}
            className="text-sm font-bold text-app-primary hover:text-app-primary-hover flex items-center gap-1 transition-colors"
          >
            <span className="hidden sm:inline">Ver inventario completo</span>
            <span className="sm:hidden">Ver todos</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Usando nuestra molécula StatCard */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard 
            label="Disponibles" 
            value={voucherStats?.available ?? 0} 
            description={`De ${voucherStats?.total ?? 0} históricos.`} 
            valueColor="text-emerald-600 dark:text-emerald-400" 
          />
          <StatCard 
            label="Consumidos (período)" 
            value={voucherStats?.vouchersRedeemedPeriod ?? 0} 
            description={`Tasa de uso: ${voucherStats?.voucherRedemptionRatePeriod ?? 0}%.`} 
            valueColor="text-rose-600 dark:text-rose-400" 
          />
          <StatCard 
            label="Sin asignar" 
            value={voucherStats?.vouchersUnassignedAvailable ?? 0} 
            description="Stock listo para enviar." 
          />
          <StatCard 
            label="Vencen pronto" 
            value={voucherStats?.vouchersExpiringSoon7d ?? 0}
            description="En los próximos 7 días."
            icon={<Clock className="h-4 w-4 text-app-text-muted/40" />}
          />
        </div>
      </section>

      {/* SECCIÓN TESTS */}
      <section className="space-y-6">
        <div className="flex items-center justify-between gap-4 mb-2">
          <h3 className="text-xl font-black tracking-tight text-app-text-main flex items-center gap-2">
            Sesiones y reportes
          </h3>
          <button 
            onClick={() => navigate("/dashboard/results")}
            className="text-sm font-bold text-app-primary hover:text-app-primary-hover flex items-center gap-1 transition-colors"
          >
            <span className="hidden sm:inline">Historial de tests</span>
            <span className="sm:hidden">Ver tests</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard 
            label="Iniciados" 
            value={testsStats?.testsStartedPeriod ?? 0} 
            description={`Alumnos que comenzaron el test.`} 
          />
          <StatCard 
            label="Completados" 
            value={testsStats?.testsCompletedPeriod ?? 0} 
            description={`Tasa de finalización: ${
              testsStats?.testsStartedPeriod 
                ? Math.round((testsStats.testsCompletedPeriod / testsStats.testsStartedPeriod) * 100) 
                : 0
            }%.`}
          />
          <StatCard 
            label="Informes vistos" 
            value={testsStats?.reportsUnlockedPeriod ?? 0} 
            description="Alumnos que vieron sus resultados."
          />
        </div>
        
        <div className="mt-8">
          <div className="flex items-center justify-between gap-4 mb-2">
            <h3 className="text-xl font-black tracking-tight text-app-text-main">
              Tests recientes
            </h3>
          </div>
          <TopSessionsTable sessions={overview?.topSessions ?? []} />
        </div>
        
        {overview?.resultsDistribution && overview.resultsDistribution.length > 0 && (
          <DashboardWidget
            title="Resultados predominantes"
            description="Cantidad de tests completados según la categoría con mayor afinidad en tu institución."
            icon={TrendingUp}
            iconColorClass="text-emerald-500"
          >
            <div className="h-[220px] sm:h-[260px]">
              <ResultsDistributionChart data={overview.resultsDistribution} />
            </div>
          </DashboardWidget>
        )}
      </section>
    </div>
  );
};