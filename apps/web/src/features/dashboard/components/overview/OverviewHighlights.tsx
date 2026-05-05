import { DashboardChannelBreakdown } from "@akit/contracts";
import { ArrowRight, Target, TrendingUp } from "lucide-react";
import { StatCard } from "../../../../components/molecules/StatCard";

interface Props {
  periodLabel: string;
  vouchersGeneratedPeriod: number;
  vouchersRedeemedPeriod: number;
  testsCompletedPeriod: number;
  voucherRedemptionRatePeriod: number;
  reportsUnlockedPeriod: number;
  channelBreakdown: DashboardChannelBreakdown;
}

// Micro-componente local para no repetir el mismo HTML 8 veces
const MiniStat = ({ label, value }: { label: string; value: string | number }) => (
  <div>
    <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-app-text-muted/70">
      {label}
    </p>
    <p className="mt-1 text-xl font-black text-app-text-main">{value}</p>
  </div>
);

export function OverviewHighlights({
  periodLabel,
  vouchersGeneratedPeriod,
  vouchersRedeemedPeriod,
  testsCompletedPeriod,
  voucherRedemptionRatePeriod,
  reportsUnlockedPeriod,
  channelBreakdown,
}: Props) {
  
  const voucherCompletionRate = channelBreakdown.voucher.started > 0
    ? Math.round((channelBreakdown.voucher.completed / channelBreakdown.voucher.started) * 100)
    : 0;
    
  const directCompletionRate = channelBreakdown.individual.started > 0
    ? Math.round((channelBreakdown.individual.completed / channelBreakdown.individual.started) * 100)
    : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 md:max-w-5xl md:mx-auto lg:max-w-none">
      
      {/* ─── Columna Izquierda: Flujo Operativo ─── */}
      <div className="lg:col-span-8 app-card !p-6 md:!p-8 lg:!p-10 bg-gradient-to-br from-app-surface to-app-bg/20 min-w-0">
        <div className="space-y-6 lg:space-y-8 min-w-0 w-full">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-2">
              <Target className="h-5 w-5 text-app-primary" />
              <h3 className="text-xl md:text-2xl font-black text-app-text-main tracking-tight leading-tight break-words">
                Flujo operativo
              </h3>
            </div>
            <p className="text-sm font-medium text-app-text-muted/80 leading-relaxed break-words">
              Seguimiento del flujo desde la generación del voucher hasta la
              disponibilidad del informe. Periodo activo: {periodLabel}.
            </p>
          </div>

          <div className="rounded-3xl border border-app-primary/15 bg-app-surface/75 p-5 sm:p-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="app-label opacity-50">KPI DEL PERIODO</p>
                  <p className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-app-text-main">
                    {voucherRedemptionRatePeriod}%
                  </p>
                </div>
                <div className="rounded-2xl border border-app-primary/20 bg-app-primary/5 px-4 py-3 text-right">
                  <p className="app-label opacity-50">TASA DE CANJE</p>
                  <p className="mt-1 text-sm font-semibold text-app-text-muted">
                    canjeados / generados
                  </p>
                </div>
              </div>

              {/* Cinta de progresión */}
              <div className="flex flex-wrap items-center gap-3 text-app-text-main">
                <span className="rounded-2xl border border-app-border/70 bg-app-surface/60 px-4 py-3 text-sm font-semibold">
                  {vouchersGeneratedPeriod} generados
                </span>
                <ArrowRight className="h-4 w-4 text-app-text-muted/50" />
                <span className="rounded-2xl border border-app-border/70 bg-app-surface/60 px-4 py-3 text-sm font-semibold">
                  {vouchersRedeemedPeriod} canjeados
                </span>
                <ArrowRight className="h-4 w-4 text-app-text-muted/50" />
                <span className="rounded-2xl border border-app-border/70 bg-app-surface/60 px-4 py-3 text-sm font-semibold">
                  {testsCompletedPeriod} tests
                </span>
                <ArrowRight className="h-4 w-4 text-app-text-muted/50" />
                <span className="rounded-2xl border border-app-border/70 bg-app-surface/60 px-4 py-3 text-sm font-semibold">
                  {reportsUnlockedPeriod} informes
                </span>
              </div>
            </div>
          </div>

          {/* Reemplazamos el map por nuestras StatCards reutilizables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
            <StatCard 
              label="Vouchers generados" 
              value={vouchersGeneratedPeriod} 
              description="Vouchers creados para instituciones o terapeutas."
              className="rounded-2xl border border-app-border/70 bg-app-surface/70 px-4 py-4"
            />
            <StatCard 
              label="Vouchers canjeados" 
              value={vouchersRedeemedPeriod} 
              description="Vouchers utilizados por pacientes durante el periodo."
              className="rounded-2xl border border-app-border/70 bg-app-surface/70 px-4 py-4"
            />
            <StatCard 
              label="Tests completados" 
              value={testsCompletedPeriod} 
              description="Evaluaciones finalizadas con resultados disponibles."
              className="rounded-2xl border border-app-border/70 bg-app-surface/70 px-4 py-4"
            />
            <StatCard 
              label="Informes desbloqueados" 
              value={reportsUnlockedPeriod} 
              description="Informes listos para consulta o entrega."
              className="rounded-2xl border border-app-border/70 bg-app-surface/70 px-4 py-4"
            />
          </div>
        </div>
      </div>

      {/* ─── Columna Derecha: Rendimiento por Canal ─── */}
      <div className="lg:col-span-4 app-card !p-6 md:!p-7 lg:!p-8 border-2 border-app-primary/10 bg-app-surface flex flex-col justify-between group overflow-hidden min-w-0">
        <div className="space-y-6">
          <div className="flex items-center gap-4 min-w-0">
            <div className="p-3 bg-app-primary/5 rounded-xl border border-app-primary/20">
              <TrendingUp className="h-6 w-6 text-app-primary" />
            </div>
            <div className="min-w-0">
              <span className="app-label opacity-40 break-words">{periodLabel}</span>
              <h4 className="text-xs font-black text-app-text-main uppercase tracking-wide mt-0.5 break-words leading-tight">
                Rendimiento por canal
              </h4>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-app-border mt-6">
          <div className="space-y-4">
            
            {/* Canal con voucher */}
            <div className="rounded-2xl border border-app-border/70 bg-app-surface/70 px-4 py-4">
              <span className="app-label opacity-40 break-words">Canal con voucher</span>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <MiniStat label="Iniciados" value={channelBreakdown.voucher.started} />
                <MiniStat label="Completados" value={channelBreakdown.voucher.completed} />
                <MiniStat label="Informes" value={channelBreakdown.voucher.reportsUnlocked} />
                <MiniStat label="Finalización" value={`${voucherCompletionRate}%`} />
              </div>
            </div>

            {/* Canal sin voucher */}
            <div className="rounded-2xl border border-app-border/70 bg-app-surface/70 px-4 py-4">
              <span className="app-label opacity-40 break-words">Canal sin voucher</span>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <MiniStat label="Iniciados" value={channelBreakdown.individual.started} />
                <MiniStat label="Completados" value={channelBreakdown.individual.completed} />
                <MiniStat label="Informes" value={channelBreakdown.individual.reportsUnlocked} />
                <MiniStat label="Finalización" value={`${directCompletionRate}%`} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 text-app-primary mt-4">
              <TrendingUp className="h-4 w-4" />
              <span className="app-label !text-[9px] opacity-80">
                comparativa de rendimiento por canal
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}