import { Building2, Calendar, Layers3, UserRound } from "lucide-react";
import type { VoucherBatchSummary } from "../../api/dashboard";

function formatDate(value: string | number | Date) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

interface Props {
  batch: VoucherBatchSummary;
}

export function VoucherBatchRow({ batch }: Props) {
  const consumptionPercentage = batch.total
    ? Math.round((batch.used / batch.total) * 100)
    : 0;

  return (
    <div className="app-card group relative flex h-full min-w-0 flex-col overflow-hidden border-app-border !p-6 shadow-xl transition-all duration-500 hover:scale-[1.01] hover:border-app-primary/30 hover:shadow-2xl">
      <div className="absolute -right-8 -top-8 rounded-full bg-app-bg p-8 opacity-5 transition-all group-hover:scale-110 group-hover:opacity-10">
        <Layers3 className="h-20 w-20 text-app-primary" />
      </div>

      <div className="min-w-0 space-y-6">
        <div className="flex items-start gap-4">
          <div className="rounded-xl border border-app-primary/20 bg-app-primary/10 p-3 shadow-inner">
            <Layers3 className="h-5 w-5 text-app-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-black leading-tight tracking-tight text-app-text-main transition-colors group-hover:text-app-primary md:text-xl">
              Lote {batch.batchId.slice(0, 8).toUpperCase()}
            </h3>
            <div className="mt-2 flex items-center gap-2 text-app-text-muted">
              <Calendar className="h-3.5 w-3.5 opacity-70" />
              <span className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
                Emision: {formatDate(batch.createdAt)}
              </span>
            </div>
            <div className="mt-3 space-y-2 text-sm text-app-text-muted">
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-app-primary/70" />
                <span className="font-semibold text-app-text-main">
                  {batch.ownerInstitutionName || "Cliente no informado"}
                </span>
              </div>
              <div className="flex items-center gap-2 opacity-70">
                <UserRound className="h-3.5 w-3.5" />
                <span>
                  {batch.ownerUserName || "Responsable no informado"}
                </span>
              </div>
              <div className="flex items-center gap-2 opacity-70">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  Vencimiento: {batch.expiresAt ? formatDate(batch.expiresAt) : "Sin vencimiento"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-app-text-muted opacity-70">
              Nivel de consumo
            </span>
            <span className="text-xl font-black leading-none text-app-text-main">
              {consumptionPercentage}%
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full border border-app-border bg-app-bg p-0.5 shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                consumptionPercentage === 100
                  ? "bg-rose-500 shadow-rose-500/30"
                  : "bg-app-primary"
              }`}
              style={{ width: `${consumptionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 border-t border-app-border pt-5 xl:grid-cols-3 xl:gap-4">
        <div className="min-w-0 rounded-xl border border-app-border bg-app-bg/50 p-3 sm:p-3.5">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-[9px] font-black uppercase tracking-wide text-app-text-muted sm:text-[10px]">
              Pendientes
            </span>
          </div>
          <span className="mt-2 block text-2xl font-black leading-none tracking-tight text-emerald-400 sm:text-3xl">
            {batch.pending}
          </span>
        </div>
        <div className="min-w-0 rounded-xl border border-app-border bg-app-bg/50 p-3 sm:p-3.5 xl:text-right">
          <div className="flex items-center gap-2 xl:justify-end">
            <span className="text-[9px] font-black uppercase tracking-wide text-rose-300 sm:text-[10px]">
              Consumidos
            </span>
            <div className="h-2 w-2 rounded-full bg-rose-500" />
          </div>
          <span className="mt-2 block text-2xl font-black leading-none tracking-tight text-rose-400 sm:text-3xl">
            {batch.used}
          </span>
        </div>
        <div className="min-w-0 rounded-xl border border-app-border bg-app-bg/50 p-3 sm:p-3.5">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-app-primary" />
            <span className="text-[9px] font-black uppercase tracking-wide text-app-text-muted sm:text-[10px]">
              Total
            </span>
          </div>
          <span className="mt-2 block text-2xl font-black leading-none tracking-tight text-app-text-main sm:text-3xl">
            {batch.total}
          </span>
        </div>
      </div>
    </div>
  );
}
