import { X,} from "lucide-react";
import { useMemo, useState } from "react";
import { getStatusLabel, getStatusPillClass, DETAIL_ITEMS_PER_PAGE } from "../../constants/vouchers.constants";
import { Pagination } from "../../../../components/molecules/Pagination";
import { VoucherBatchDetailResponse } from "../../api/dashboard";
import { formatDateTime } from "../../../../utils/date";

interface BatchDetailDrawerProps {
  batchId: string;
  detail: VoucherBatchDetailResponse | null;
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  onClose: () => void;
}

export const BatchDetailDrawer = ({ batchId, detail, loading, error, isAdmin, onClose }: BatchDetailDrawerProps) => {
  const [page, setPage] = useState(1);

  const paginatedData = useMemo(() => {
    const vouchers = detail?.vouchers ?? [];
    const totalPages = Math.ceil(vouchers.length / DETAIL_ITEMS_PER_PAGE);
    const safePage = totalPages > 0 ? Math.min(page, totalPages) : 1;
    const start = (safePage - 1) * DETAIL_ITEMS_PER_PAGE;
    return {
      items: vouchers.slice(start, start + DETAIL_ITEMS_PER_PAGE),
      totalPages,
      safePage,
    };
  }, [detail, page]);

  return (
    <>
      <button type="button" onClick={onClose} className="fixed inset-0 z-40 bg-app-bg/90 backdrop-blur-sm" />
      <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-2xl overflow-y-auto border-l border-app-border bg-app-surface p-6 shadow-2xl slide-in-from-right duration-300">
        <div className="sticky top-0 z-10 mb-6 flex items-center justify-between border-b border-app-border bg-app-surface/95 pb-4 backdrop-blur">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-app-text-muted">Detalle de lote</p>
            <h3 className="mt-1 text-xl font-black text-app-text-main">
              {`Lote ${(detail?.batchId ?? batchId).slice(0, 8).toUpperCase()}`}
            </h3>
          </div>
          <button onClick={onClose} className="rounded-xl border border-app-border bg-app-bg p-2.5 text-app-text-muted hover:text-app-primary">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading && <div className="flex h-48 items-center justify-center"><span className="app-label opacity-60">Cargando detalle...</span></div>}
        {!loading && error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200">{error}</div>}
        
        {!loading && !error && detail && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {/* Tarjetas de stats del lote... */}
              {[
                { label: "Total", value: detail.total, color: "text-app-text-main" },
                { label: "Pendientes", value: detail.pending, color: "text-emerald-300" },
                { label: "Consumidos", value: detail.used, color: "text-rose-300" },
                { label: "Disponibles", value: detail.available, color: "text-sky-300" }
              ].map(stat => (
                <div key={stat.label} className="rounded-xl border border-app-border bg-app-bg p-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-app-text-muted">{stat.label}</p>
                  <p className={`mt-2 text-2xl font-black ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 rounded-xl border border-app-border bg-app-bg p-4 text-sm text-app-text-muted md:grid-cols-2">
              <p>Institución: <span className="font-semibold text-app-text-main">{detail.ownerInstitutionName}</span></p>
              <p>Cuenta operativa: <span className="font-semibold text-app-text-main">{detail.ownerUserName}</span></p>
              <p>Emisión: <span className="font-semibold text-app-text-main">{formatDateTime(detail.createdAt)}</span></p>
              <p>Vencimiento: <span className="font-semibold text-app-text-main">{formatDateTime(detail.expiresAt)}</span></p>
            </div>

            {isAdmin ? (
              <div className="rounded-xl border border-app-border bg-app-bg px-4 py-3 text-sm text-app-text-muted">
                El detalle de vouchers individuales se gestiona desde la institución dueña.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-app-border">
                <table className="w-full border-collapse text-left">
                  <thead className="bg-app-bg/70">
                    <tr>
                      <th className="px-3 py-3 text-[10px] font-black uppercase text-app-text-muted">Código</th>
                      <th className="px-3 py-3 text-[10px] font-black uppercase text-app-text-muted">Estado</th>
                      <th className="px-3 py-3 text-[10px] font-black uppercase text-app-text-muted">Paciente</th>
                      <th className="px-3 py-3 text-[10px] font-black uppercase text-app-text-muted">Fechas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border bg-app-surface">
                    {paginatedData.items.length === 0 ? (
                      <tr><td colSpan={4} className="px-3 py-8 text-center text-sm text-app-text-muted">Este lote no tiene vouchers.</td></tr>
                    ) : (
                      paginatedData.items.map((voucher) => (
                        <tr key={voucher.id}>
                          <td className="px-3 py-3 text-sm font-semibold">{voucher.code}</td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase ${getStatusPillClass(voucher.status)}`}>
                              {getStatusLabel(voucher.status)}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-xs text-app-text-muted">
                            <p>{voucher.assignedPatientName ?? "Sin asignar"}</p>
                            <p>{voucher.assignedPatientEmail ?? "Sin email"}</p>
                          </td>
                          <td className="px-3 py-3 text-xs text-app-text-muted">
                            <p>Emisión: {formatDateTime(voucher.createdAt)}</p>
                            <p>Vence: {formatDateTime(voucher.expiresAt)}</p>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {!isAdmin && <Pagination currentPage={paginatedData.safePage} totalPages={paginatedData.totalPages} onPageChange={setPage} />}
          </div>
        )}
      </aside>
    </>
  );
};