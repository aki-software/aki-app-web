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
    const success = await updateInstitutionStatus(institution.id, !institution.responsibleTherapistActive);
    setSaving(false);

    if (!success) return notify(`Error al cambiar estado de ${institution.name}.`, true);
    await loadData();
    notify(`Estado de ${institution.name} actualizado.`);
  };

  const handleResendAuth = async (institution: InstitutionOption) => {
    if (!institution.responsibleTherapistUserId) {
      return notify("No hay cuenta operativa asignada.", true);
    }
    notify("", false);
    const sent = await resendInstitutionActivationInvitation(institution.responsibleTherapistUserId);
    if (!sent) return notify("Fallo al reenviar invitación.", true);
    notify("Invitación reenviada.");
  };

  const handleCreateAuth = async (institutionId: string, email: string) => {
    notify("", false);
    const created = await createInstitutionOperationalAccount({ institutionId, email });
    if (!created) return notify("Error al crear cuenta.", true);
    await loadData();
    notify("Cuenta operativa creada.");
  };

  return {
    institutions, loading, saving, message, error, notify,
    loadData, handleCreate, handleUpdate, handleToggleStatus, handleResendAuth, handleCreateAuth
  };
};