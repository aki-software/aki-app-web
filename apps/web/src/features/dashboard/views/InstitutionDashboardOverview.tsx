import { Ticket, Users2, ArrowRight, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { Spinner } from "../../../components/atoms/Spinner";
import { Button } from "../../../components/atoms/Button";
import { useInstitutionOverviewManager, LOW_STOCK_ALERT_THRESHOLD } from "../hooks/useInstitutionOverviewManager";
import { LowStockAlert } from "../components/institucion/LowStockAlert";
import { TopSessionsTable } from "../components/institucion/TopSessionsTable";
import { StatCard } from "../../../components/molecules/StatCard";


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

        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-app-surface/80 border border-app-border backdrop-blur-xl">
          <Users2 className="h-4 w-4 text-app-text-muted opacity-40" />
          <span className="app-label !text-[10px] opacity-60 uppercase">
            {user?.name ?? "Institución"}
          </span>
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
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="app-label opacity-60 tracking-[0.2em]">Vouchers</p>
            <h3 className="mt-2 text-xl font-black tracking-tight text-app-text-main">
              Stock y métricas (últimos {periodDays} días)
            </h3>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard/vouchers")}>
            Ir a vouchers <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* Usando nuestra molécula StatCard */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard 
            label="Disponibles" 
            value={voucherStats?.available ?? 0} 
            description={`De ${voucherStats?.total ?? 0} recibidos.`} 
            valueColor="text-emerald-200" 
          />
          <StatCard 
            label="Consumidos" 
            value={voucherStats?.used ?? 0} 
            description="Histórico." 
            valueColor="text-rose-200" 
          />
          <StatCard 
            label="Recibidos (período)" 
            value={voucherStats?.vouchersGeneratedPeriod ?? 0} 
            description={`Últimos ${periodDays} días.`} 
          />
          <StatCard 
            label="Consumidos (período)" 
            value={voucherStats?.vouchersRedeemedPeriod ?? 0} 
            description={`Tasa de consumo: ${voucherStats?.voucherRedemptionRatePeriod ?? 0}%.`} 
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard 
            label="Vencen en 7 días" 
            value={voucherStats?.vouchersExpiringSoon7d ?? 0}
            icon={<Clock className="h-4 w-4 text-app-text-muted/40" />}
          />
          <StatCard 
            label="Sin asignar" 
            value={voucherStats?.vouchersUnassignedAvailable ?? 0} 
            description="Vouchers disponibles sin paciente." 
          />
          <StatCard 
            label="Vencidos" 
            value={voucherStats?.expired ?? 0} 
            description="Histórico." 
          />
        </div>
      </section>

      {/* SECCIÓN TESTS */}
      <section className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="app-label opacity-60 tracking-[0.2em]">Tests</p>
            <h3 className="mt-2 text-xl font-black tracking-tight text-app-text-main">Recientes (top 10)</h3>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard/results")}>
            Ver todos <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard 
            label="Iniciados" 
            value={testsStats?.testsStartedPeriod ?? 0} 
            description={`Últimos ${periodDays} días.`} 
          />
          <StatCard 
            label="Completados" 
            value={testsStats?.testsCompletedPeriod ?? 0} 
          />
          <StatCard 
            label="Informes desbloqueados" 
            value={testsStats?.reportsUnlockedPeriod ?? 0} 
          />
        </div>
        <TopSessionsTable sessions={overview?.topSessions ?? []} />
      </section>
    </div>
  );
};