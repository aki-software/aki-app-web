import { useState } from "react";
import {
  updateCategory,
  type CategoryUpdatePayload,
} from "../api/categories.api";
import {
  updateCombination,
  type CombinationUpdatePayload,
  type TresAreasCombinationItem,
} from "../api/combinations.api";
import type { CategoryData } from "../api/dashboard";
import { invalidateCategoriesCache } from "./useCategories";

export interface ContentFormValues {
  title: string;
  description?: string;
  occupations?: string[];
  formalProfessions?: string[];
  competencies: string[];
  narrative?: string;
  tendencies?: string[];
  keyInsight?: string;
  possibleJobs?: string[];
  relatedProfessions?: string[];
  customSections?: { title: string; items: string[] }[];
}
type Selection =
  | { kind: "category"; item: CategoryData }
  | { kind: "combination"; item: TresAreasCombinationItem };
interface ContentEditorCallbacks {
  onCategorySaved: (item: CategoryData) => void;
  onCombinationSaved: (item: TresAreasCombinationItem) => void;
}

export function useContentEditor({
  onCategorySaved,
  onCombinationSaved,
}: ContentEditorCallbacks) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const close = () => !saving && (setSelection(null), setError(""));
  const submit = async (values: ContentFormValues) => {
    if (!selection) return;
    setSaving(true);
    setError("");
    try {
      if (selection.kind === "category") {
        const payload: CategoryUpdatePayload = {
          title: values.title,
          description: values.description,
          occupations: values.occupations,
          formalProfessions: values.formalProfessions,
          competencies: values.competencies,
        };
        const result = await updateCategory(selection.item.categoryId, payload);
        invalidateCategoriesCache();
        onCategorySaved(result);
      } else {
        const payload: CombinationUpdatePayload = {
          title: values.title,
          narrative: values.narrative,
          tendencies: values.tendencies,
          competencies: values.competencies,
          keyInsight: values.keyInsight,
          possibleJobs: values.possibleJobs?.join(", "),
          relatedProfessions: values.relatedProfessions?.join(", "),
          customSections: values.customSections,
        };
        const result = await updateCombination(selection.item.id, payload);
        onCombinationSaved(result);
      }
      setSelection(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudieron guardar los cambios.",
      );
    } finally {
      setSaving(false);
    }
  };
  return {
    selection,
    saving,
    error,
    openCategory: (item: CategoryData) =>
      setSelection({ kind: "category", item }),
    openCombination: (item: TresAreasCombinationItem) =>
      setSelection({ kind: "combination", item }),
    close,
    submit,
  };
}
