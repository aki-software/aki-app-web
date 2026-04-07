import { DashboardChannelBreakdown } from "@akit/contracts";
import { ArrowRight, Target, TrendingUp } from "lucide-react";

interface Props {
  periodLabel: string;
  vouchersGeneratedPeriod: number;
  vouchersRedeemedPeriod: number;
  testsCompletedPeriod: number;
  voucherRedemptionRatePeriod: number;
  reportsUnlockedPeriod: number;
  channelBreakdown: DashboardChannelBreakdown;
}

export function OverviewHighlights({
  periodLabel,
  vouchersGeneratedPeriod,
  vouchersRedeemedPeriod,
  testsCompletedPeriod,
  voucherRedemptionRatePeriod,
  reportsUnlockedPeriod,
  channelBreakdown,
}: Props) {
  const voucherCompletionRate =
    channelBreakdown.voucher.started > 0
      ? Math.round(
          (channelBreakdown.voucher.completed /
            channelBreakdown.voucher.started) *
            100,
        )
      : 0;
  const directCompletionRate =
    channelBreakdown.individual.started > 0
      ? Math.round(
          (channelBreakdown.individual.completed /
            channelBreakdown.individual.started) *
            100,
        )
      : 0;

  const flowItems = [
    {
      label: "Vouchers generados",
      value: vouchersGeneratedPeriod,
      helper: "Vouchers creados para instituciones o terapeutas.",
    },
    {
      label: "Vouchers canjeados",
      value: vouchersRedeemedPeriod,
      helper: "Vouchers utilizados por pacientes durante el periodo.",
    },
    {
      label: "Tests completados",
      value: testsCompletedPeriod,
      helper: "Evaluaciones finalizadas con resultados disponibles.",
    },
    {
      label: "Informes desbloqueados",
      value: reportsUnlockedPeriod,
      helper: "Informes listos para consulta o entrega.",
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 md:max-w-5xl md:mx-auto lg:max-w-none">
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
              Seguimiento del flujo desde la generacion del voucher hasta la
              disponibilidad del informe. Periodo activo: {periodLabel}.
            </p>
          </div>

          <div className="rounded-3xl border border-app-primary/15 bg-black/20 p-5 sm:p-6">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
            {flowItems.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-app-border/70 bg-black/20 px-4 py-4"
              >
                <p className="text-[10px] md:text-[11px] font-semibold text-app-text-muted/70 uppercase tracking-[0.06em] leading-[1.25] break-words">
                  {item.label}
                </p>
                <p className="mt-2 text-3xl font-black tracking-tight text-app-text-main">
                  {item.value}
                </p>
                <p className="mt-2 text-xs text-app-text-muted/80 leading-relaxed">
                  {item.helper}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-4 app-card !p-6 md:!p-7 lg:!p-8 border-2 border-app-primary/10 bg-app-surface flex flex-col justify-between group overflow-hidden min-w-0">
        <div className="space-y-6">
          <div className="flex items-center gap-4 min-w-0">
            <div className="p-3 bg-app-primary/5 rounded-xl border border-app-primary/20">
              <TrendingUp className="h-6 w-6 text-app-primary" />
            </div>
            <div className="min-w-0">
              <span className="app-label opacity-40 break-words">
                {periodLabel}
              </span>
              <h4 className="text-xs font-black text-app-text-main uppercase tracking-wide mt-0.5 break-words leading-tight">
                Rendimiento por canal
              </h4>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-app-border">
          <div className="space-y-4">
            <div className="rounded-2xl border border-app-border/70 bg-black/20 px-4 py-4">
              <span className="app-label opacity-40 break-words">
                Canal con voucher
              </span>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-app-text-muted/70">
                    Iniciados
                  </p>
                  <p className="mt-1 text-xl font-black text-app-text-main">
                    {channelBreakdown.voucher.started}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-app-text-muted/70">
                    Completados
                  </p>
                  <p className="mt-1 text-xl font-black text-app-text-main">
                    {channelBreakdown.voucher.completed}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-app-text-muted/70">
                    Informes
                  </p>
                  <p className="mt-1 text-xl font-black text-app-text-main">
                    {channelBreakdown.voucher.reportsUnlocked}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-app-text-muted/70">
                    Finalizacion
                  </p>
                  <p className="mt-1 text-xl font-black text-app-text-main">
                    {voucherCompletionRate}%
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-app-border/70 bg-black/20 px-4 py-4">
              <span className="app-label opacity-40">Canal sin voucher</span>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-app-text-muted/70">
                    Iniciados
                  </p>
                  <p className="mt-1 text-xl font-black text-app-text-main">
                    {channelBreakdown.individual.started}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-app-text-muted/70">
                    Completados
                  </p>
                  <p className="mt-1 text-xl font-black text-app-text-main">
                    {channelBreakdown.individual.completed}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-app-text-muted/70">
                    Informes
                  </p>
                  <p className="mt-1 text-xl font-black text-app-text-main">
                    {channelBreakdown.individual.reportsUnlocked}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-app-text-muted/70">
                    Finalizacion
                  </p>
                  <p className="mt-1 text-xl font-black text-app-text-main">
                    {directCompletionRate}%
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 text-app-primary">
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
