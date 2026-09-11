import type {
  AdminPaymentLedgerEntry,
  AdminPaymentLedgerQuery,
} from "@akit/contracts";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ReceiptText,
} from "lucide-react";
import { Button } from "../../../../components/atoms/Button";
import { Spinner } from "../../../../components/atoms/Spinner";
import { PaymentDialog } from "../../../payments/components/PaymentPresentation";
import {
  formatPaymentAmount,
  formatPaymentDate,
  paymentGatewayLabel,
} from "../../../payments/utils/payment-presenters";
import { LedgerDetail } from "../components/LedgerDetail";
import { usePaymentLedger } from "../hooks/usePaymentLedger";

const STATE_LABELS: Record<
  AdminPaymentLedgerEntry["operationalState"],
  string
> = {
  ACCREDITED: "Acreditado",
  PENDING_ACCREDITATION: "Pendiente de acreditación",
  ACCREDITED_NOTIFICATION_ATTENTION: "Acreditado",
};

type SortField =
  | "SETTLED"
  | "INSTITUTION"
  | "PLAN"
  | "AMOUNT"
  | "GATEWAY"
  | "OPERATIONAL_STATE";

const STATE_STYLES: Record<
  AdminPaymentLedgerEntry["operationalState"],
  string
> = {
  ACCREDITED:
    "border-status-success/30 bg-status-success/10 text-status-success",
  PENDING_ACCREDITATION:
    "border-status-warning/30 bg-status-warning/10 text-status-warning",
  ACCREDITED_NOTIFICATION_ATTENTION:
    "border-status-success/30 bg-status-success/10 text-status-success",
};

const STATE_ICONS: Record<
  AdminPaymentLedgerEntry["operationalState"],
  typeof CheckCircle2
> = {
  ACCREDITED: CheckCircle2,
  PENDING_ACCREDITATION: Clock,
  ACCREDITED_NOTIFICATION_ATTENTION: CheckCircle2,
};

function StateBadge({
  state,
}: {
  state: AdminPaymentLedgerEntry["operationalState"];
}) {
  const Icon = STATE_ICONS[state];
  const hasNotificationAttention =
    state === "ACCREDITED_NOTIFICATION_ATTENTION";

  return (
    <span className="inline-flex min-w-0 shrink-0 flex-col items-start gap-1">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-semibold ${STATE_STYLES[state]}`}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {STATE_LABELS[state]}
      </span>
      {hasNotificationAttention ? (
        <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-status-warning">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Notificación pendiente
        </span>
      ) : null}
    </span>
  );
}

function SortButton({
  label,
  field,
  sort,
  onSort,
}: {
  label: string;
  field: SortField;
  sort: AdminPaymentLedgerQuery["sort"];
  onSort: (sort: AdminPaymentLedgerQuery["sort"]) => void;
}) {
  const active = sort.startsWith(field);
  const descending = active && sort.endsWith("_DESC");
  const next =
    `${field}_${descending ? "ASC" : "DESC"}` as AdminPaymentLedgerQuery["sort"];
  const SortIcon = active ? (descending ? ArrowDown : ArrowUp) : ArrowUpDown;
  return (
    <button
      type="button"
      className="inline-flex min-h-6 items-center gap-1 text-left text-app-text-main transition-colors hover:text-app-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-primary"
      onClick={() => onSort(next)}
      aria-label={`Ordenar por ${label} ${descending ? "ascendente" : "descendente"}`}
      aria-pressed={active}
    >
      {label}
      <SortIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
    </button>
  );
}

function LedgerCards({
  entries,
  onSelect,
}: {
  entries: AdminPaymentLedgerEntry[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="divide-y divide-app-border xl:hidden">
      {entries.map((entry) => (
        <article key={entry.voucherBatchId} className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
                <p className="font-semibold text-app-text-main line-clamp-1">
                  {entry.institution?.name ?? entry.buyer?.name ?? "Usuario B2C"}
                </p>
              <p className="text-sm text-app-text-muted">
                {entry.commercial.planName ?? "Plan no disponible"}
              </p>
            </div>
            <StateBadge state={entry.operationalState} />
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm text-app-text-main">
            <p><span className="app-label !text-xs">Fecha</span><br />{entry.payment ? formatPaymentDate(entry.payment.settledAt) : entry.channel === "B2B" && Number(entry.amount.value) === 0 ? "Manual" : "Sin liquidar"}</p>
            <p><span className="app-label !text-xs">Monto</span><br />{entry.channel === "B2C" ? "Monto en tienda" : formatPaymentAmount(Number(entry.amount.value), entry.amount.currency)}</p>
            <p><span className="app-label !text-xs">Pasarela</span><br />{entry.payment ? paymentGatewayLabel(entry.payment.gateway) : entry.channel === "B2B" && Number(entry.amount.value) === 0 ? paymentGatewayLabel(null) : "—"}</p>
            <p><span className="app-label !text-xs">{entry.channel === "B2B" ? "Acreditación" : "Estado"}</span><br />{entry.channel === "B2B" ? (entry.fulfillment.state === "FULFILLED" ? "Acreditada" : "Pendiente") : "Desbloqueado"}</p>
          </div>
          <Button
            className="min-h-11 w-full px-3 py-2 text-xs"
            variant="outline"
            onClick={() => onSelect(entry.voucherBatchId)}
          >
            Ver detalle
          </Button>
        </article>
      ))}
    </div>
  );
}

export function AdminPaymentLedgerPage() {
  const ledger = usePaymentLedger();
  const activeTab = ledger.filters.channel ?? "B2B";
  const filteredItems = ledger.data?.items || [];
  const totalPages = ledger.data?.totalPages ?? 0;

  return (
    <div className="space-y-8 animate-in pb-20">
      <header className="border-b border-app-border pb-8">
        <span className="app-label !text-app-primary">
          Operaciones administrativas
        </span>
        <h2 className="mt-2 text-4xl font-display font-bold tracking-tight text-app-text-main md:text-5xl">
          Pagos y acreditaciones
        </h2>
        <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-app-text-muted">
          Consultá pagos liquidados, emisión de vouchers y el estado operativo
          de cada entrega.
        </p>
        
        <div className="mt-8 flex items-center gap-6 border-b border-app-border">
          <button
            onClick={() => ledger.updateFilters({ channel: "B2B" })}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === "B2B" ? "border-app-primary text-app-primary" : "border-transparent text-app-text-muted hover:text-app-text-main hover:border-app-text-muted/30"}`}
          >
            Institucional (B2B)
          </button>
          <button
            onClick={() => ledger.updateFilters({ channel: "B2C" })}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === "B2C" ? "border-app-primary text-app-primary" : "border-transparent text-app-text-muted hover:text-app-text-main hover:border-app-text-muted/30"}`}
          >
            App Móvil (B2C)
          </button>
        </div>
      </header>
      <section
        className="app-card !p-0 overflow-hidden border border-app-border"
        aria-labelledby="ledger-title"
      >
        <div className="flex items-center gap-3 border-b border-app-border px-5 py-4">
          <ReceiptText
            className="h-5 w-5 text-app-primary"
            aria-hidden="true"
          />
          <h3
            id="ledger-title"
            className="font-display text-lg font-semibold text-app-text-main"
          >
            Registro de pagos
          </h3>
        </div>
        <div className="grid gap-3 border-b border-app-border p-4 md:grid-cols-[minmax(0,1fr)_auto_auto]">
          <label className="text-sm font-medium text-app-text-main">
            Institución
            <input
              className="mt-1 block w-full rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm"
              value={ledger.filters.institutionName ?? ""}
              onChange={(event) =>
                ledger.updateFilters({
                  institutionName: event.target.value || undefined,
                })
              }
              placeholder="Buscar institución"
            />
          </label>
          <label className="text-sm font-medium text-app-text-main">
            Desde
            <input
              className="mt-1 block rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm"
              type="date"
              onChange={(event) =>
                ledger.updateFilters({
                  settledFrom: event.target.value
                    ? new Date(
                        `${event.target.value}T00:00:00.000Z`,
                      ).toISOString()
                    : undefined,
                })
              }
            />
          </label>
          <label className="text-sm font-medium text-app-text-main">
            Hasta
            <input
              className="mt-1 block rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm"
              type="date"
              onChange={(event) =>
                ledger.updateFilters({
                  settledTo: event.target.value
                    ? new Date(
                        `${event.target.value}T23:59:59.999Z`,
                      ).toISOString()
                    : undefined,
                })
              }
            />
          </label>
        </div>
        <details className="border-b border-app-border px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-app-text-main">
            Más filtros
          </summary>
          <label className="mt-3 block max-w-xs text-sm text-app-text-main">
            Estado de acreditación
                <select
                  className="app-select mt-1 block w-full rounded-md border border-app-border bg-app-bg px-3 py-2 text-app-text-main"
                  value={ledger.filters.fulfillmentState ?? ""}
              onChange={(event) =>
                ledger.updateFilters({
                  fulfillmentState:
                    (event.target.value as
                      | "PENDING"
                      | "FULFILLED"
                      | undefined) || undefined,
                })
              }
            >
                  <option value="">Todos</option>
                  <option value="PENDING">Pendiente</option>
                  <option value="FULFILLED">Acreditada</option>
            </select>
          </label>
        </details>
        {ledger.isLoading ? (
          <div className="flex h-56 flex-col items-center justify-center gap-3 text-app-text-muted">
            <Spinner />
            <span className="text-sm">Cargando pagos…</span>
          </div>
        ) : ledger.error ? (
          <div
            className="flex min-h-56 flex-col items-center justify-center gap-4 p-6 text-center"
            role="alert"
          >
            <p className="font-semibold text-app-text-main">
              No pudimos cargar el registro de pagos.
            </p>
            <Button variant="outline" onClick={ledger.load}>
              Reintentar
            </Button>
          </div>
        ) : !ledger.data || filteredItems.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-2 p-6 text-center text-app-text-muted">
            <ReceiptText className="h-10 w-10 opacity-40" aria-hidden="true" />
            <p className="font-semibold">No hay pagos para mostrar.</p>
          </div>
        ) : (
          <>
            <LedgerCards
              entries={filteredItems}
              onSelect={ledger.selectBatch}
            />
            <div className="hidden xl:block">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-app-surface/40">
                  <tr className="border-b border-app-border">
                    {(
                      [
                        ["Fecha", "SETTLED"],
                        ["Institución", "INSTITUTION"],
                        ["Plan", "PLAN"],
                        ["Monto", "AMOUNT"],
                        ["Pasarela", "GATEWAY"],
                        ["Estado", "OPERATIONAL_STATE"],
                      ] as [string, SortField][]
                    ).map(([label, field]) => (
                      <th key={field} className="px-4 py-3 app-label !text-xs text-app-text-muted">
                        <SortButton
                          label={label}
                          field={field}
                          sort={ledger.sort}
                          onSort={ledger.updateSort}
                        />
                      </th>
                    ))}
                    <th className="px-4 py-3">
                      <span className="sr-only">Ver detalle</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border/40">
                  {filteredItems.map((entry) => (
                    <tr
                      key={entry.voucherBatchId}
                      className="hover:bg-app-surface/50"
                    >
                      <td className="px-4 py-3.5 text-app-text-muted">
                        {entry.payment
                          ? formatPaymentDate(entry.payment.settledAt)
                          : entry.channel === "B2B" && Number(entry.amount.value) === 0
                            ? "Manual"
                            : "Sin liquidar"}
                      </td>
                      <td
                        className="truncate px-4 py-3.5 font-medium text-app-text-main"
                        title={entry.institution?.name ?? entry.buyer?.name ?? "Usuario B2C"}
                      >
                        {entry.institution?.name ?? entry.buyer?.name ?? "Usuario B2C"}
                      </td>
                      <td
                        className="truncate px-4 py-3.5 text-app-text-muted"
                        title={entry.commercial.planName ?? "Desconocido"}
                      >
                        {entry.commercial.planName}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-sm font-medium text-app-text-main">
                        {entry.channel === "B2C"
                          ? <span className="text-app-text-muted font-normal">Monto en tienda</span>
                          : formatPaymentAmount(
                              Number(entry.amount.value),
                              entry.amount.currency,
                            )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-sm text-app-text-muted">
                        {entry.payment
                          ? paymentGatewayLabel(entry.payment.gateway)
                          : entry.channel === "B2B" && Number(entry.amount.value) === 0
                            ? paymentGatewayLabel(null)
                            : "Sin liquidar"}
                      </td>
                      <td className="px-4 py-3.5">
                        <StateBadge state={entry.operationalState} />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Button
                          className="px-3 py-1.5 text-xs h-8"
                          variant="outline"
                          onClick={() =>
                            ledger.selectBatch(entry.voucherBatchId)
                          }
                        >
                          Ver
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <nav
              className="flex items-center justify-between gap-4 border-t border-app-border px-5 py-4"
              aria-label="Paginación del registro de pagos"
            >
              <p className="text-sm text-app-text-muted">
                Página {ledger.page} de {totalPages} · {ledger.data.total} pagos
              </p>
              <div className="flex gap-2">
                <Button
                  aria-label="Página anterior"
                  className="min-h-10 min-w-10 px-3 py-2"
                  variant="outline"
                  disabled={ledger.page === 1}
                  onClick={ledger.previousPage}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  aria-label="Página siguiente"
                  className="min-h-10 min-w-10 px-3 py-2"
                  variant="outline"
                  disabled={ledger.page >= totalPages}
                  onClick={ledger.nextPage}
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </nav>
          </>
        )}
      </section>
      {ledger.selectedBatchId ? (
        <PaymentDialog
          title="Detalle del pago"
          subtitle="Compra y acreditación"
          onClose={ledger.closeDetail}
        >
          {ledger.isDetailLoading ? (
            <div className="flex items-center gap-3 text-sm text-app-text-muted">
              <Spinner size="sm" /> Cargando detalle…
            </div>
          ) : ledger.detailError ? (
            <div role="alert">
              <p className="font-semibold text-app-text-main">
                No pudimos cargar el detalle.
              </p>
            </div>
          ) : ledger.detail ? (
            <LedgerDetail entry={ledger.detail} />
          ) : null}
        </PaymentDialog>
      ) : null}
    </div>
  );
}
