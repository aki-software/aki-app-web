import { Filter } from "lucide-react";
import { VoucherData } from "../../api/dashboard";
import { VoucherTableRow } from "./VoucherTableRow";
import { Pagination } from "../../../../components/molecules/Pagination";

interface VouchersIndividualTableProps {
  items: VoucherData[];
  isAdmin: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onVoucherUpdated: (result: { ok: boolean; message: string }) => Promise<void>;
  onViewSessions: (voucherId: string) => void;
}

export const VouchersIndividualTable = ({
  items,
  isAdmin,
  currentPage,
  totalPages,
  onPageChange,
  onVoucherUpdated,
  onViewSessions,
}: VouchersIndividualTableProps) => {
  return (
    <div className="space-y-8">
      <div className="app-card !p-0 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-app-surface/90 border-b border-app-border">
              <tr>
                <th className="px-5 py-5 app-label opacity-80 text-app-text-soft">Código de Acceso</th>
                <th className="px-5 py-5 app-label opacity-80 text-app-text-soft">Estado</th>
                {isAdmin && <th className="px-5 py-5 app-label opacity-80 text-app-text-soft">Institución</th>}
                <th className="px-5 py-5 app-label opacity-80 text-app-text-soft">Fechas clave</th>
                <th className="px-5 py-5 app-label opacity-80 text-app-text-soft text-right">Compartir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border bg-app-surface">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="px-5 py-20 text-center opacity-40">
                    <div className="flex flex-col items-center gap-4">
                      <Filter className="h-10 w-10" />
                      <p className="app-label">Sin resultados para estos filtros</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((voucher) => (
                  <VoucherTableRow
                    key={voucher.id}
                    voucher={voucher}
                    isAdmin={isAdmin}
                    onVoucherUpdated={onVoucherUpdated}
                    onViewSessions={() => onViewSessions(voucher.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
};