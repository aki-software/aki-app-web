import { Filter } from "lucide-react";
import { VoucherData } from "../../api/dashboard";
import { VoucherTableRow } from "./VoucherTableRow";
import { VoucherCardMobile } from "./VoucherCardMobile";
import { Pagination } from "../../../../components/molecules/Pagination";
import { EmptyState } from "../../../../components/molecules/EmptyState";

interface VouchersIndividualTableProps {
  items: VoucherData[];
  isAdmin: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onVoucherUpdated: (result: { ok: boolean; message: string }) => void | Promise<void>;
  onViewSessions: (voucherId: string) => void;
  actionManager: {
    actionBusy: boolean;
    copiedType: "CODE" | "MAIL" | null;
    handleWhatsApp: (v: VoucherData) => void;
    handleCopyCode: (c: string) => void;
    handleSendEmail: (id: string, c: string, e: string, resend: boolean) => Promise<boolean>;
    handleRevokeAction: (id: string, c: string) => Promise<boolean>;
  };
}

export const VouchersIndividualTable = ({
  items,
  isAdmin,
  currentPage,
  totalPages,
  onPageChange,
  onViewSessions,
  actionManager
}: VouchersIndividualTableProps) => {
  if (items.length === 0) {
    return (
      <div className="app-card !p-10 text-center shadow-md">
        <EmptyState
          icon={<Filter className="h-10 w-10" />}
          title="Sin resultados"
          description="No se encontraron vouchers que coincidan con los filtros seleccionados."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mobile Card List (visible on screens < md) */}
      <div className="md:hidden space-y-4">
        {items.map((voucher) => (
          <VoucherCardMobile
            key={voucher.id}
            voucher={voucher}
            isAdmin={isAdmin}
            actionBusy={actionManager.actionBusy}
            copiedType={actionManager.copiedType}
            onWhatsApp={() => actionManager.handleWhatsApp(voucher)}
            onCopyCode={() => actionManager.handleCopyCode(voucher.code)}
            onSendEmail={(email) =>
              actionManager.handleSendEmail(
                voucher.id,
                voucher.code,
                email || voucher.assignedPatientEmail || "",
                voucher.status === "SENT"
              )
            }
            onRevoke={() => actionManager.handleRevokeAction(voucher.id, voucher.code)}
            onViewSessions={() => onViewSessions(voucher.id)}
          />
        ))}
      </div>

      {/* Desktop Table (visible on screens >= md) */}
      <div className="hidden md:block app-card !p-0 overflow-hidden shadow-2xl">
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
              {items.map((voucher) => (
                <VoucherTableRow
                  key={voucher.id}
                  voucher={voucher}
                  isAdmin={isAdmin}
                  actionBusy={actionManager.actionBusy}
                  copiedType={actionManager.copiedType}
                  onWhatsApp={() => actionManager.handleWhatsApp(voucher)}
                  onCopyCode={() => actionManager.handleCopyCode(voucher.code)}
                  onSendEmail={(email) => 
                    actionManager.handleSendEmail(
                      voucher.id, 
                      voucher.code, 
                      email || voucher.assignedPatientEmail || "", 
                      voucher.status === "SENT"
                    )
                  }
                  onRevoke={() => actionManager.handleRevokeAction(voucher.id, voucher.code)}
                  onViewSessions={() => onViewSessions(voucher.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
};
