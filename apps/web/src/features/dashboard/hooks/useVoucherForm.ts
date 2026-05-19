import { useState, type FormEvent } from "react";
import { createVoucher, type TherapistOption } from "../api/dashboard";
import { initialFormState, type VoucherFormState } from "../components/vouchers/VoucherEmitForm.types";

export const useVoucherForm = (therapists: TherapistOption[]) => {
  const [formState, setFormState] = useState<VoucherFormState>(initialFormState);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleEmitVoucher = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formState.ownerInstitutionId) {
      setError("Selecciona una institución antes de emitir el lote.");
      return null;
    }

    if (formState.ownerUserId) {
      const selectedTherapist = therapists.find((t) => t.id === formState.ownerUserId);
      if (!selectedTherapist || selectedTherapist.institutionId !== formState.ownerInstitutionId) {
        setError("La cuenta operativa seleccionada no pertenece a la institución elegida.");
        return null;
      }
    }

    setSaving(true);
    try {
      const result = await createVoucher({
        ownerType: "INSTITUTION",
        ownerInstitutionId: formState.ownerInstitutionId,
        ownerUserId: formState.ownerUserId || undefined,
        quantity: Number(formState.quantity || "1"),
        expiresAt: formState.expiresAt || undefined,
      });

      if (result) {
        setSuccess(`Lote emitido correctamente (${result.createdCount} voucher${result.createdCount === 1 ? "" : "s"}).`);
        setFormState(initialFormState);
        return result;
      }
      setError("No se pudo emitir el lote. Verifica los datos e intenta nuevamente.");
      return null;
    } catch {
      setError("Error inesperado al emitir el lote.");
      return null;
    } finally {
      setSaving(false);
    }
  };

  return {
    formState,
    setFormState,
    saving,
    error,
    success,
    handleEmitVoucher,
    resetFormMessages: () => { setError(null); setSuccess(null); }
  };
};
