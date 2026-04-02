import { Building2, UserPlus } from "lucide-react";
import { type FormEvent } from "react";
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
    <div className="app-card !p-6">
      <div className="mb-4 flex items-center">
        {formState.entityType === "INSTITUTION" ? (
          <Building2 className="mr-2 h-5 w-5 text-app-primary" />
        ) : (
          <UserPlus className="mr-2 h-5 w-5 text-app-primary" />
        )}
        <h3 className="font-semibold text-app-text-main">
          Crear{" "}
          {formState.entityType === "INSTITUTION" ? "institución" : "terapeuta"}
        </h3>
      </div>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-app-text-muted">Tipo</span>
            <select
              value={formState.entityType}
              onChange={(e) =>
                handleEntityTypeChange(e.target.value as EntityType)
              }
              className="app-select w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text-main outline-none focus:border-app-primary focus:ring-2 focus:ring-app-primary/25"
            >
              <option value="INSTITUTION">Institución</option>
              <option value="THERAPIST">Terapeuta</option>
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-app-text-muted">Nombre</span>
            <input
              type="text"
              value={formState.name}
              onChange={(e) => updateForm("name", e.target.value)}
              className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text-main outline-none focus:border-app-primary focus:ring-2 focus:ring-app-primary/25"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium text-app-text-muted">
              {formState.entityType === "INSTITUTION"
                ? "Email de facturación"
                : "Email"}
            </span>
            <input
              type="email"
              value={formState.email}
              onChange={(e) => updateForm("email", e.target.value)}
              className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text-main outline-none focus:border-app-primary focus:ring-2 focus:ring-app-primary/25"
            />
          </label>

          {formState.entityType === "THERAPIST" ? (
            <label className="space-y-1 text-sm">
              <span className="font-medium text-app-text-muted">
                Institucion
              </span>
              <select
                value={formState.institutionId}
                onChange={(e) => updateForm("institutionId", e.target.value)}
                className="app-select w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text-main outline-none focus:border-app-primary focus:ring-2 focus:ring-app-primary/25"
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
                <span className="font-medium text-app-text-muted">
                  Responsable institucional
                </span>
                <input
                  type="text"
                  value={formState.responsibleName}
                  onChange={(e) =>
                    updateForm("responsibleName", e.target.value)
                  }
                  className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text-main outline-none focus:border-app-primary focus:ring-2 focus:ring-app-primary/25"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-app-text-muted">
                  Email del responsable
                </span>
                <input
                  type="email"
                  value={formState.responsibleEmail}
                  onChange={(e) =>
                    updateForm("responsibleEmail", e.target.value)
                  }
                  className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text-main outline-none focus:border-app-primary focus:ring-2 focus:ring-app-primary/25"
                />
              </label>
            </>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="app-button-primary disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Crear"}
          </button>
        </div>
      </form>
    </div>
  );
}
