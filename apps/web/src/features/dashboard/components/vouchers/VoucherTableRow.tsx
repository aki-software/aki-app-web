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

function statusLabel(status: string) {
  switch (status) {
    case "AVAILABLE": return "Disponible";
    case "SENT": return "Enviado";
    case "USED": return "Canjeado";
    case "EXPIRED": return "Expirado";
    case "REVOKED": return "Revocado";
    default: return status;
  }
}

function statusClasses(status: string) {
  switch (status) {
    case "AVAILABLE": return "text-emerald-700 dark:text-emerald-300 border-emerald-500/40 bg-emerald-200/60 dark:bg-emerald-500/10 shadow-emerald-500/10";
    case "SENT": return "text-amber-700 dark:text-amber-300 border-amber-500/40 bg-amber-200/60 dark:bg-amber-500/10 shadow-amber-500/10";
    case "USED": return "text-rose-800 dark:text-rose-200 border-rose-600/50 bg-rose-300/70 dark:bg-rose-500/15 shadow-rose-500/10";
    case "EXPIRED": return "text-rose-600 dark:text-rose-300 border-rose-500/40 bg-rose-200/60 dark:bg-rose-500/10 shadow-rose-500/10";
    case "REVOKED": return "text-zinc-600 dark:text-zinc-300 border-zinc-500/30 bg-zinc-200/60 dark:bg-zinc-500/10 shadow-zinc-500/10";
    default: return "text-app-text-muted border-app-border bg-app-bg";
  }
}

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
            <Ticket className="h-4 w-4 text-app-bg" />
          </div>
          <span className="font-mono text-lg font-black text-app-text-main tracking-tight group-hover:text-app-primary transition-colors leading-none">
            {formatVoucherCode(voucher.code)}
          </span>
        </div>
      </td>

      <td className="px-5 py-4">
        <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shadow-sm transition-all group-hover:scale-105 ${statusClasses(voucher.status)} whitespace-nowrap`}>
          {voucher.status === "USED" && <BadgeCheck className="mr-1 h-3.5 w-3.5" />}
          {statusLabel(voucher.status)}
        </span>
      </td>

      {isAdmin && (
        <td className="px-5 py-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[10px] font-black text-app-text-main uppercase tracking-tight whitespace-nowrap">
              <Building2 className="h-3 w-3 text-app-primary/60" />
              {voucher.ownerInstitutionName || "Institución no informada"}
            </div>
            <div className="flex items-center gap-1.5 opacity-40">
              <UserRound className="h-3 w-3" />
              <span className="app-label lowercase tracking-normal">{voucher.ownerUserName}</span>
            </div>
          </div>
        </td>
      )}

      <td className="px-5 py-4">
        <div className="flex flex-col gap-1 text-[9px] font-bold text-app-text-muted uppercase tracking-tighter">
          <div className="flex items-center gap-1.5 opacity-60">
            <Calendar className="h-3 w-3" />
            Emision: {formatDate(voucher.createdAt)}
          </div>
          {voucher.redeemedAt && (
            <div className="flex items-center gap-1.5 text-app-primary font-black opacity-100 whitespace-nowrap">
              <BadgeCheck className="h-3 w-3" />
              Uso: {formatDate(voucher.redeemedAt)}
            </div>
          )}
          <div className="flex items-center gap-1.5 opacity-60">
            <Calendar className="h-3 w-3" />
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
                      <button onClick={() => setShowEmailInput(false)} disabled={actionBusy} className="text-app-text-muted hover:text-rose-500 transition-colors">
                        <X className="h-3 w-3" />
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
                        {actionBusy ? <div className="h-4 w-4 border-2 border-white/50 border-t-white animate-spin rounded-full" /> : <Send className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <button
                onClick={onCopyCode}
                disabled={actionBusy}
                className={`flex items-center justify-center p-2 rounded-lg border border-app-border transition-all disabled:opacity-40 ${copiedType === "CODE" ? "bg-emerald-500 text-white border-emerald-500" : "bg-app-bg text-app-text-muted hover:text-emerald-500 hover:border-emerald-500/20 shadow-sm"}`}
                title="Copiar código"
              >
                {copiedType === "CODE" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={onWhatsApp}
                disabled={actionBusy}
                className="flex items-center justify-center p-2 rounded-lg border border-app-border bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 shadow-sm transition-all disabled:opacity-40"
                title="WhatsApp"
              >
                <MessageCircle className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => (voucher.assignedPatientEmail ? onSendEmail() : setShowEmailInput(true))}
                disabled={actionBusy}
                className={`flex items-center justify-center p-2 rounded-lg border border-app-border transition-all disabled:opacity-40 ${copiedType === "MAIL" ? "bg-amber-500 text-white border-amber-500" : "bg-app-bg text-app-text-muted hover:text-amber-500 hover:border-amber-500/20 shadow-sm"}`}
                title={voucher.status === "SENT" ? "Reenviar por Email" : "Enviar por Email"}
              >
                {copiedType === "MAIL" ? <BadgeCheck className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
              </button>
              {voucher.status === "USED" && onViewSessions && (
                <button
                  onClick={onViewSessions}
                  disabled={actionBusy}
                  className="flex items-center justify-center p-2 rounded-lg border border-blue-500/20 bg-blue-500/5 text-blue-500 hover:bg-blue-500 hover:text-white hover:border-blue-500 shadow-sm transition-all disabled:opacity-40"
                  title="Ver sesiones"
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
              )}
              {canRevoke && (
                <button
                  onClick={onRevoke}
                  disabled={actionBusy}
                  className="flex items-center justify-center p-2 rounded-lg border border-app-border bg-rose-500/5 text-rose-600 hover:bg-rose-500 hover:text-white hover:border-rose-500 shadow-sm transition-all disabled:opacity-40"
                  title="Revocar voucher"
                >
                  {actionBusy ? <div className="h-4 w-4 border-2 border-white/50 border-t-white animate-spin rounded-full" /> : <X className="h-3.5 w-3.5" />}
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
