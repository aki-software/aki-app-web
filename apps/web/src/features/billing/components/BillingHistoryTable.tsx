import { useState } from 'react';
import { PaymentTransaction } from '@akit/contracts';
import { ArrowUpRight, Clock, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 5;

interface BillingHistoryTableProps {
  transactions: PaymentTransaction[];
}

const STATUS_LABELS: Record<string, string> = {
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
  PENDING: 'Pendiente',
  EXPIRED: 'Expirado',
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    APPROVED: 'bg-status-success/10 text-status-success border-status-success/20',
    REJECTED: 'bg-status-error/10 text-status-error border-status-error/20',
    PENDING: 'bg-status-warning/10 text-status-warning border-status-warning/20',
    EXPIRED: 'bg-app-border text-app-text-muted border-app-border',
  };
  const icons: Record<string, JSX.Element> = {
    APPROVED: <CheckCircle2 className="w-3.5 h-3.5" />,
    REJECTED: <XCircle className="w-3.5 h-3.5" />,
    PENDING: <Clock className="w-3.5 h-3.5" />,
    EXPIRED: <Clock className="w-3.5 h-3.5" />,
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${styles[status] ?? styles.EXPIRED}`}>
      {icons[status]}
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function BillingHistoryTable({ transactions }: BillingHistoryTableProps) {
  const [page, setPage] = useState(0);

  if (!transactions.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="p-4 bg-app-surface border border-app-border rounded-full mb-4 shadow-sm">
          <ArrowUpRight className="w-7 h-7 text-app-text-muted" />
        </div>
        <h3 className="text-base font-display font-bold text-app-text-main mb-1">Aún no hay compras</h3>
        <p className="text-app-text-muted text-sm text-center max-w-sm">
          Cuando adquieras vouchers, aparecerán aquí junto con sus comprobantes.
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(transactions.length / PAGE_SIZE);
  const paginated = transactions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-app-border bg-app-surface/20">
              <th className="py-3 px-5 app-label tracking-wider uppercase">Fecha</th>
              <th className="py-3 px-5 app-label tracking-wider uppercase">Lote</th>
              <th className="py-3 px-5 app-label tracking-wider uppercase">Monto</th>
              <th className="py-3 px-5 app-label tracking-wider uppercase">Estado</th>
              <th className="py-3 px-5 app-label tracking-wider uppercase">Método</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {paginated.map((tx) => (
              <tr key={tx.id} className="hover:bg-app-surface/50 transition-colors">
                <td className="py-3 px-5 whitespace-nowrap text-sm font-semibold text-app-text-main">
                  {new Date(tx.createdAt).toLocaleDateString('es-AR', {
                    year: 'numeric', month: 'short', day: 'numeric',
                  })}
                </td>
                <td className="py-3 px-5">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-app-primary/10 text-app-primary border border-app-primary/20">
                    {tx.plan?.name || '—'}
                  </span>
                </td>
                <td className="py-3 px-5 font-bold text-app-text-main font-display text-sm">
                  ${tx.amount} <span className="text-app-text-muted text-xs font-medium ml-1">{tx.currency}</span>
                </td>
                <td className="py-3 px-5">
                  <StatusBadge status={tx.status} />
                </td>
                <td className="py-3 px-5 text-xs font-semibold text-app-text-muted uppercase tracking-wider">
                  {tx.gateway === 'MERCADO_PAGO' ? 'MercadoPago' : 'Stripe'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-app-border bg-app-surface/30">
          <p className="text-xs text-app-text-muted font-medium">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, transactions.length)} de {transactions.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg hover:bg-app-surface border border-transparent hover:border-app-border transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4 text-app-text-muted" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
                  i === page
                    ? 'bg-app-primary text-white'
                    : 'text-app-text-muted hover:bg-app-surface border border-transparent hover:border-app-border'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="p-1.5 rounded-lg hover:bg-app-surface border border-transparent hover:border-app-border transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4 text-app-text-muted" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


