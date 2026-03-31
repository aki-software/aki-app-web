import { type FormEvent } from "react";
import { Building2, UserPlus } from "lucide-react";
import type { InstitutionOption } from "../../api/dashboard";

export type EntityType = "INSTITUTION" | "THERAPIST";

export type EntityFormState = {
  entityType: EntityType;
  name: string;
  email: string;
  institutionId: string;
  responsibleName: string;
  responsibleEmail: string;
};

export const initialFormState: EntityFormState = {
  entityType: "INSTITUTION",
  name: "",
  email: "",
  institutionId: "",
  responsibleName: "",
  responsibleEmail: "",
};

interface Props {
  formState: EntityFormState;
  setFormState: React.Dispatch<React.SetStateAction<EntityFormState>>;
  institutions: InstitutionOption[];
  saving: boolean;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  resetMessages: () => void;
}

export function CreateEntityForm({
  formState,
  setFormState,
  institutions,
  saving,
  onSubmit,
  resetMessages,
}: Props) {
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

  const updateForm = (field: keyof EntityFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  return (
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
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-200">Tipo</span>
            <select
              value={formState.entityType}
              onChange={(e) => handleEntityTypeChange(e.target.value as EntityType)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            >
              <option value="INSTITUTION">Institución</option>
              <option value="THERAPIST">Terapeuta</option>
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-200">Nombre</span>
            <input
              type="text"
              value={formState.name}
              onChange={(e) => updateForm("name", e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-200">
              {formState.entityType === "INSTITUTION" ? "Email de facturación" : "Email"}
            </span>
            <input
              type="email"
              value={formState.email}
              onChange={(e) => updateForm("email", e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </label>

          {formState.entityType === "THERAPIST" ? (
            <label className="space-y-1 text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-200">Institución</span>
              <select
                value={formState.institutionId}
                onChange={(e) => updateForm("institutionId", e.target.value)}
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
                  onChange={(e) => updateForm("responsibleName", e.target.value)}
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
                  onChange={(e) => updateForm("responsibleEmail", e.target.value)}
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
  );
}
