import { useMemo, useState } from "react";
import type { PaymentTransaction } from "@akit/contracts";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import {
  PaymentDialog,
  PaymentStatusBadge,
} from "../../payments/components/PaymentPresentation";
import {
  formatPaymentAmount,
  formatPaymentDate,
  paymentGatewayLabel,
  paymentStatusLabel,
} from "../../payments/utils/payment-presenters";

const PAGE_SIZE = 6;
type SortKey = "createdAt" | "plan" | "amount" | "gateway" | "status";
type SortDirection = "asc" | "desc";

interface BillingHistoryTableProps {
  transactions: PaymentTransaction[];
}

interface PurchaseDetailProps {
  transaction: PaymentTransaction;
  onClose: () => void;
}

function PurchaseDetail({ transaction, onClose }: PurchaseDetailProps) {
  return (
    <PaymentDialog
      title="Detalle de compra"
      subtitle="Resumen de la compra"
      onClose={onClose}
    >
      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 px-5 py-5 text-sm sm:grid-cols-2">
        <DetailField
          label="Fecha"
          value={formatPaymentDate(transaction.createdAt)}
        />
        <DetailField label="Plan" value={transaction.plan?.name || "Lote"} />
        <DetailField
          label="Monto"
          value={formatPaymentAmount(transaction.amount, transaction.currency)}
        />
        <DetailField
          label="Método de pago"
          value={paymentGatewayLabel(transaction.gateway)}
        />
        <DetailField
          label="Estado"
          value={paymentStatusLabel(transaction.status)}
        />
        <DetailField label="Referencia" value={transaction.externalReference} />
      </dl>
    </PaymentDialog>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="app-label mb-1 text-xs uppercase tracking-wider">
        {label}
      </dt>
      <dd className="break-words font-semibold text-app-text-main">{value}</dd>
    </div>
  );
}

function transactionSearchText(transaction: PaymentTransaction): string {
  return [
    transaction.plan?.name,
    paymentGatewayLabel(transaction.gateway),
    paymentStatusLabel(transaction.status),
    transaction.externalReference,
  ]
    .join(" ")
    .toLocaleLowerCase("es-AR");
}

function sortValue(
  transaction: PaymentTransaction,
  key: SortKey,
): string | number {
  if (key === "plan") return transaction.plan?.name || "";
  if (key === "gateway") return paymentGatewayLabel(transaction.gateway);
  if (key === "status") return paymentStatusLabel(transaction.status);
  if (key === "amount") return transaction.amount;
  return new Date(transaction.createdAt).getTime();
}

export function BillingHistoryTable({
  transactions,
}: BillingHistoryTableProps) {
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: "createdAt",
    direction: "desc",
  });
  const [selectedTransaction, setSelectedTransaction] =
    useState<PaymentTransaction | null>(null);

  const filteredTransactions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es-AR");
    const matching = normalizedQuery
      ? transactions.filter((transaction) =>
          transactionSearchText(transaction).includes(normalizedQuery),
        )
      : transactions;
    return [...matching].sort((left, right) => {
      const leftValue = sortValue(left, sort.key);
      const rightValue = sortValue(right, sort.key);
      const comparison =
        typeof leftValue === "number" && typeof rightValue === "number"
          ? leftValue - rightValue
          : String(leftValue).localeCompare(String(rightValue), "es-AR");
      return sort.direction === "asc" ? comparison : -comparison;
    });
  }, [query, sort, transactions]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTransactions.length / PAGE_SIZE),
  );
  const safePage = Math.min(page, totalPages - 1);
  const paginated = filteredTransactions.slice(
    safePage * PAGE_SIZE,
    (safePage + 1) * PAGE_SIZE,
  );

  const updateSort = (key: SortKey) => {
    setPage(0);
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const updateQuery = (value: string) => {
    setPage(0);
    setQuery(value);
  };

  if (!transactions.length) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-12">
        <div className="mb-4 rounded-full border border-app-border bg-app-surface p-4 shadow-sm">
          <ArrowUpRight className="h-7 w-7 text-app-text-muted" />
        </div>
        <h3 className="mb-1 font-display text-base font-bold text-app-text-main">
          Aún no hay compras
        </h3>
        <p className="max-w-sm text-center text-sm text-app-text-muted">
          Cuando adquieras vouchers, aparecerán aquí junto con sus comprobantes.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="border-b border-app-border px-5 py-4">
        <label className="relative block max-w-md">
          <span className="sr-only">Buscar compras</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-muted"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            placeholder="Buscar por plan, referencia, estado o medio de pago"
            className="w-full rounded-lg border border-app-border bg-app-bg py-2.5 pl-9 pr-3 text-sm text-app-text-main placeholder:text-app-text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-primary"
          />
        </label>
      </div>

      {filteredTransactions.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-app-text-muted">
          No encontramos compras con esa búsqueda.
        </p>
      ) : (
        <>
          <div className="divide-y divide-app-border md:hidden">
            {paginated.map((transaction) => (
              <article key={transaction.id} className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-app-text-main">
                    {formatPaymentDate(transaction.createdAt)}
                  </span>
                  <PaymentStatusBadge status={transaction.status} />
                </div>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="font-semibold text-app-text-main">
                      {transaction.plan?.name || "Lote"}
                    </p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-app-text-muted">
                      {paymentGatewayLabel(transaction.gateway)}
                    </p>
                  </div>
                  <p className="font-display text-sm font-bold text-app-text-main">
                    {formatPaymentAmount(
                      transaction.amount,
                      transaction.currency,
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTransaction(transaction)}
                  className="min-h-6 text-sm font-semibold text-app-primary hover:text-app-primary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-primary"
                >
                  Ver detalle de compra
                </button>
              </article>
            ))}
          </div>

          <div className="hidden md:block">
            <table className="w-full table-fixed text-left">
              <thead>
                <tr className="border-b border-app-border bg-app-surface/20">
                  <SortableHeader
                    label="Fecha"
                    sortKey="createdAt"
                    sort={sort}
                    onSort={updateSort}
                  />
                  <SortableHeader
                    label="Plan"
                    sortKey="plan"
                    sort={sort}
                    onSort={updateSort}
                  />
                  <SortableHeader
                    label="Monto"
                    sortKey="amount"
                    sort={sort}
                    onSort={updateSort}
                  />
                  <SortableHeader
                    label="Medio"
                    sortKey="gateway"
                    sort={sort}
                    onSort={updateSort}
                  />
                  <SortableHeader
                    label="Estado"
                    sortKey="status"
                    sort={sort}
                    onSort={updateSort}
                  />
                  <th className="w-24 px-3 py-3">
                    <span className="sr-only">Detalle</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {paginated.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="transition-colors hover:bg-app-surface/50"
                  >
                    <td className="px-3 py-3 text-sm font-semibold text-app-text-main">
                      {formatPaymentDate(transaction.createdAt)}
                    </td>
                    <td
                      className="truncate px-3 py-3 text-sm font-semibold text-app-text-main"
                      title={transaction.plan?.name}
                    >
                      {transaction.plan?.name || "Lote"}
                    </td>
                    <td className="px-3 py-3 text-sm font-bold text-app-text-main">
                      {formatPaymentAmount(
                        transaction.amount,
                        transaction.currency,
                      )}
                    </td>
                    <td className="truncate px-3 py-3 text-sm text-app-text-muted">
                      {paymentGatewayLabel(transaction.gateway)}
                    </td>
                    <td className="px-3 py-3">
                      <PaymentStatusBadge status={transaction.status} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        aria-label="Ver detalle de compra"
                        onClick={() => setSelectedTransaction(transaction)}
                        className="min-h-6 rounded px-2 py-1 text-sm font-semibold text-app-primary hover:bg-app-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-primary"
                      >
                        Detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {filteredTransactions.length > 0 && (
        <Pagination
          page={safePage}
          totalPages={totalPages}
          totalItems={filteredTransactions.length}
          onPageChange={setPage}
        />
      )}
      {selectedTransaction && (
        <PurchaseDetail
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  sort: { key: SortKey; direction: SortDirection };
  onSort: (key: SortKey) => void;
}) {
  const isActive = sort.key === sortKey;
  const directionLabel =
    isActive && sort.direction === "asc" ? " descendente" : " ascendente";
  return (
    <th className="px-3 py-3 text-left">
      <button
        aria-label={`Ordenar por ${label.toLocaleLowerCase("es-AR")}${directionLabel}`}
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 app-label uppercase tracking-wider focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-primary"
      >
        {label}
        <ChevronDown
          aria-hidden="true"
          className={`h-3.5 w-3.5 ${isActive && sort.direction === "desc" ? "rotate-180" : ""}`}
        />
      </button>
    </th>
  );
}

function Pagination({
  page,
  totalPages,
  totalItems,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  const firstItem = page * PAGE_SIZE + 1;
  const lastItem = Math.min((page + 1) * PAGE_SIZE, totalItems);
  if (totalPages === 1)
    return (
      <p className="border-t border-app-border px-5 py-3 text-xs font-medium text-app-text-muted">
        {firstItem}–{lastItem} de {totalItems}
      </p>
    );
  return (
    <div className="flex items-center justify-between gap-3 border-t border-app-border bg-app-surface/30 px-5 py-3">
      <p className="text-xs font-medium text-app-text-muted">
        {firstItem}–{lastItem} de {totalItems}
      </p>
      <div className="flex items-center gap-1">
        <button
          aria-label="Página anterior"
          onClick={() => onPageChange(Math.max(0, page - 1))}
          disabled={page === 0}
          className="min-h-6 min-w-6 rounded-lg p-1.5 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
        </button>
        {Array.from({ length: totalPages }, (_, index) => (
          <button
            key={index}
            aria-label={`Página ${index + 1}`}
            aria-current={index === page ? "page" : undefined}
            onClick={() => onPageChange(index)}
            className={`min-h-7 min-w-7 rounded-lg px-1 text-xs font-bold ${index === page ? "bg-app-primary text-white" : "text-app-text-muted hover:bg-app-surface"}`}
          >
            {index + 1}
          </button>
        ))}
        <button
          aria-label="Página siguiente"
          onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
          disabled={page === totalPages - 1}
          className="min-h-6 min-w-6 rounded-lg p-1.5 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
