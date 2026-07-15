import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, List, ListOrdered, Save, X, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { TresAreasCombinationItem } from "../api/combinations.api";

interface CombinationEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  combination: TresAreasCombinationItem;
  onSave: (id: string, payload: {
    narrative: string;
    tendencies: string[];
    possibleJobs: string;
    relatedProfessions: string;
    customSections: { title: string; items: string[] }[];
  }) => Promise<void>;
}

export const CombinationEditModal = ({
  isOpen,
  onClose,
  combination,
  onSave,
}: CombinationEditModalProps) => {
  const [tendencies, setTendencies] = useState<string[]>(combination.tendencies || []);
  const [possibleJobs, setPossibleJobs] = useState<string[]>(
    (combination.possibleJobs || "").split(",").map(s => s.trim()).filter(Boolean)
  );
  const [relatedProfessions, setRelatedProfessions] = useState<string[]>(
    (combination.relatedProfessions || "").split(",").map(s => s.trim()).filter(Boolean)
  );
  // Re-map customSections if it was stored as `{ title, content }` in DB previously during tests
  const [customSections, setCustomSections] = useState<{ title: string; items: string[] }[]>(
    (combination.customSections || []).map((sec: { title?: string; items?: string[]; content?: string }) => ({
      title: sec.title || "",
      items: sec.items || (sec.content ? [sec.content.replace(/<[^>]*>?/gm, "")] : [])
    }))
  );
  const [isSaving, setIsSaving] = useState(false);

  const mainEditor = useEditor({
    extensions: [StarterKit],
    content: combination.narrative,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[120px] outline-none text-app-text-main px-4 py-3 bg-app-bg rounded-b-xl border-x border-b border-app-border",
      },
    },
  });

  useEffect(() => {
    if (isOpen && mainEditor && combination.narrative !== mainEditor.getHTML()) {
      mainEditor.commands.setContent(combination.narrative, false);
      setTendencies(combination.tendencies || []);
      setPossibleJobs((combination.possibleJobs || "").split(",").map(s => s.trim()).filter(Boolean));
      setRelatedProfessions((combination.relatedProfessions || "").split(",").map(s => s.trim()).filter(Boolean));
      setCustomSections(
        (combination.customSections || []).map((sec: { title?: string; items?: string[]; content?: string }) => ({
          title: sec.title || "",
          items: sec.items || (sec.content ? [sec.content.replace(/<[^>]*>?/gm, "")] : [])
        }))
      );
    }
  }, [isOpen, combination, mainEditor]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(combination.id, {
      narrative: mainEditor?.getHTML() || "",
      tendencies: tendencies.filter(s => s.trim() !== ""),
      possibleJobs: possibleJobs.filter(s => s.trim() !== "").join(", "),
      relatedProfessions: relatedProfessions.filter(s => s.trim() !== "").join(", "),
      customSections: customSections
        .filter(s => s.title.trim() !== "")
        .map(s => ({ title: s.title, items: s.items.filter(i => i.trim() !== "") })),
    });
    setIsSaving(false);
  };

  const handleAdd = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => [...prev, ""]);
  };
  const handleUpdate = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => {
    setter(prev => {
      const arr = [...prev];
      arr[index] = value;
      return arr;
    });
  };
  const handleRemove = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  const addCustomSection = () => {
    setCustomSections(prev => [...prev, { title: "", items: [""] }]);
  };
  const updateCustomSectionTitle = (index: number, title: string) => {
    setCustomSections(prev => {
      const arr = [...prev];
      arr[index].title = title;
      return arr;
    });
  };
  const addCustomSectionItem = (sectionIndex: number) => {
    setCustomSections(prev => {
      const arr = [...prev];
      arr[sectionIndex].items.push("");
      return arr;
    });
  };
  const updateCustomSectionItem = (sectionIndex: number, itemIndex: number, value: string) => {
    setCustomSections(prev => {
      const arr = [...prev];
      arr[sectionIndex].items[itemIndex] = value;
      return arr;
    });
  };
  const removeCustomSectionItem = (sectionIndex: number, itemIndex: number) => {
    setCustomSections(prev => {
      const arr = [...prev];
      arr[sectionIndex].items = arr[sectionIndex].items.filter((_, i) => i !== itemIndex);
      return arr;
    });
  };
  const removeCustomSection = (index: number) => {
    setCustomSections(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-10 sm:pt-16 px-4 pb-10 sm:px-6 animate-in fade-in duration-300"
      aria-modal="true"
      role="dialog"
    >
      <div className="absolute inset-0 bg-app-bg/95 backdrop-blur-md" onClick={onClose} />

      <div className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-app-border bg-app-surface shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] max-h-[85vh] animate-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between border-b border-app-border bg-app-surface px-8 py-6 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-1.5 w-6 bg-app-primary rounded-full" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-app-text-muted">
                Template Editor
              </p>
            </div>
            <h3 className="text-xl font-black text-app-text-main truncate tracking-tight">
              {combination.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-app-text-muted hover:bg-app-bg hover:text-app-text-main transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-10">
          
          {/* Narrative */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-app-text-main">Narrativa Principal</label>
            <p className="text-xs text-app-text-muted mb-2">Texto introductorio de la combinación.</p>
            <div>
              <div className="flex items-center gap-1 border border-app-border bg-app-bg px-4 py-2 rounded-t-xl">
                <button
                  type="button"
                  onClick={() => mainEditor?.chain().focus().toggleBold().run()}
                  className={`rounded-lg p-2 text-sm font-bold transition-colors ${mainEditor?.isActive("bold") ? "bg-app-primary/20 text-app-primary" : "text-app-text-muted hover:bg-app-surface hover:text-app-text-main"}`}
                >
                  <Bold className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => mainEditor?.chain().focus().toggleItalic().run()}
                  className={`rounded-lg p-2 text-sm transition-colors ${mainEditor?.isActive("italic") ? "bg-app-primary/20 text-app-primary" : "text-app-text-muted hover:bg-app-surface hover:text-app-text-main"}`}
                >
                  <Italic className="h-4 w-4" />
                </button>
                <div className="h-4 w-px bg-app-border mx-1" />
                <button
                  type="button"
                  onClick={() => mainEditor?.chain().focus().toggleBulletList().run()}
                  className={`rounded-lg p-2 text-sm transition-colors ${mainEditor?.isActive("bulletList") ? "bg-app-primary/20 text-app-primary" : "text-app-text-muted hover:bg-app-surface hover:text-app-text-main"}`}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => mainEditor?.chain().focus().toggleOrderedList().run()}
                  className={`rounded-lg p-2 text-sm transition-colors ${mainEditor?.isActive("orderedList") ? "bg-app-primary/20 text-app-primary" : "text-app-text-muted hover:bg-app-surface hover:text-app-text-main"}`}
                >
                  <ListOrdered className="h-4 w-4" />
                </button>
              </div>
              <EditorContent editor={mainEditor} />
            </div>
          </div>

          {/* Tendencies */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-bold text-app-text-main">Tendencias</label>
                <p className="text-xs text-app-text-muted">Lista de viñetas ("tu perfil tiende a...")</p>
              </div>
              <button
                type="button"
                onClick={() => handleAdd(setTendencies)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-app-border px-3 py-1.5 text-xs font-semibold text-app-text-main hover:border-app-primary hover:text-app-primary transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar
              </button>
            </div>
            
            <div className="space-y-2">
              {tendencies.map((t, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <div className="mt-2.5 h-1.5 w-1.5 rounded-full bg-app-primary shrink-0" />
                  <textarea
                    value={t}
                    onChange={(e) => handleUpdate(setTendencies, idx, e.target.value)}
                    className="flex-1 rounded-xl border border-app-border bg-app-bg px-4 py-2 text-sm text-app-text-main outline-none focus:border-app-primary focus:bg-app-bg transition-all min-h-[40px] resize-y"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemove(setTendencies, idx)}
                    className="mt-1 p-2 text-status-error/70 hover:text-status-error hover:bg-status-error/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {tendencies.length === 0 && (
                <p className="text-sm text-app-text-muted italic">No hay tendencias. Agregá una.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Possible Jobs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-bold text-app-text-main">Trabajos Posibles</label>
                </div>
                <button
                  type="button"
                  onClick={() => handleAdd(setPossibleJobs)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-app-border px-3 py-1.5 text-xs font-semibold text-app-text-main hover:border-app-primary hover:text-app-primary transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> Agregar
                </button>
              </div>
              <div className="space-y-2">
                {possibleJobs.map((t, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-app-primary/50 shrink-0" />
                    <input
                      type="text"
                      value={t}
                      onChange={(e) => handleUpdate(setPossibleJobs, idx, e.target.value)}
                      className="flex-1 rounded-lg border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text-main outline-none focus:border-app-primary focus:bg-app-bg transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemove(setPossibleJobs, idx)}
                      className="p-2 text-status-error/70 hover:text-status-error hover:bg-status-error/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {possibleJobs.length === 0 && (
                  <p className="text-sm text-app-text-muted italic">No hay trabajos. Agregá uno.</p>
                )}
              </div>
            </div>

            {/* Related Professions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-bold text-app-text-main">Profesiones Relacionadas</label>
                </div>
                <button
                  type="button"
                  onClick={() => handleAdd(setRelatedProfessions)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-app-border px-3 py-1.5 text-xs font-semibold text-app-text-main hover:border-app-primary hover:text-app-primary transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> Agregar
                </button>
              </div>
              <div className="space-y-2">
                {relatedProfessions.map((t, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-app-primary/50 shrink-0" />
                    <input
                      type="text"
                      value={t}
                      onChange={(e) => handleUpdate(setRelatedProfessions, idx, e.target.value)}
                      className="flex-1 rounded-lg border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text-main outline-none focus:border-app-primary focus:bg-app-bg transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemove(setRelatedProfessions, idx)}
                      className="p-2 text-status-error/70 hover:text-status-error hover:bg-status-error/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {relatedProfessions.length === 0 && (
                  <p className="text-sm text-app-text-muted italic">No hay profesiones. Agregá una.</p>
                )}
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-app-border" />

          {/* Custom Sections */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-bold text-app-text-main">Secciones Personalizadas</label>
                <p className="text-xs text-app-text-muted">Secciones extra que aparecerán al final del reporte para esta combinación.</p>
              </div>
              <button
                type="button"
                onClick={addCustomSection}
                className="inline-flex items-center gap-1.5 rounded-lg bg-app-primary/10 text-app-primary px-4 py-2 text-sm font-bold hover:bg-app-primary hover:text-white transition-colors"
              >
                <Plus className="h-4 w-4" /> Nueva Sección
              </button>
            </div>

            <div className="space-y-6">
              {customSections.map((section, idx) => (
                <div key={idx} className="border border-app-border rounded-xl bg-app-surface/50 p-6 relative group">
                  <button
                    type="button"
                    onClick={() => removeCustomSection(idx)}
                    className="absolute top-4 right-4 p-2 text-status-error/70 hover:text-status-error hover:bg-status-error/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Eliminar sección"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                  <div className="space-y-4 pr-8">
                    <div>
                      <input
                        type="text"
                        placeholder="Ej: Recomendaciones de estudio"
                        value={section.title}
                        onChange={(e) => updateCustomSectionTitle(idx, e.target.value)}
                        className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-base font-bold text-app-text-main outline-none focus:border-app-border focus:bg-app-bg transition-all placeholder:text-app-text-muted/50"
                      />
                    </div>
                    <div>
                      <div className="space-y-2">
                        {section.items.map((item, itemIdx) => (
                          <div key={itemIdx} className="flex gap-2 items-start pl-2">
                            <div className="mt-2.5 h-1.5 w-1.5 rounded-full bg-app-primary shrink-0" />
                            <textarea
                              value={item}
                              placeholder="Ej: Cursos online, libros recomendados..."
                              onChange={(e) => updateCustomSectionItem(idx, itemIdx, e.target.value)}
                              className="flex-1 rounded-xl border border-app-border bg-app-bg px-4 py-2 text-sm text-app-text-main outline-none focus:border-app-primary focus:bg-app-bg transition-all min-h-[40px] resize-y placeholder:text-app-text-muted/40"
                            />
                            <button
                              type="button"
                              onClick={() => removeCustomSectionItem(idx, itemIdx)}
                              className="mt-1 p-2 text-status-error/70 hover:text-status-error hover:bg-status-error/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => addCustomSectionItem(idx)}
                        className="mt-3 ml-2 inline-flex items-center gap-1.5 rounded-lg border border-transparent px-2 py-1 text-xs font-semibold text-app-text-muted hover:text-app-primary hover:bg-app-primary/5 transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" /> Agregar elemento
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {customSections.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-app-border rounded-xl">
                  <p className="text-sm text-app-text-muted mb-3">No hay secciones personalizadas para esta combinación.</p>
                  <button
                    type="button"
                    onClick={addCustomSection}
                    className="inline-flex items-center gap-1.5 text-app-primary text-sm font-bold hover:underline"
                  >
                    <Plus className="h-4 w-4" /> Agregar mi primera sección
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>

        <div className="border-t border-app-border bg-app-surface px-8 py-6 flex justify-end items-center gap-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-transparent px-5 py-2.5 text-sm font-semibold text-app-text-muted hover:bg-app-bg hover:text-app-text-main transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-app-primary px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-app-primary/20 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </div>
    </div>
  );
};
