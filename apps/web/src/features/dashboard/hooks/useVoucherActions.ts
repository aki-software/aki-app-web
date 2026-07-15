import { useState } from "react";
import { resendVoucherEmail, revokeVoucher } from "../api/dashboard";
import { WHATSAPP_BASE_URL } from "../../../config/app-config";
import type { VoucherData } from "../api/dashboard";

export const useVoucherActions = (onActionSuccess?: (message: string) => void, onActionError?: (message: string) => void) => {
  const [actionBusy, setActionBusy] = useState(false);
  const [copiedType, setCopiedType] = useState<"CODE" | "MAIL" | null>(null);

  const handleWhatsApp = (voucher: VoucherData) => {
    const message = encodeURIComponent(voucher.code);
    window.open(`${WHATSAPP_BASE_URL}?text=${message}`, "_blank");
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedType("CODE");
    setTimeout(() => setCopiedType(null), 2000);
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
    handleSendEmail,
    handleRevokeAction,
  };
};
