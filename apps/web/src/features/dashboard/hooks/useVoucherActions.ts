import { useState } from "react";
import { resendVoucherEmail, revokeVoucher } from "../api/dashboard";
import { WHATSAPP_BASE_URL } from "../../../config/app-config";
import type { VoucherData } from "../api/dashboard";

const formatVoucherCode = (code: string) => code.match(/.{1,4}/g)?.join("-") || code;

const formatExpiryDate = (expiresAt: VoucherData["expiresAt"]) => {
  if (!expiresAt) return null;
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
};

export const buildVoucherShareMessage = (voucher: VoucherData) => {
  const recipientName = voucher.assignedPatientName?.trim();
  const institutionName = voucher.ownerInstitutionName?.trim() || "A.kit";
  const expiryDate = formatExpiryDate(voucher.expiresAt);
  const lines = [
    recipientName ? `Hola ${recipientName},` : "Hola,",
    "",
    `${institutionName} te compartió un voucher para realizar tu orientación vocacional en A.kit.`,
    "",
    `Código de acceso: ${formatVoucherCode(voucher.code)}`,
  ];

  if (expiryDate) lines.push(`Vence: ${expiryDate}`);

  lines.push("", "Ingresá a A.kit y cargá este código para comenzar.");
  return lines.join("\n");
};

export const useVoucherActions = (onActionSuccess?: (message: string) => void, onActionError?: (message: string) => void) => {
  const [actionBusy, setActionBusy] = useState(false);
  const [copiedType, setCopiedType] = useState<"CODE" | "MESSAGE" | "MAIL" | null>(null);

  const handleWhatsApp = (voucher: VoucherData) => {
    const message = encodeURIComponent(buildVoucherShareMessage(voucher));
    window.open(`${WHATSAPP_BASE_URL}?text=${message}`, "_blank");
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedType("CODE");
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyMessage = async (voucher: VoucherData) => {
    try {
      await navigator.clipboard.writeText(buildVoucherShareMessage(voucher));
      setCopiedType("MESSAGE");
      onActionSuccess?.("Mensaje del voucher copiado.");
      setTimeout(() => setCopiedType(null), 2000);
    } catch {
      onActionError?.("No se pudo copiar el mensaje del voucher.");
    }
  };

  const handleSendEmail = async (voucherId: string, code: string, email: string, isResend: boolean): Promise<boolean> => {
    setActionBusy(true);
    try {
      const success = await resendVoucherEmail(voucherId, email);
      if (success) {
        setCopiedType("MAIL");
        const msg = isResend ? `Voucher ${code} reenviado por email.` : `Voucher ${code} enviado por email.`;
        if (onActionSuccess) onActionSuccess(msg);
        setTimeout(() => setCopiedType(null), 3000);
        return true;
      }
      if (onActionError) onActionError(`No se pudo enviar el voucher ${code} por email.`);
      return false;
    } catch {
      if (onActionError) onActionError("Error de red al enviar email.");
      return false;
    } finally {
      setActionBusy(false);
    }
  };

  const handleRevokeAction = async (voucherId: string, code: string): Promise<boolean> => {
    if (actionBusy) return false;
    const shouldRevoke = window.confirm(
      `Vas a revocar el voucher ${code}. Esta acción no se puede deshacer. ¿Continuar?`,
    );
    if (!shouldRevoke) return false;

    setActionBusy(true);
    try {
      const success = await revokeVoucher(voucherId);
      if (success) {
        if (onActionSuccess) onActionSuccess(`Voucher ${code} revocado.`);
        return true;
      }
      if (onActionError) onActionError(`No se pudo revocar el voucher ${code}.`);
      return false;
    } catch {
      if (onActionError) onActionError("Error de red al revocar voucher.");
      return false;
    } finally {
      setActionBusy(false);
    }
  };

  return {
    actionBusy,
    copiedType,
    handleWhatsApp,
    handleCopyCode,
    handleCopyMessage,
    handleSendEmail,
    handleRevokeAction,
  };
};
