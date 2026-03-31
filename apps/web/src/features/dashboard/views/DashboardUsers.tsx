import { type FormEvent, useEffect, useState } from "react";
import { Building2, Users as UsersIcon } from "lucide-react";
import {
  createInstitution,
  createTherapist,
  fetchInstitutions,
  fetchTherapists,
  resendActivationInvitation,
  type InstitutionOption,
  type TherapistOption,
} from "../api/dashboard";
import { CreateEntityForm, initialFormState, type EntityFormState } from "../components/users/CreateEntityForm";
import { InstitutionCard } from "../components/users/InstitutionCard";
import { TherapistCard } from "../components/users/TherapistCard";

export function DashboardUsers() {
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [therapists, setTherapists] = useState<TherapistOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resendingUserId, setResendingUserId] = useState<string | null>(null);
  const [formState, setFormState] = useState<EntityFormState>(initialFormState);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    const [institutionsData, therapistsData] = await Promise.all([
      fetchInstitutions(),
      fetchTherapists(),
    ]);
    setInstitutions(institutionsData);
    setTherapists(therapistsData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetMessages = () => {
    setMessage(null);
    setErrorMessage(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetMessages();

    if (!formState.name.trim()) {
      setErrorMessage("Ingresá un nombre.");
      return;
    }

    setSaving(true);

    if (formState.entityType === "INSTITUTION") {
      if (!formState.responsibleName.trim() || !formState.responsibleEmail.trim()) {
        setSaving(false);
        setErrorMessage("Ingresá nombre y email del responsable institucional.");
        return;
      }

      const created = await createInstitution({
        name: formState.name,
        billingEmail: formState.email || undefined,
        responsibleName: formState.responsibleName || undefined,
        responsibleEmail: formState.responsibleEmail || undefined,
      });
      setSaving(false);

      if (!created) {
        setErrorMessage("No se pudo crear la institución.");
        return;
      }

      setFormState(initialFormState);
      await loadData();
      setMessage(
        created.activationEmailSent
          ? `Institución ${created.name} creada. Se envió activación al responsable.`
          : `Institución ${created.name} creada, pero no se pudo enviar el mail al responsable.`
      );
      return;
    }

    const created = await createTherapist({
      name: formState.name,
      email: formState.email || undefined,
      institutionId: formState.institutionId || undefined,
    });
    setSaving(false);

    if (!created) {
      setErrorMessage("No se pudo crear el terapeuta.");
      return;
    }

    setFormState(initialFormState);
    await loadData();
    setMessage(
      created.activationEmailSent
        ? `Terapeuta ${created.name} creado. Se envió un mail de activación a la dirección informada.`
        : `Terapeuta ${created.name} creado, pero no se pudo enviar el mail de activación.`
    );
  };

  const handleResend = async (therapist: TherapistOption) => {
    resetMessages();
    setResendingUserId(therapist.id);
    const sent = await resendActivationInvitation(therapist.id);
    setResendingUserId(null);

    if (!sent) {
      setErrorMessage(`No se pudo reenviar la invitación a ${therapist.name}.`);
      return;
    }

    setMessage(`Invitación reenviada a ${therapist.name}.`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Instituciones y terapeutas
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Alta mínima de owners operativos. Cada institución se crea junto con su
          usuario responsable, que recibe activación por mail.
        </p>
      </div>

      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          <div>{message}</div>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {errorMessage}
        </div>
      )}

      <CreateEntityForm
        formState={formState}
        setFormState={setFormState}
        institutions={institutions}
        saving={saving}
        onSubmit={handleSubmit}
        resetMessages={resetMessages}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center">
            <Building2 className="mr-2 h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Instituciones
            </h3>
          </div>
          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Cargando...</p>
          ) : (
            <div className="space-y-3">
              {institutions.map((institution) => (
                <InstitutionCard key={institution.id} institution={institution} />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center">
            <UsersIcon className="mr-2 h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Terapeutas
            </h3>
          </div>
          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Cargando...</p>
          ) : (
            <div className="space-y-3">
              {therapists.map((therapist) => (
                <TherapistCard
                  key={therapist.id}
                  therapist={therapist}
                  onResend={handleResend}
                  isResending={resendingUserId === therapist.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
