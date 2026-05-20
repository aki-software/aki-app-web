import { useState, useCallback } from "react";
import {
  fetchInstitutions,
  createInstitution,
  updateInstitution,
  updateInstitutionStatus,
  resendInstitutionActivationInvitation,
  createInstitutionOperationalAccount,
  type InstitutionOption,
} from "../api/dashboard";

export const useInstitutionsManager = () => {
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const notify = (msg: string, isError = false) => {
    setMessage(isError ? null : msg);
    setError(isError ? msg : null);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const data = await fetchInstitutions();
    setInstitutions(data);
    setLoading(false);
  }, []);

  const handleCreate = async (name: string, email: string, billingEmail?: string) => {
    notify("", false);
    setSaving(true);
    const created = await createInstitution({ name, email, billingEmail });
    setSaving(false);

    if (!created) {
      notify("No se pudo crear la institución.", true);
      return false;
    }
    
    await loadData();
    notify(created.activationEmailSent 
      ? `Institución ${created.name} creada y activación enviada.` 
      : `Institución ${created.name} creada (error de mail).`);
    return true;
  };

  const handleUpdate = async (id: string, form: { name: string; billingEmail?: string }) => {
    notify("", false);
    setSaving(true);
    const updated = await updateInstitution(id, form);
    setSaving(false);

    if (!updated) {
      notify("No se pudo actualizar la institución.", true);
      return false;
    }

    await loadData();
    notify(`Institución ${updated.name} actualizada.`);
    return true;
  };

  const handleToggleStatus = async (institution: InstitutionOption) => {
    notify("", false);
    setSaving(true);
    const success = await updateInstitutionStatus(institution.id, !institution.isActive);
    setSaving(false);

    if (!success) {
      notify(`No se pudo ${institution.isActive ? "desactivar" : "activar"} la institución.`, true);
      return false;
    }

    await loadData();
    notify(`Institución ${institution.name} ${!institution.isActive ? "activada" : "desactivada"}.`);
    return true;
  };

  const handleResendActivation = async (userId: string) => {
    setSaving(true);
    const success = await resendInstitutionActivationInvitation(userId);
    setSaving(false);
    
    if (success) notify("Invitación reenviada correctamente.");
    else notify("No se pudo reenviar la invitación.", true);
    return success;
  };

  const handleCreateOperational = async (institutionId: string, email: string) => {
    setSaving(true);
    const result = await createInstitutionOperationalAccount({ institutionId, email });
    setSaving(false);

    if (result) {
      notify("Cuenta operativa creada.");
      await loadData();
      return true;
    }
    
    notify("No se pudo crear la cuenta operativa.", true);
    return false;
  };

  return {
    institutions,
    loading,
    saving,
    message,
    error,
    loadData,
    notify,
    handleCreate,
    handleUpdate,
    handleToggleStatus,
    handleResendActivation,
    handleCreateOperational,
    clearMessages: () => notify("", false),
  };
};
