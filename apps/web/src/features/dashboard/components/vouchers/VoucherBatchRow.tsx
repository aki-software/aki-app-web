import { Calendar, Layers3 } from "lucide-react";
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
  onOpenDetail: (batchId: string) => void;
}

export function VoucherBatchRow({ batch, onOpenDetail }: Props) {
  const consumptionPercentage = batch.total
    ? Math.round((batch.used / batch.total) * 100)
    : 0;

  return (
    <div className="app-card group flex h-full min-w-0 flex-col border-app-border !p-5 shadow-xl transition-all duration-300 hover:border-app-primary/30">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-app-surface-hover text-app-text-dim/80 ring-1 ring-inset ring-app-border">
              <Layers3 className="h-4 w-4" />
            </span>
            <h3 className="min-w-0 truncate text-base font-black tracking-tight text-app-text-main">
              Lote {batch.shortCode || batch.batchId.slice(0, 8).toUpperCase()}
            </h3>
          </div>

          <p className="mt-2 truncate text-sm font-semibold text-app-text-main">
            {batch.ownerInstitutionName || "Institución no informada"}
          </p>
          <p className="truncate text-xs text-app-text-muted">
            {batch.ownerUserName || "Cuenta operativa no informada"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenDetail(batch.batchId)}
          className="shrink-0 rounded-xl border border-app-border bg-app-bg px-3 py-2 text-[10px] font-black uppercase tracking-wider text-app-text-muted transition-colors hover:text-app-primary"
        >
          Ver detalle
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-app-text-muted">
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 opacity-70" />
          <span>Emisión: {formatDate(batch.createdAt)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 opacity-70" />
          <span>
            Vence: {batch.expiresAt ? formatDate(batch.expiresAt) : "Sin vencimiento"}
          </span>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-end justify-between gap-3">
          <span className="text-xs font-semibold text-app-text-muted">
            Consumidos {batch.used}/{batch.total}
          </span>
          <span className="text-sm font-black text-app-text-main">
            {consumptionPercentage}%
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full border border-app-border bg-app-bg">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              consumptionPercentage === 100 ? "bg-status-error" : "bg-app-primary"
            }`}
            style={{ width: `${consumptionPercentage}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-app-border pt-4 text-xs">
        <span className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-bg px-3 py-1 text-app-text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-status-success" />
          Pendientes <span className="font-black text-status-success">{batch.pending}</span>
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-bg px-3 py-1 text-app-text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-status-error" />
          Consumidos <span className="font-black text-status-error">{batch.used}</span>
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-bg px-3 py-1 text-app-text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-app-primary" />
          Total <span className="font-black text-app-text-main">{batch.total}</span>
        </span>
      </div>
    </div>
  );
}
