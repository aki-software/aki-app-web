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
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatVoucherCode(code: string) {
  if (!code) return "";
  return code.match(/.{1,4}/g)?.join("-") || "";
}

interface VoucherCardMobileProps {
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

export function VoucherCardMobile({
  voucher,
  isAdmin,
  copiedType,
  actionBusy,
  onWhatsApp,
  onCopyCode,
  onSendEmail,
  onRevoke,
  onViewSessions,
}: VoucherCardMobileProps) {
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
    <div className="app-card !p-5 flex flex-col gap-4 border-app-border bg-app-surface shadow-md">
      {/* Header: Code + Badge */}
      <div className="flex items-center justify-between gap-2 border-b border-app-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-app-text-main p-2 text-app-bg">
            <Ticket className="h-4 w-4" aria-hidden="true" />
          </div>
          <span className="font-mono text-base font-black text-app-text-main tracking-tight">
            {formatVoucherCode(voucher.code)}
          </span>
        </div>
        <StatusBadge status={voucher.status} type="voucher" />
      </div>

      {/* Admin details if applicable */}
      {isAdmin && (
        <div className="flex flex-col gap-1 text-xs text-app-text-muted bg-app-bg/50 p-2.5 rounded-xl border border-app-border/50">
          <div className="flex items-center gap-1.5 font-bold text-app-text-main">
            <Building2 className="h-3.5 w-3.5 text-app-primary/70" aria-hidden="true" />
            {voucher.ownerInstitutionName || "Institución no informada"}
          </div>
          {voucher.ownerUserName && (
            <div className="flex items-center gap-1.5 text-[11px] opacity-75">
              <UserRound className="h-3 w-3" aria-hidden="true" />
              {voucher.ownerUserName}
            </div>
          )}
        </div>
      )}

      {/* Dates Metadata */}
      <div className="grid grid-cols-2 gap-2 text-[11px] text-app-text-muted">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
          <span>Emisión: <strong className="text-app-text-main">{formatDate(voucher.createdAt)}</strong></span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
          <span>Vence: <strong className="text-app-text-main">{formatDate(voucher.expiresAt ?? null)}</strong></span>
        </div>
        {voucher.redeemedAt && (
          <div className="col-span-2 flex items-center gap-1.5 text-app-primary font-bold">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Usado el {formatDate(voucher.redeemedAt)}</span>
          </div>
        )}
      </div>

      {/* Email Input if active */}
      {showEmailInput && (
        <div className="p-3 bg-app-bg rounded-xl border border-app-primary flex flex-col gap-2 animate-in fade-in">
          <div className="flex items-center justify-between text-xs font-semibold text-app-text-muted">
            <span>Ingresar email de destino</span>
            <button onClick={() => setShowEmailInput(false)} className="text-app-text-muted hover:text-status-error">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="email"
              placeholder="alumno@ejemplo.com"
              value={customEmail}
              onChange={(e) => setCustomEmail(e.target.value)}
              className="flex-1 bg-app-surface rounded-lg px-3 py-2 text-xs font-bold border border-app-border focus:border-app-primary outline-none text-app-text-main"
              autoFocus
            />
            <button
              disabled={actionBusy || !customEmail}
              onClick={handleEmailSubmit}
              className="px-3 py-2 bg-app-primary text-white rounded-lg text-xs font-bold disabled:opacity-40 flex items-center gap-1 cursor-pointer"
            >
              <Send className="h-3 w-3" />
              Enviar
            </button>
          </div>
        </div>
      )}

      {/* Actions Toolbar */}
      {!isAdmin && (canSendOrResend || canRevoke || (voucher.status === "USED" && onViewSessions)) && (
        <div className="flex items-center justify-end gap-2 border-t border-app-border/60 pt-3">
          <button
            onClick={onCopyCode}
            disabled={actionBusy}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              copiedType === "CODE"
                ? "bg-status-success text-white border-status-success"
                : "bg-app-bg border-app-border text-app-text-muted hover:text-app-text-main"
            }`}
          >
            {copiedType === "CODE" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span>Copiar</span>
          </button>

          <button
            onClick={onWhatsApp}
            disabled={actionBusy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-status-success/30 bg-status-success/10 text-status-success hover:bg-status-success hover:text-white transition-all cursor-pointer"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span>WhatsApp</span>
          </button>

          <button
            onClick={() => (voucher.assignedPatientEmail ? onSendEmail() : setShowEmailInput(true))}
            disabled={actionBusy}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              copiedType === "MAIL"
                ? "bg-status-warning text-white border-status-warning"
                : "bg-app-bg border-app-border text-app-text-muted hover:text-app-text-main"
            }`}
          >
            {copiedType === "MAIL" ? <BadgeCheck className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
            <span>Email</span>
          </button>

          {voucher.status === "USED" && onViewSessions && (
            <button
              onClick={onViewSessions}
              disabled={actionBusy}
              className="p-2 rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-all cursor-pointer"
              title="Ver sesiones"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}

          {canRevoke && (
            <button
              onClick={onRevoke}
              disabled={actionBusy}
              className="p-2 rounded-xl border border-status-error/20 bg-status-error/10 text-status-error hover:bg-status-error hover:text-white transition-all ml-auto cursor-pointer"
              title="Revocar voucher"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
