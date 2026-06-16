import {
    BadgeCheck,
    Building2,
    Calendar,
    Check,
    Copy,
    Eye,
    Mail,
    MessageCircle,
    Send,
    Ticket,
    UserRound,
    X,
} from "lucide-react";
import { useState } from "react";
import type { VoucherData } from "../../api/dashboard";
import { StatusBadge } from "../../../../components/atoms/StatusBadge";

function formatDate(value: string | number | Date | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  }).format(date);
}

function formatVoucherCode(code: string) {
  if (!code) return "";
  return code.match(/.{1,4}/g)?.join("-") || "";
}

interface Props {
  voucher: VoucherData;
  isAdmin?: boolean;
  copiedType: "CODE" | "MAIL" | null;
  actionBusy: boolean;
  onWhatsApp: () => void;
  onCopyCode: () => void;
  onSendEmail: (email?: string) => void;
  onRevoke: () => void;
  onViewSessions?: () => void;
}

export function VoucherTableRow({ 
  voucher, 
  isAdmin, 
  copiedType, 
  actionBusy,
  onWhatsApp,
  onCopyCode,
  onSendEmail,
  onRevoke,
  onViewSessions 
}: Props) {
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [customEmail, setCustomEmail] = useState("");

  const canSendOrResend = voucher.status === "AVAILABLE" || voucher.status === "SENT";
  const canRevoke = voucher.status === "AVAILABLE" || voucher.status === "SENT";

  const handleEmailSubmit = () => {
    onSendEmail(customEmail);
    setShowEmailInput(false);
    setCustomEmail("");
  };

  return (
    <tr className="border-b border-app-border last:border-0 hover:bg-app-bg/20 transition-all duration-300 group">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-app-text-main p-2.5 border border-app-text-main shadow-lg group-hover:scale-105 transition-transform">
            <Ticket className="h-4 w-4 text-app-bg" aria-hidden="true" />
          </div>
          <span className="font-mono text-lg font-black text-app-text-main tracking-tight group-hover:text-app-primary transition-colors leading-none">
            {formatVoucherCode(voucher.code)}
          </span>
        </div>
      </td>

      <td className="px-5 py-4">
        <StatusBadge status={voucher.status} type="voucher" className="group-hover:scale-105" />
      </td>

      {isAdmin && (
        <td className="px-5 py-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[10px] font-black text-app-text-main uppercase tracking-tight whitespace-nowrap">
              <Building2 className="h-3 w-3 text-app-primary/60" aria-hidden="true" />
              {voucher.ownerInstitutionName || "Institución no informada"}
            </div>
            <div className="flex items-center gap-1.5 opacity-40">
              <UserRound className="h-3 w-3" aria-hidden="true" />
              <span className="app-label lowercase tracking-normal">{voucher.ownerUserName}</span>
            </div>
          </div>
        </td>
      )}

      <td className="px-5 py-4">
        <div className="flex flex-col gap-1 text-[9px] font-bold text-app-text-muted uppercase tracking-tighter">
          <div className="flex items-center gap-1.5 opacity-60">
            <Calendar className="h-3 w-3" aria-hidden="true" />
            Emision: {formatDate(voucher.createdAt)}
          </div>
          {voucher.redeemedAt && (
            <div className="flex items-center gap-1.5 text-app-primary font-black opacity-100 whitespace-nowrap">
              <BadgeCheck className="h-3 w-3" aria-hidden="true" />
              Uso: {formatDate(voucher.redeemedAt)}
            </div>
          )}
          <div className="flex items-center gap-1.5 opacity-60">
            <Calendar className="h-3 w-3" aria-hidden="true" />
            Venc.: {formatDate(voucher.expiresAt ?? null)}
          </div>
        </div>
      </td>

      <td className="px-5 py-4">
        <div className="flex items-center justify-end gap-1.5 relative">
          {isAdmin ? (
            <span className="app-label opacity-20 italic">Solo lectura</span>
          ) : canSendOrResend || canRevoke ? (
            <>
              {showEmailInput && (
                <div className="absolute right-0 -top-20 z-[100] animate-in fade-in zoom-in slide-in-from-bottom-4 duration-300">
                  <div className="app-card !p-3 flex flex-col gap-3 shadow-2xl border-app-primary bg-app-surface min-w-[320px] ring-4 ring-black/5">
                    <div className="flex items-center justify-between px-2 pt-1">
                      <span className="app-label opacity-60">INGRESAR DESTINATARIO</span>
                      <button onClick={() => setShowEmailInput(false)} disabled={actionBusy} aria-label="Cerrar ingreso de email" className="text-app-text-muted hover:text-status-error transition-colors">
                        <X className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3 p-1 bg-app-bg rounded-xl border border-app-border group-focus-within:border-app-primary transition-all">
                      <input
                        type="email"
                        placeholder="ejemplo@email.com"
                        value={customEmail}
                        onChange={(e) => setCustomEmail(e.target.value)}
                        className="flex-1 bg-transparent border-0 text-sm font-bold px-4 py-3 focus:ring-0 outline-none text-app-text-main"
                        autoFocus
                      />
                      <button
                        disabled={actionBusy || !customEmail}
                        onClick={handleEmailSubmit}
                        className="p-3 bg-app-primary text-white rounded-lg hover:bg-app-primary-hover shadow-lg shadow-app-primary/20 disabled:opacity-30 transition-all active:scale-90"
                      >
                        {actionBusy ? <div className="h-4 w-4 border-2 border-white/50 border-t-white animate-spin rounded-full" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <button
                onClick={onCopyCode}
                disabled={actionBusy}
                className={`flex items-center justify-center p-2 rounded-lg border border-app-border transition-all disabled:opacity-40 ${copiedType === "CODE" ? "bg-status-success text-white border-status-success" : "bg-app-bg text-app-text-muted hover:text-status-success hover:border-status-success/20 shadow-sm"}`}
                title="Copiar código"
              >
                {copiedType === "CODE" ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
              </button>
              <button
                onClick={onWhatsApp}
                disabled={actionBusy}
                className="flex items-center justify-center p-2 rounded-lg border border-app-border bg-status-success/5 text-status-success hover:bg-status-success hover:text-white hover:border-status-success shadow-sm transition-all disabled:opacity-40"
                title="WhatsApp"
              >
                <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                onClick={() => (voucher.assignedPatientEmail ? onSendEmail() : setShowEmailInput(true))}
                disabled={actionBusy}
                className={`flex items-center justify-center p-2 rounded-lg border border-app-border transition-all disabled:opacity-40 ${copiedType === "MAIL" ? "bg-status-warning text-white border-status-warning" : "bg-app-bg text-app-text-muted hover:text-status-warning hover:border-status-warning/20 shadow-sm"}`}
                title={voucher.status === "SENT" ? "Reenviar por Email" : "Enviar por Email"}
              >
                {copiedType === "MAIL" ? <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> : <Mail className="h-3.5 w-3.5" aria-hidden="true" />}
              </button>
              {voucher.status === "USED" && onViewSessions && (
                <button
                  onClick={onViewSessions}
                  disabled={actionBusy}
                  className="flex items-center justify-center p-2 rounded-lg border border-blue-500/20 bg-blue-500/5 text-blue-500 hover:bg-blue-500 hover:text-white hover:border-blue-500 shadow-sm transition-all disabled:opacity-40"
                  title="Ver sesiones"
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
              {canRevoke && (
                <button
                  onClick={onRevoke}
                  disabled={actionBusy}
                  className="flex items-center justify-center p-2 rounded-lg border border-app-border bg-status-error/5 text-status-error hover:bg-status-error hover:text-white hover:border-status-error shadow-sm transition-all disabled:opacity-40"
                  title="Revocar voucher"
                >
                  {actionBusy ? <div className="h-4 w-4 border-2 border-white/50 border-t-white animate-spin rounded-full" /> : <X className="h-3.5 w-3.5" aria-hidden="true" />}
                </button>
              )}
            </>
          ) : (
            <div className="app-tag !px-3 !py-1 opacity-20 !bg-transparent border-dashed">Sin acciones</div>
          )}
        </div>
      </td>
    </tr>
  );
}
