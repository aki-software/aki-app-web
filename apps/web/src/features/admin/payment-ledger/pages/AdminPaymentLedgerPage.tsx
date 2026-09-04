import type {
  AdminPaymentLedgerDetail,
  AdminPaymentLedgerEntry,
} from "@akit/contracts";
import { ChevronLeft, ChevronRight, ReceiptText, X } from "lucide-react";
import { Button } from "../../../../components/atoms/Button";
import { Spinner } from "../../../../components/atoms/Spinner";
import { usePaymentLedger } from "../hooks/usePaymentLedger";

function formatAmount(entry: AdminPaymentLedgerEntry): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: entry.amount.currency,
  }).format(Number(entry.amount.value));
}

function formatDate(value: string | null): string {
  return value
    ? new Intl.DateTimeFormat("es-AR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value))
    : "Sin registro";
}

function deliveryStatus(
  delivery: AdminPaymentLedgerEntry["notifications"]["buyer"],
): string {
  return delivery ? delivery.status.replace(/_/g, " ") : "SIN ENVÍO";
}

function StatusBadge({ children }: { children: string }) {
  return (
    <span className="inline-flex rounded-full border border-app-border bg-app-surface px-2.5 py-1 text-xs font-semibold text-app-text-main">
      {children}
    </span>
  );
}

function LedgerDetail({ entry }: { entry: AdminPaymentLedgerDetail }) {
  return (
    <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
      <div>
        <dt className="app-label !text-xs">Institución</dt>
        <dd className="mt-1 font-semibold text-app-text-main">{entry.institution.name}</dd>
      </div>
      <div>
        <dt className="app-label !text-xs">Comprador</dt>
        <dd className="mt-1 text-app-text-main">
          {entry.buyer ? `${entry.buyer.name} · ${entry.buyer.email}` : "Sin datos"}
        </dd>
      </div>
      <div>
        <dt className="app-label !text-xs">Plan y monto</dt>
        <dd className="mt-1 text-app-text-main">
          {entry.commercial.planName ?? "Plan no disponible"} · {formatAmount(entry)}
        </dd>
      </div>
      <div>
        <dt className="app-label !text-xs">Liquidación</dt>
        <dd className="mt-1 text-app-text-main">
          {entry.payment ? formatDate(entry.payment.settledAt) : "Pago sin liquidar"}
        </dd>
      </div>
      <div>
        <dt className="app-label !text-xs">Cumplimiento</dt>
        <dd className="mt-1 text-app-text-main">
          {entry.fulfillment.state} · {formatDate(entry.fulfillment.fulfilledAt)}
        </dd>
      </div>
      <div>
        <dt className="app-label !text-xs">Vouchers esperados / reales</dt>
        <dd className="mt-1 text-app-text-main">
          {entry.fulfillment.expectedVoucherCount} / {entry.fulfillment.actualVoucherCount}
          {entry.fulfillment.discrepancy !== 0 && ` (diferencia: ${entry.fulfillment.discrepancy})`}
        </dd>
      </div>
      <div>
        <dt className="app-label !text-xs">Entrega al comprador</dt>
        <dd className="mt-1"><StatusBadge>{deliveryStatus(entry.notifications.buyer)}</StatusBadge></dd>
      </div>
      <div>
        <dt className="app-label !text-xs">Entrega a administración</dt>
        <dd className="mt-1"><StatusBadge>{deliveryStatus(entry.notifications.platformAdmin)}</StatusBadge></dd>
      </div>
    </dl>
  );
}

export function AdminPaymentLedgerPage() {
  const ledger = usePaymentLedger();
  const totalPages = ledger.data?.totalPages ?? 0;

  return (
    <div className="space-y-8 animate-in pb-20">
      <header className="border-b border-app-border pb-8">
        <span className="app-label !text-app-primary">Operaciones administrativas</span>
        <h2 className="mt-2 text-4xl font-display font-bold tracking-tight text-app-text-main md:text-5xl">
          Pagos y acreditaciones
        </h2>
        <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-app-text-muted">
          Consultá pagos liquidados, emisión de vouchers y el estado de cada entrega.
        </p>
      </header>

      <section className="app-card !p-0 overflow-hidden border border-app-border" aria-labelledby="ledger-title">
        <div className="flex items-center gap-3 border-b border-app-border px-5 py-4">
          <ReceiptText className="h-5 w-5 text-app-primary" aria-hidden="true" />
          <h3 id="ledger-title" className="font-display text-lg font-semibold text-app-text-main">Registro de pagos</h3>
        </div>

        {ledger.isLoading ? (
          <div className="flex h-56 flex-col items-center justify-center gap-3 text-app-text-muted">
            <Spinner />
            <span className="text-sm">Cargando pagos…</span>
          </div>
        ) : ledger.error ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-4 p-6 text-center" role="alert">
            <p className="font-semibold text-app-text-main">No pudimos cargar el registro de pagos.</p>
            <Button variant="outline" onClick={ledger.load}>Reintentar</Button>
          </div>
        ) : !ledger.data || ledger.data.items.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-2 p-6 text-center text-app-text-muted">
            <ReceiptText className="h-10 w-10 opacity-40" aria-hidden="true" />
            <p className="font-semibold">No hay pagos para mostrar.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
                <thead className="bg-app-surface/40">
                  <tr className="border-b border-app-border">
                    <th className="px-5 py-3 app-label !text-xs">Institución / comprador</th>
                    <th className="px-5 py-3 app-label !text-xs">Plan / monto</th>
                    <th className="px-5 py-3 app-label !text-xs">Liquidación / cumplimiento</th>
                    <th className="px-5 py-3 app-label !text-xs">Vouchers</th>
                    <th className="px-5 py-3 app-label !text-xs">Entrega comprador</th>
                    <th className="px-5 py-3 app-label !text-xs">Entrega administración</th>
                    <th className="px-5 py-3"><span className="sr-only">Ver detalle</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {ledger.data.items.map((entry) => (
                    <tr key={entry.voucherBatchId} className="hover:bg-app-surface/50">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-app-text-main">{entry.institution.name}</p>
                        <p className="mt-1 text-xs text-app-text-muted">{entry.buyer?.name ?? "Sin comprador"}</p>
                      </td>
                      <td className="px-5 py-4 text-app-text-main">
                        <p>{entry.commercial.planName ?? "Plan no disponible"}</p>
                        <p className="mt-1 font-semibold">{formatAmount(entry)}</p>
                      </td>
                      <td className="px-5 py-4 text-app-text-main">
                        <p>{entry.payment ? formatDate(entry.payment.settledAt) : "Sin liquidar"}</p>
                        <p className="mt-1 text-xs">{entry.fulfillment.state}</p>
                      </td>
                      <td className="px-5 py-4 text-app-text-main">{entry.fulfillment.expectedVoucherCount} / {entry.fulfillment.actualVoucherCount}</td>
                      <td className="px-5 py-4"><StatusBadge>{deliveryStatus(entry.notifications.buyer)}</StatusBadge></td>
                      <td className="px-5 py-4"><StatusBadge>{deliveryStatus(entry.notifications.platformAdmin)}</StatusBadge></td>
                      <td className="px-5 py-4 text-right">
                        <Button className="px-3 py-2 text-xs" variant="outline" onClick={() => void ledger.selectBatch(entry.voucherBatchId)}>
                          Ver detalle
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <nav className="flex items-center justify-between gap-4 border-t border-app-border px-5 py-4" aria-label="Paginación del registro de pagos">
              <p className="text-sm text-app-text-muted">Página {ledger.page} de {totalPages} · {ledger.data.total} pagos</p>
              <div className="flex gap-2">
                <Button aria-label="Página anterior" className="min-h-10 min-w-10 px-3 py-2" variant="outline" disabled={ledger.page === 1} onClick={ledger.previousPage}><ChevronLeft className="h-4 w-4" aria-hidden="true" /></Button>
                <Button aria-label="Página siguiente" className="min-h-10 min-w-10 px-3 py-2" variant="outline" disabled={ledger.page >= totalPages} onClick={ledger.nextPage}><ChevronRight className="h-4 w-4" aria-hidden="true" /></Button>
              </div>
            </nav>
          </>
        )}
      </section>

      {(ledger.isDetailLoading || ledger.detailError || ledger.detail) && (
        <aside className="app-card border border-app-border p-5" aria-live="polite" aria-label="Detalle del pago seleccionado">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h3 className="font-display text-lg font-semibold text-app-text-main">Detalle del pago</h3>
            {ledger.detail && <Button aria-label="Cerrar detalle" className="min-h-10 min-w-10 px-3 py-2" variant="outline" onClick={ledger.closeDetail}><X className="h-4 w-4" aria-hidden="true" /></Button>}
          </div>
          {ledger.isDetailLoading ? <div className="flex items-center gap-3 text-sm text-app-text-muted"><Spinner size="sm" /> Cargando detalle…</div> : null}
          {ledger.detailError ? <div role="alert" className="flex flex-wrap items-center gap-3"><p className="text-sm font-semibold text-app-text-main">No pudimos cargar el detalle.</p><Button variant="outline" className="px-3 py-2 text-xs" onClick={ledger.closeDetail}>Cerrar</Button></div> : null}
          {ledger.detail ? <LedgerDetail entry={ledger.detail} /> : null}
        </aside>
      )}
    </div>
  );
}
