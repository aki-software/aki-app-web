import { AlertTriangle, ArrowRight, MailWarning, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import type { PurchaseSummary } from "../../api/purchase-summary.api";
import {
  formatAccreditationDate,
  formatPurchaseAmount,
  purchaseCountLabel,
} from "../../utils/purchase-summary-presenters";

interface InstitutionPurchaseSummaryProps {
  data: PurchaseSummary | null;
  error: Error | null;
  loading: boolean;
  onRetry: () => void;
  unassignedAvailable: number;
}

export function InstitutionPurchaseSummary({
  data,
  error,
  loading,
  onRetry,
  unassignedAvailable,
}: InstitutionPurchaseSummaryProps) {
  if (error) {
    return (
      <section aria-labelledby="purchase-summary-title" className="app-card !p-6">
        <h3 id="purchase-summary-title" className="text-lg font-black text-app-text-main">
          Compras y acreditaciones
        </h3>
        <div role="alert" className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm font-medium text-app-text-muted">
          <span>No pudimos cargar el resumen de compras</span>
          <button onClick={onRetry} className="inline-flex min-h-11 items-center px-3 font-bold text-app-primary hover:text-app-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-primary">
            Reintentar
          </button>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="purchase-summary-title" className="app-card !p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-app-primary" aria-hidden="true" />
            <h3 id="purchase-summary-title" className="text-lg font-black text-app-text-main">
              Última compra acreditada
            </h3>
          </div>
          {loading ? (
            <p className="mt-2 text-sm text-app-text-muted" aria-live="polite">Cargando compras…</p>
          ) : data?.latestAccreditation ? (
            <p className="mt-2 text-sm font-medium text-app-text-muted">
              {purchaseCountLabel(data.latestAccreditation.voucherCount, "voucher acreditado", "vouchers acreditados")} el {formatAccreditationDate(data.latestAccreditation.accreditedAt)} · {formatPurchaseAmount(data.latestAccreditation.amount.amount, data.latestAccreditation.amount.currency)}
            </p>
          ) : (
            <p className="mt-2 text-sm font-medium text-app-text-muted">
              Aún no hay compras acreditadas.
            </p>
          )}
        </div>
        <Link to="/dashboard/billing" className="inline-flex min-h-11 items-center gap-1 px-3 text-sm font-bold text-app-primary hover:text-app-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-primary">
          Ver compras y saldo <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <p className="mt-4 border-t border-app-border pt-4 text-sm text-app-text-muted">
        Sin asignar: <span className="font-bold text-app-text-main">{purchaseCountLabel(unassignedAvailable, "voucher sin asignar listo para enviar", "vouchers sin asignar listos para enviar")}</span>.
      </p>

      {data && (data.alerts.paidButNotFulfilledCount > 0 || data.alerts.notificationAttentionCount > 0) && (
        <div className="mt-4 space-y-2" aria-live="polite">
          {data.alerts.paidButNotFulfilledCount > 0 && (
            <Link to="/dashboard/billing" className="inline-flex min-h-11 items-center gap-2 px-3 text-sm font-bold text-status-warning hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-status-warning">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {purchaseCountLabel(data.alerts.paidButNotFulfilledCount, "compra pendiente de acreditación", "compras pendientes de acreditación")}
            </Link>
          )}
          {data.alerts.notificationAttentionCount > 0 && (
            <Link to="/dashboard/billing" className="inline-flex min-h-11 items-center gap-2 px-3 text-sm font-bold text-app-text-main hover:text-app-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-primary">
              <MailWarning className="h-4 w-4 shrink-0" aria-hidden="true" />
              {purchaseCountLabel(data.alerts.notificationAttentionCount, "notificación de compra no enviada", "notificaciones de compra no enviadas")}
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
