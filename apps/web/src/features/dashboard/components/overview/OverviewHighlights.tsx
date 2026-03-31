import { DashboardChannelBreakdown } from "@akit/contracts";
import { Activity, Target, TrendingUp } from "lucide-react";

interface Props {
  availableVouchers: number;
  redeemedVouchers: number;
  periodLabel: string;
  testsStartedPeriod: number;
  testsCompletedPeriod: number;
  voucherRedemptionRatePeriod: number;
  channelBreakdown: DashboardChannelBreakdown;
}

export function OverviewHighlights({
  availableVouchers,
  redeemedVouchers,
  periodLabel,
  testsStartedPeriod,
  testsCompletedPeriod,
  voucherRedemptionRatePeriod,
  channelBreakdown,
}: Props) {
  const totalVouchers = availableVouchers + redeemedVouchers;
  const consumptionPercentage =
    totalVouchers > 0
      ? Math.round((redeemedVouchers / totalVouchers) * 100)
      : 0;
  const completionRatePeriod =
    testsStartedPeriod > 0
      ? Math.round((testsCompletedPeriod / testsStartedPeriod) * 100)
      : 0;

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (consumptionPercentage / 100) * circumference;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 md:max-w-5xl md:mx-auto lg:max-w-none">
      <div className="lg:col-span-8 app-card !p-6 md:!p-8 lg:!p-10 bg-gradient-to-br from-app-surface to-app-bg/20 flex flex-col lg:flex-row items-center gap-8 lg:gap-12 group min-w-0">
        <div className="relative h-44 w-44 flex items-center justify-center shrink-0">
          <svg className="h-full w-full -rotate-90">
            <circle
              cx="88"
              cy="88"
              r={radius}
              className="stroke-app-border fill-none stroke-[10]"
            />
            <circle
              cx="88"
              cy="88"
              r={radius}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="stroke-app-primary fill-none stroke-[10] transition-all duration-1000 ease-out"
              style={{ strokeLinecap: "round" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-app-text-main tracking-tighter leading-none">
              {consumptionPercentage}%
            </span>
            <span className="app-label !text-[8px] opacity-40 mt-1">
              USO HISTORICO
            </span>
          </div>
          <div className="absolute -top-1 -right-1">
            <div className="h-3 w-3 bg-app-primary rounded-full animate-ping opacity-20" />
            <div className="absolute inset-0 h-3 w-3 bg-app-primary rounded-full border-2 border-app-surface" />
          </div>
        </div>

        <div className="flex-1 space-y-6 lg:space-y-8 min-w-0 w-full">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-2">
              <Target className="h-5 w-5 text-app-primary" />
              <h3 className="text-xl md:text-2xl font-black text-app-text-main tracking-tight leading-tight break-words">
                Operacion de Informes
              </h3>
            </div>
            <p className="text-sm font-medium text-app-text-muted/80 leading-relaxed break-words">
              Estado de vouchers e informes para toda la plataforma. Periodo
              activo: {periodLabel}.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
            <div className="flex flex-col gap-2 min-w-0">
              <span
                className="text-[10px] md:text-[11px] font-semibold text-app-text-muted/70 uppercase tracking-[0.06em] leading-[1.25] whitespace-normal break-words"
                title="Vouchers en estado AVAILABLE actualmente"
              >
                VOUCHERS DISPONIBLES
              </span>
              <span className="text-3xl font-black text-app-text-main tracking-tighter">
                {availableVouchers}
              </span>
            </div>
            <div className="flex flex-col gap-2 min-w-0">
              <span
                className="text-[10px] md:text-[11px] font-semibold text-app-text-muted/70 uppercase tracking-[0.06em] leading-[1.25] whitespace-normal break-words"
                title="Vouchers en estado USED acumulados"
              >
                VOUCHERS CANJEADOS
              </span>
              <span className="text-3xl font-black text-app-text-main tracking-tighter">
                {redeemedVouchers}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 min-w-0 max-w-2xl">
            <div className="rounded-2xl border border-app-border/70 bg-black/20 px-4 py-3">
              <p
                className="app-label opacity-50 break-words"
                title="Vouchers usados en el periodo / vouchers emitidos en el periodo"
              >
                TASA DE CANJE ({periodLabel})
              </p>
              <p className="mt-1 text-xl font-black text-app-text-main">
                {voucherRedemptionRatePeriod}%
              </p>
            </div>
            <div className="rounded-2xl border border-app-border/70 bg-black/20 px-4 py-3">
              <p
                className="app-label opacity-50 break-words"
                title="Tests completados en el periodo / tests iniciados en el periodo"
              >
                TASA DE FINALIZACION ({periodLabel})
              </p>
              <p className="mt-1 text-xl font-black text-app-text-main">
                {completionRatePeriod}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-4 app-card !p-6 md:!p-7 lg:!p-8 border-2 border-app-primary/10 bg-app-surface flex flex-col justify-between group overflow-hidden min-w-0">
        <div className="space-y-6">
          <div className="flex items-center gap-4 min-w-0">
            <div className="p-3 bg-app-primary/5 rounded-xl border border-app-primary/20">
              <Activity className="h-6 w-6 text-app-primary" />
            </div>
            <div className="min-w-0">
              <span className="app-label opacity-40 break-words">
                {periodLabel}
              </span>
              <h4 className="text-xs font-black text-app-text-main uppercase tracking-wide mt-0.5 break-words leading-tight">
                Tests Iniciados y Completados
              </h4>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-app-border/70 bg-black/20 px-4 py-3 min-w-0">
              <p className="text-[10px] md:text-[11px] font-semibold text-app-text-muted/70 uppercase tracking-[0.06em] leading-tight whitespace-normal break-words">
                Iniciados
              </p>
              <p className="mt-1 text-3xl font-black tracking-tight text-app-text-main">
                {testsStartedPeriod}
              </p>
            </div>
            <div className="rounded-2xl border border-app-border/70 bg-black/20 px-4 py-3 min-w-0">
              <p className="text-[10px] md:text-[11px] font-semibold text-app-text-muted/70 uppercase tracking-[0.06em] leading-tight whitespace-normal break-words">
                Completados
              </p>
              <p className="mt-1 text-3xl font-black tracking-tight text-app-text-main">
                {testsCompletedPeriod}
              </p>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-app-border">
          <div className="space-y-3">
            <div>
              <span className="app-label opacity-40 break-words">
                Canal voucher
              </span>
              <p className="text-sm font-semibold text-app-text-main mt-1 break-words">
                {channelBreakdown.voucher.completed}/
                {channelBreakdown.voucher.started} completados ·{" "}
                {channelBreakdown.voucher.reportsUnlocked} informes
              </p>
            </div>
            <div>
              <span className="app-label opacity-40">
                Canal pago individual
              </span>
              <p className="text-sm font-semibold text-app-text-main mt-1 break-words">
                {channelBreakdown.individual.completed}/
                {channelBreakdown.individual.started} completados ·{" "}
                {channelBreakdown.individual.reportsUnlocked} informes
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 text-app-primary">
              <TrendingUp className="h-4 w-4" />
              <span className="app-label !text-[9px] opacity-80">
                conversion por canal
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
