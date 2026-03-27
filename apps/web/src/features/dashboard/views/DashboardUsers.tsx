import { type FormEvent, useEffect, useState } from "react";
import { Building2, Mail, UserPlus, Users as UsersIcon } from "lucide-react";
import {
  createInstitution,
  createTherapist,
  fetchInstitutions,
  fetchTherapists,
  resendActivationInvitation,
  type InstitutionOption,
  type TherapistOption,
} from "../api/dashboard";

type EntityType = "INSTITUTION" | "THERAPIST";

type EntityFormState = {
  entityType: EntityType;
  name: string;
  email: string;
  institutionId: string;
  responsibleName: string;
  responsibleEmail: string;
};

const initialFormState: EntityFormState = {
  entityType: "INSTITUTION",
  name: "",
  email: "",
  institutionId: "",
  responsibleName: "",
  responsibleEmail: "",
};

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

  const updateForm = (field: keyof EntityFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleEntityTypeChange = (value: EntityType) => {
    resetMessages();
    setFormState({
      entityType: value,
      name: "",
      email: "",
      institutionId: "",
      responsibleName: "",
      responsibleEmail: "",
    });
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
      setErrorMessage(
        `No se pudo reenviar la invitación a ${therapist.name}.`
      );
      return;
    }

    setMessage(`Invitación reenviada a ${therapist.name}.`);
  };

  const statusBadge = (isActive?: boolean) =>
    isActive ? (
      <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
        Activo
      </span>
    ) : (
      <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
        Pendiente
      </span>
    );

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

      {message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          <div>{message}</div>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {errorMessage}
        </div>
      ) : null}

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex items-center">
          {formState.entityType === "INSTITUTION" ? (
            <Building2 className="mr-2 h-5 w-5 text-blue-600" />
          ) : (
            <UserPlus className="mr-2 h-5 w-5 text-blue-600" />
          )}
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Crear {formState.entityType === "INSTITUTION" ? "institución" : "terapeuta"}
          </h3>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-200">
                Tipo
              </span>
              <select
                value={formState.entityType}
                onChange={(event) =>
                  handleEntityTypeChange(event.target.value as EntityType)
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              >
                <option value="INSTITUTION">Institución</option>
                <option value="THERAPIST">Terapeuta</option>
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-200">
                Nombre
              </span>
              <input
                type="text"
                value={formState.name}
                onChange={(event) => updateForm("name", event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-200">
                {formState.entityType === "INSTITUTION"
                  ? "Email de facturación"
                  : "Email"}
              </span>
              <input
                type="email"
                value={formState.email}
                onChange={(event) => updateForm("email", event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </label>

            {formState.entityType === "THERAPIST" ? (
              <label className="space-y-1 text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  Institución
                </span>
                <select
                  value={formState.institutionId}
                  onChange={(event) =>
                    updateForm("institutionId", event.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                >
                  <option value="">Crear consultorio privado automático</option>
                  {institutions.map((institution) => (
                    <option key={institution.id} value={institution.id}>
                      {institution.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <>
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-200">
                    Responsable institucional
                  </span>
                  <input
                    type="text"
                    value={formState.responsibleName}
                    onChange={(event) =>
                      updateForm("responsibleName", event.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-200">
                    Email del responsable
                  </span>
                  <input
                    type="email"
                    value={formState.responsibleEmail}
                    onChange={(event) =>
                      updateForm("responsibleEmail", event.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </label>
              </>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60 dark:bg-white dark:text-gray-900"
            >
              {saving ? "Guardando..." : "Crear"}
            </button>
          </div>
        </form>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
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
                <div
                  key={institution.id}
                  className="rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40"
                >
                  <div className="font-medium text-gray-900 dark:text-white">
                    {institution.name}
                  </div>
                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Facturación: {institution.billingEmail ?? "No informada"}
                  </div>
                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Responsable: {institution.responsibleTherapistName ?? "Sin asignar"}
                  </div>
                  {institution.responsibleTherapistName ? (
                    <div className="mt-2">
                      {statusBadge(institution.responsibleTherapistActive)}
                    </div>
                  ) : null}
                </div>
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
                <div
                  key={therapist.id}
                  className="rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {therapist.name}
                      </div>
                      <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {therapist.email ?? "Sin email"}
                      </div>
                    </div>
                    {statusBadge(therapist.isActive)}
                  </div>
                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Institución: {therapist.institutionName ?? "Consultorio propio"}
                  </div>
                  {!therapist.isActive ? (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => handleResend(therapist)}
                        disabled={resendingUserId === therapist.id}
                        className="inline-flex items-center rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-60 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/30"
                      >
                        <Mail className="mr-1.5 h-3.5 w-3.5" />
                        {resendingUserId === therapist.id
                          ? "Reenviando..."
                          : "Reenviar invitación"}
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
