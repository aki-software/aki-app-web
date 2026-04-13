import {
    BadgeCheck,
    Building2,
    Calendar,
    Check,
    Copy,
    Mail,
    MessageCircle,
    ShieldBan,
    Send,
    Share2,
    Ticket,
    UserRound,
    X,
} from "lucide-react";
import { useState } from "react";
import type { VoucherData } from "../../api/dashboard";
import { resendVoucherEmail, revokeVoucher } from "../../api/dashboard";

function statusLabel(status: string) {
  switch (status) {
    case "AVAILABLE":
      return "Disponible";
    case "SENT":
      return "Enviado";
    case "USED":
      return "Canjeado";
    case "EXPIRED":
      return "Expirado";
    case "REVOKED":
      return "Revocado";
    default:
      return status;
  }
}

function statusClasses(status: string) {
  switch (status) {
    case "AVAILABLE":
      return "text-emerald-500 border-emerald-500/20 bg-emerald-500/5 shadow-emerald-500/10";
    case "SENT":
      return "text-amber-400 border-amber-400/20 bg-amber-400/5 shadow-amber-400/10";
    case "USED":
      return "text-app-primary border-app-primary/20 bg-app-primary/5 shadow-app-primary/10";
    case "EXPIRED":
      return "text-rose-500 border-rose-500/20 bg-rose-500/5 shadow-rose-500/10";
    case "REVOKED":
      return "text-zinc-400 border-zinc-500/20 bg-zinc-500/5 shadow-zinc-500/10";
    default:
      return "text-app-text-muted border-app-border bg-app-bg";
  }
}

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

interface Props {
  voucher: VoucherData;
  isAdmin?: boolean;
  onVoucherUpdated?: (result: { ok: boolean; message: string }) => void | Promise<void>;
}

export function VoucherTableRow({ voucher, isAdmin, onVoucherUpdated }: Props) {
  const [copiedType, setCopiedType] = useState<"CODE" | "LINK" | "MAIL" | null>(
    null,
  );
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [customEmail, setCustomEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const testUrl = `https://akit-test.com/v/${voucher.code}`;
  const canSendOrResend = voucher.status === "AVAILABLE" || voucher.status === "SENT";
  const canRevoke = voucher.status === "AVAILABLE" || voucher.status === "SENT";
  const actionBusy = sendingEmail || revoking;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(voucher.code);
    setCopiedType("CODE");
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(testUrl);
    setCopiedType("LINK");
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      `Hola! Este es tu código para realizar el test vocacional en A.kit: ${voucher.code}\n\nPodés ingresar directamente aquí: ${testUrl}`,
    );
    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  const notifyVoucherUpdate = async (ok: boolean, message: string) => {
    if (!onVoucherUpdated) {
      return;
    }
    await onVoucherUpdated({ ok, message });
  };

  const handleSendEmail = async (emailToUse?: string) => {
    if (!canSendOrResend) return;
    const target = emailToUse || voucher.assignedPatientEmail || customEmail;
    if (!target && !showEmailInput) {
      setShowEmailInput(true);
      return;
    }
    if (!target) return;
    setSendingEmail(true);
    const success = await resendVoucherEmail(voucher.id, target);
    setSendingEmail(false);
    if (success) {
      setCopiedType("MAIL");
      setShowEmailInput(false);
      setCustomEmail("");
      await notifyVoucherUpdate(
        true,
        voucher.status === "SENT"
          ? `Voucher ${voucher.code} reenviado por email.`
          : `Voucher ${voucher.code} enviado por email.`,
      );
      setTimeout(() => setCopiedType(null), 3000);
      return;
    }
    await notifyVoucherUpdate(
      false,
      `No se pudo enviar el voucher ${voucher.code} por email.`,
    );
  };

  const handleRevoke = async () => {
    if (!canRevoke || actionBusy) return;
    const shouldRevoke = window.confirm(
      `Vas a revocar el voucher ${voucher.code}. Esta acción no se puede deshacer. ¿Continuar?`,
    );
    if (!shouldRevoke) return;
    setRevoking(true);
    const success = await revokeVoucher(voucher.id);
    setRevoking(false);
    if (success) {
      await notifyVoucherUpdate(true, `Voucher ${voucher.code} revocado.`);
      return;
    }
    await notifyVoucherUpdate(
      false,
      `No se pudo revocar el voucher ${voucher.code}.`,
    );
  };

  return (
    <tr className="border-b border-app-border last:border-0 hover:bg-app-bg/20 transition-all duration-300 group">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-app-text-main p-2.5 border border-app-text-main shadow-lg group-hover:scale-105 transition-transform">
            <Ticket className="h-4 w-4 text-app-surface" />
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-lg font-black text-app-text-main tracking-tight group-hover:text-app-primary transition-colors leading-none">
              {voucher.code}
            </span>
            <span className="app-label opacity-40 mt-1">Código único</span>
          </div>
        </div>
      </td>

      <td className="px-5 py-4">
        <span
          className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shadow-sm transition-all group-hover:scale-105 ${statusClasses(voucher.status)} whitespace-nowrap`}
        >
          {voucher.status === "USED" && (
            <BadgeCheck className="mr-1 h-3.5 w-3.5" />
          )}
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
              <span className="app-label lowercase tracking-normal">
                {voucher.ownerUserName}
              </span>
            </div>
          </div>
        </td>
      )}

      <td className="px-5 py-4">
        {isAdmin ? (
          <span className="app-label opacity-20 italic">Oculto para admin</span>
        ) : voucher.assignedPatientName ? (
          <div className="flex flex-col gap-0.5 px-3 py-1.5 rounded-lg bg-app-bg border border-app-border/40 group-hover:border-app-primary/20 transition-all">
            <span className="text-[10px] font-black text-app-text-main uppercase tracking-tight line-clamp-1">
              {voucher.assignedPatientName}
            </span>
            <span className="text-[9px] font-bold text-app-text-muted opacity-40 line-clamp-1 italic">
              {voucher.assignedPatientEmail}
            </span>
          </div>
        ) : (
          <span className="app-label opacity-20 italic">Sin asignar</span>
        )}
      </td>

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
            Venc.: {formatDate(voucher.expiresAt)}
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
                      <span className="app-label opacity-60">
                        INGRESAR DESTINATARIO
                      </span>
                      <button
                        onClick={() => setShowEmailInput(false)}
                        disabled={actionBusy}
                        className="text-app-text-muted hover:text-rose-500 transition-colors"
                        aria-label="Cerrar envío por email"
                        title="Cerrar"
                      >
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
                        onClick={() => handleSendEmail(customEmail)}
                        aria-label="Enviar voucher por email"
                        title="Enviar por email"
                        className="p-3 bg-app-primary text-white rounded-lg hover:bg-app-primary-hover shadow-lg shadow-app-primary/20 disabled:opacity-30 transition-all active:scale-90"
                      >
                        {sendingEmail ? (
                          <div className="h-4 w-4 border-2 border-white/50 border-t-white animate-spin rounded-full" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <button
                onClick={handleCopyCode}
                disabled={actionBusy}
                aria-label="Copiar código del voucher"
                className={`flex items-center justify-center p-2 rounded-lg border border-app-border transition-all disabled:opacity-40 ${copiedType === "CODE" ? "bg-emerald-500 text-white border-emerald-500" : "bg-app-bg text-app-text-muted hover:text-emerald-500 hover:border-emerald-500/20 shadow-sm"}`}
                title="Copiar código"
              >
                {copiedType === "CODE" ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                onClick={handleCopyLink}
                disabled={actionBusy}
                aria-label="Copiar enlace directo"
                className={`flex items-center justify-center p-2 rounded-lg border border-app-border transition-all disabled:opacity-40 ${copiedType === "LINK" ? "bg-app-primary text-white border-app-primary" : "bg-app-bg text-app-text-muted hover:text-app-primary hover:border-app-primary/20 shadow-sm"}`}
                title="Copiar link directo"
              >
                {copiedType === "LINK" ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Share2 className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                onClick={handleWhatsApp}
                disabled={actionBusy}
                aria-label="Compartir por WhatsApp"
                className="flex items-center justify-center p-2 rounded-lg border border-app-border bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 shadow-sm transition-all disabled:opacity-40"
                title="WhatsApp"
              >
                <MessageCircle className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleSendEmail()}
                disabled={actionBusy}
                aria-label={
                  voucher.status === "SENT"
                    ? "Reenviar voucher por correo"
                    : "Enviar voucher por correo"
                }
                className={`flex items-center justify-center p-2 rounded-lg border border-app-border transition-all disabled:opacity-40 ${copiedType === "MAIL" ? "bg-amber-500 text-white border-amber-500" : "bg-app-bg text-app-text-muted hover:text-amber-500 hover:border-amber-500/20 shadow-sm"}`}
                title={voucher.status === "SENT" ? "Reenviar por Email" : "Enviar por Email"}
              >
                {copiedType === "MAIL" ? (
                  <BadgeCheck className="h-3.5 w-3.5" />
                ) : (
                  <Mail className="h-3.5 w-3.5" />
                )}
              </button>
              {canRevoke && (
                <button
                  onClick={handleRevoke}
                  disabled={actionBusy}
                  aria-label="Revocar voucher"
                  className="flex items-center justify-center p-2 rounded-lg border border-rose-500/20 bg-rose-500/5 text-rose-500 hover:bg-rose-500 hover:text-white hover:border-rose-500 shadow-sm transition-all disabled:opacity-40"
                  title="Revocar voucher"
                >
                  {revoking ? (
                    <div className="h-3.5 w-3.5 border-2 border-rose-200/50 border-t-current animate-spin rounded-full" />
                  ) : (
                    <ShieldBan className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </>
          ) : (
            <div className="app-tag !px-3 !py-1 opacity-20 !bg-transparent border-dashed">
              Sin acciones
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
