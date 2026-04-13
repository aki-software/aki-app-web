import {
    AlertTriangle,
    Layers3,
    Plus,
    Ticket,
    TrendingUp,
} from "lucide-react";

interface Props {
  isAdmin?: boolean;
  showCreateForm: boolean;
  onToggleForm: () => void;
  batchesEmittedInPeriod: number;
  vouchersEmittedInPeriod: number;
  vouchersRedeemedInPeriod: number;
  expiringSoonCount: number;
  redemptionRate: number;
  periodDays: number;
  usesHistoricalFallback?: boolean;
}

export function VoucherStatsCards({
  isAdmin,
  showCreateForm,
  onToggleForm,
  batchesEmittedInPeriod,
  vouchersEmittedInPeriod,
  vouchersRedeemedInPeriod,
  expiringSoonCount,
  redemptionRate,
  periodDays,
  usesHistoricalFallback = false,
}: Props) {
  const conversionTone =
    redemptionRate >= 40
      ? "text-emerald-500"
      : redemptionRate >= 20
        ? "text-amber-400"
        : "text-rose-400";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">
      <div className="app-card !p-7 shadow-lg border-app-border bg-gradient-to-br from-app-surface to-app-bg/30 group relative overflow-hidden">
        <div className="absolute -right-3 -bottom-3 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all duration-700">
          <Layers3 className="h-20 w-20 text-app-text-muted" />
        </div>
        <div className="flex flex-col gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-app-bg rounded-xl border border-app-border shadow-sm">
              <Layers3 className="h-5 w-5 text-app-text-muted" />
            </div>
            <span className="app-label opacity-60 tracking-wider">
              {usesHistoricalFallback
                ? isAdmin
                  ? "Lotes emitidos"
                  : "Lotes recibidos"
                : isAdmin
                  ? `Lotes emitidos (${periodDays}d)`
                  : `Lotes recibidos (${periodDays}d)`}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="app-value !text-3xl font-black text-app-text-main tracking-tighter leading-none">
              {batchesEmittedInPeriod}
            </span>
          </div>
        </div>
      </div>

      <div className="app-card !p-7 shadow-lg border-app-border bg-gradient-to-br from-app-surface to-app-bg/30 group relative overflow-hidden">
        <div className="absolute -right-3 -bottom-3 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all duration-700">
          <Ticket className="h-20 w-20 text-app-primary" />
        </div>
        <div className="flex flex-col gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-app-bg rounded-xl border border-app-border shadow-sm">
              <Ticket className="h-5 w-5 text-app-primary" />
            </div>
            <span className="app-label opacity-60 tracking-wider">
              {usesHistoricalFallback
                ? isAdmin
                  ? "Vouchers emitidos"
                  : "Vouchers recibidos"
                : isAdmin
                  ? `Vouchers emitidos (${periodDays}d)`
                  : `Vouchers recibidos (${periodDays}d)`}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="app-value !text-3xl font-black text-app-text-main tracking-tighter leading-none">
              {vouchersEmittedInPeriod}
            </span>
            <span className="text-[10px] font-black text-app-text-muted/60 uppercase tracking-widest">
              codigos
            </span>
          </div>
        </div>
      </div>

      <div className="app-card !p-7 shadow-lg border-emerald-500/10 bg-gradient-to-br from-app-surface to-emerald-500/[0.01] group relative overflow-hidden">
        <div className="absolute -right-3 -bottom-3 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all duration-700">
          <Ticket className="h-20 w-20 text-emerald-500" />
        </div>
        <div className="flex flex-col gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-sm">
              <Ticket className="h-5 w-5 text-emerald-500" />
            </div>
            <span className="app-label opacity-60 tracking-wider">
              {usesHistoricalFallback
                ? isAdmin
                  ? "Vouchers canjeados"
                  : "Vouchers consumidos"
                : isAdmin
                  ? `Vouchers canjeados (${periodDays}d)`
                  : `Vouchers consumidos (${periodDays}d)`}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="app-value !text-3xl font-black text-emerald-500 tracking-tighter leading-none">
              {vouchersRedeemedInPeriod}
            </span>
          </div>
        </div>
      </div>

      <div className="app-card !p-7 shadow-lg border-amber-400/15 bg-gradient-to-br from-app-surface to-amber-400/[0.02] group relative overflow-hidden">
        <div className="absolute -right-3 -bottom-3 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all duration-700">
          <AlertTriangle className="h-20 w-20 text-amber-400" />
        </div>
        <div className="flex flex-col gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-400/10 rounded-xl border border-amber-400/30 shadow-sm">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
            <span className="app-label opacity-60 tracking-wider">
              Vencen en 7 dias
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="app-value !text-3xl font-black text-amber-400 tracking-tighter leading-none">
              {expiringSoonCount}
            </span>
          </div>
        </div>
      </div>

      <div className="app-card !p-7 shadow-lg border-app-border bg-gradient-to-br from-app-surface to-app-bg/30 group relative overflow-hidden">
        <div className="absolute -right-3 -bottom-3 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all duration-700">
          <TrendingUp className="h-20 w-20 text-app-primary" />
        </div>
        <div className="flex flex-col gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-app-bg rounded-xl border border-app-border shadow-sm">
              <TrendingUp className="h-5 w-5 text-app-primary" />
            </div>
            <span className="app-label opacity-60 tracking-wider">
              {usesHistoricalFallback
                ? isAdmin
                  ? "Tasa de Canje (Historico)"
                  : "Tasa de Consumo (Historico)"
                : isAdmin
                  ? `Tasa de Canje (${periodDays}d)`
                  : `Tasa de Consumo (${periodDays}d)`}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`app-value !text-3xl font-black tracking-tighter leading-none ${conversionTone}`}
            >
              {redemptionRate}%
            </span>
          </div>
        </div>
      </div>
      {isAdmin ? (
        <button
          onClick={onToggleForm}
          className={`app-card !p-7 flex flex-col items-center justify-center gap-3 border-dashed border-2 transition-all duration-500 group relative overflow-hidden ${
            showCreateForm
              ? "bg-rose-500/5 border-rose-500/40"
              : "bg-app-primary/5 border-app-primary/40 hover:bg-app-primary hover:border-app-primary active:scale-95"
          }`}
        >
          <div
            className={`p-3 rounded-full transition-all duration-500 shadow-lg ${
              showCreateForm
                ? "bg-rose-500 text-white"
                : "bg-app-primary text-white group-hover:bg-white group-hover:text-app-primary"
            }`}
          >
            <Plus
              className={`h-6 w-6 transition-transform duration-500 ${showCreateForm ? "rotate-45" : "group-hover:rotate-180"}`}
            />
          </div>
          <span
            className={`app-label transition-colors duration-500 font-black tracking-widest ${
              showCreateForm
                ? "text-rose-600"
                : "text-app-primary group-hover:text-white"
            }`}
          >
            {showCreateForm ? "Cerrar Panel" : "Emitir Vouchers"}
          </span>
        </button>
      ) : (
        <div className="app-card !p-7 shadow-lg border-app-border bg-app-bg/5 flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute -right-3 -bottom-3 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all duration-700">
            <Ticket className="h-20 w-20 text-app-text-muted" />
          </div>
          <div className="flex flex-col gap-2 relative z-10">
            <div className="flex items-center gap-3 mb-1">
              <Ticket className="h-4 w-4 text-app-primary opacity-40" />
              <span className="app-label opacity-60 tracking-wider">
                Info Adicional
              </span>
            </div>
            <p className="text-[10.5px] font-medium text-app-text-muted leading-snug opacity-70">
              Cada crédito te permite realizar un test vocacional completo con
              informe incluido.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
