import { useState } from "react";
import { Alert } from "../../../../components/atoms/Alert";
import { Button } from "../../../../components/atoms/Button";
import { Modal } from "../../../../components/atoms/Modal";
import type { CategoryData } from "../../api/dashboard";
import type { TresAreasCombinationItem } from "../../api/combinations.api";
import type { ContentFormValues } from "../../hooks/useContentEditor";
import { ChipInput } from "./ChipInput";

type Selection =
  | { kind: "category"; item: CategoryData }
  | { kind: "combination"; item: TresAreasCombinationItem };
interface ContentEditDialogProps {
  selection: Selection | null;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (values: ContentFormValues) => void;
}

const inputClass =
  "mt-1 w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text-main outline-none focus:border-app-primary focus:ring-2 focus:ring-app-primary/15";
const initialValues = (
  selection: Exclude<Selection, null>,
): ContentFormValues =>
  selection.kind === "category"
    ? {
        title: selection.item.title,
        description: selection.item.description,
        occupations: selection.item.occupations,
        formalProfessions: selection.item.formalProfessions,
        competencies: selection.item.competencies,
      }
    : {
        title: selection.item.title,
        narrative: selection.item.narrative,
        keyInsight: selection.item.keyInsight ?? "",
        tendencies: selection.item.tendencies,
        competencies: selection.item.competencies,
        possibleJobs: selection.item.possibleJobs
          ? selection.item.possibleJobs
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          : [],
        relatedProfessions: selection.item.relatedProfessions
          ? selection.item.relatedProfessions
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          : [],
        customSections: selection.item.customSections,
      };

export function ContentEditDialog({
  selection,
  saving,
  error,
  onClose,
  onSubmit,
}: ContentEditDialogProps) {
  const [tab, setTab] = useState("Contenido");
  const [values, setValues] = useState(() =>
    selection ? initialValues(selection) : null,
  );
  if (!selection || !values) return null;
  const isCategory = selection.kind === "category";
  const tabs = isCategory
    ? ["Contenido", "Listas"]
    : ["Contenido", "Listas", "Secciones adicionales"];
  const update = <K extends keyof ContentFormValues>(
    key: K,
    value: ContentFormValues[K],
  ) =>
    setValues((current) => (current ? { ...current, [key]: value } : current));
  const text = (
    key: "title" | "description" | "narrative" | "keyInsight",
    label: string,
    multiline = false,
  ) => (
    <label className="block text-sm font-semibold text-app-text-main">
      {label}
      {multiline ? (
        <textarea
          aria-label={label}
          value={values[key] ?? ""}
          onChange={(event) => update(key, event.target.value)}
          className={inputClass}
          rows={4}
        />
      ) : (
        <input
          aria-label={label}
          value={values[key] ?? ""}
          onChange={(event) => update(key, event.target.value)}
          className={inputClass}
        />
      )}
    </label>
  );

  return (
    <Modal
      isOpen
      onClose={onClose}
      isLoading={saving}
      title={isCategory ? "Editar dimensión" : "Editar combinación"}
      subtitle={
        isCategory
          ? `Código: ${selection.item.categoryId}`
          : `Clave: ${selection.item.combinationKey}`
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(values);
        }}
        className="space-y-5"
      >
        {error && <Alert type="error" message={error} />}
        <div
          role="tablist"
          aria-label="Secciones del editor"
          className="flex gap-1 border-b border-app-border"
        >
          {tabs.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={tab === item}
              onClick={() => setTab(item)}
              className={`px-3 py-2 text-sm font-semibold ${tab === item ? "border-b-2 border-app-primary text-app-primary" : "text-app-text-muted"}`}
            >
              {item}
            </button>
          ))}
        </div>
        {tab === "Contenido" && (
          <div className="space-y-4">
            {text("title", "Título")}
            {isCategory ? (
              text("description", "Descripción", true)
            ) : (
              <>
                {text("narrative", "Narrativa", true)}
                {text("keyInsight", "Idea principal", true)}
              </>
            )}
            <p className="text-xs text-app-text-muted">
              La identificación se muestra arriba y no se modifica.
            </p>
          </div>
        )}
        {tab === "Listas" && (
          <div className="space-y-5">
            {isCategory ? (
              <>
                <ChipInput
                  label="Ocupaciones"
                  value={values.occupations ?? []}
                  onChange={(value) => update("occupations", value)}
                />
                <ChipInput
                  label="Profesiones formales"
                  value={values.formalProfessions ?? []}
                  onChange={(value) => update("formalProfessions", value)}
                />
                <ChipInput
                  label="Competencias"
                  value={values.competencies}
                  onChange={(value) => update("competencies", value)}
                />
              </>
            ) : (
              <>
                <ChipInput
                  label="Tendencias"
                  value={values.tendencies ?? []}
                  onChange={(value) => update("tendencies", value)}
                />
                <ChipInput
                  label="Competencias"
                  value={values.competencies}
                  onChange={(value) => update("competencies", value)}
                />
                <ChipInput
                  label="Posibles trabajos"
                  hint="Se guardan separados por comas."
                  value={values.possibleJobs ?? []}
                  onChange={(value) => update("possibleJobs", value)}
                />
                <ChipInput
                  label="Profesiones relacionadas"
                  hint="Se guardan separadas por comas."
                  value={values.relatedProfessions ?? []}
                  onChange={(value) => update("relatedProfessions", value)}
                />
              </>
            )}
          </div>
        )}
        {tab === "Secciones adicionales" && (
          <div className="space-y-4">
            {(values.customSections ?? []).map((section, index) => (
              <div
                key={`${section.title}-${index}`}
                className="rounded-xl border border-app-border p-3 space-y-3"
              >
                <div className="flex gap-2">
                  <input
                    aria-label={`Título de sección ${index + 1}`}
                    value={section.title}
                    onChange={(event) =>
                      update(
                        "customSections",
                        values.customSections?.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, title: event.target.value }
                            : item,
                        ),
                      )
                    }
                    className="flex-1 rounded-lg border border-app-border bg-app-bg px-2 py-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      update(
                        "customSections",
                        values.customSections?.filter(
                          (_, itemIndex) => itemIndex !== index,
                        ),
                      )
                    }
                    className="text-xs font-semibold text-status-error focus-visible:outline focus-visible:outline-2 focus-visible:outline-app-primary"
                  >
                    Quitar sección
                  </button>
                </div>
                <ChipInput
                  label={`Elementos de ${section.title || "la sección"}`}
                  value={section.items}
                  onChange={(items) =>
                    update(
                      "customSections",
                      values.customSections?.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, items } : item,
                      ),
                    )
                  }
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                update("customSections", [
                  ...(values.customSections ?? []),
                  { title: "Nueva sección", items: [] },
                ])
              }
              className="rounded-lg border border-app-border px-3 py-2 text-sm font-semibold text-app-text-main focus-visible:outline focus-visible:outline-2 focus-visible:outline-app-primary"
            >
              Agregar sección
            </button>
          </div>
        )}
        <div className="flex justify-end gap-3 border-t border-app-border pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button type="submit" isLoading={saving}>
            Guardar cambios
          </Button>
        </div>
      </form>
    </Modal>
  );
}
