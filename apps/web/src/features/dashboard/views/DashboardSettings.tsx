import { BookOpen, Check, Edit2, Lock, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../../auth/hooks/useAuth";
import {
    fetchCategories,
    updateCategory,
    type CategoryData,
} from "../api/dashboard";

export function DashboardSettings() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "" });
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.role?.toUpperCase() === "ADMIN";

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    const data = await fetchCategories();
    setCategories(data);
    setLoading(false);
  };

  const handleEdit = (cat: CategoryData) => {
    if (!isAdmin) return;
    setEditingId(cat.categoryId);
    setEditForm({ title: cat.title, description: cat.description });
  };

  const handleSave = async (categoryId: string) => {
    if (!isAdmin) return;
    setSaving(true);
    const ok = await updateCategory(categoryId, editForm);
    if (ok) {
      setCategories(
        categories.map((c) =>
          c.categoryId === categoryId ? { ...c, ...editForm } : c,
        ),
      );
      setEditingId(null);
    } else {
      alert("Hubo un error al guardar.");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-app-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-display font-bold tracking-tight text-app-text-main">
            Material Teórico (CMS)
            {!isAdmin && <Lock className="h-5 w-5 text-app-text-muted" />}
          </h2>
          <p className="mt-1 text-app-text-muted">
            {isAdmin
              ? "Configura las 12 dimensiones devueltas al paciente al finalizar el test"
              : "Consulta las 12 dimensiones que se presentan al paciente al finalizar el test"}
          </p>
        </div>
        <div className="inline-flex items-center self-start rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-300">
          <Check className="w-4 h-4 mr-1" /> Sincronizado con Android
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {categories.map((cat) => (
          <div
            key={cat.categoryId}
            className="app-card !rounded-xl !p-5 transition-all hover:border-app-primary/35"
          >
            {editingId === cat.categoryId ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center rounded border border-app-primary/30 bg-app-primary/15 px-2 py-1 text-xs font-bold tracking-wider text-app-primary">
                      {cat.categoryId}
                    </span>
                    <span className="text-sm text-app-text-muted">
                      Editando área vocacional
                    </span>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor={`title-${cat.categoryId}`}
                    className="mb-1 block text-sm font-medium text-app-text-muted"
                  >
                    Título de la Categoría
                  </label>
                  <input
                    id={`title-${cat.categoryId}`}
                    type="text"
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm({ ...editForm, title: e.target.value })
                    }
                    className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-app-text-main outline-none focus:border-app-primary focus:ring-2 focus:ring-app-primary/25 xl:w-1/2"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`description-${cat.categoryId}`}
                    className="mb-1 block text-sm font-medium text-app-text-muted"
                  >
                    Descripción Extendida (Marco Teórico)
                  </label>
                  <textarea
                    id={`description-${cat.categoryId}`}
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm({ ...editForm, description: e.target.value })
                    }
                    rows={6}
                    className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 font-mono text-sm leading-relaxed text-app-text-main outline-none focus:border-app-primary focus:ring-2 focus:ring-app-primary/25"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    onClick={() => setEditingId(null)}
                    disabled={saving}
                    className="flex items-center rounded-lg border border-app-border bg-app-bg px-4 py-2 text-sm font-medium text-app-text-main transition-colors hover:border-app-primary/30 hover:text-app-primary"
                  >
                    <X className="w-4 h-4 mr-2" /> Cancelar
                  </button>
                  <button
                    onClick={() => handleSave(cat.categoryId)}
                    disabled={saving}
                    className="app-button-primary flex items-center disabled:opacity-50"
                  >
                    <Save className="w-4 h-4 mr-2" />{" "}
                    {saving ? "Guardando..." : "Guardar Cambios"}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-start">
                  <div className="flex items-start space-x-3">
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-app-primary/20 bg-app-primary/10">
                      <BookOpen className="h-4 w-4 text-app-primary" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-bold text-app-text-main">
                          {cat.title}
                        </h3>
                        <span className="inline-flex items-center rounded border border-app-border bg-app-bg px-2 py-0.5 text-xs font-medium text-app-text-muted">
                          {cat.categoryId}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-app-text-muted">
                        {cat.description}
                      </p>
                    </div>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleEdit(cat)}
                      className="mt-1 flex items-center rounded-lg border border-app-border px-3 py-1.5 text-sm font-medium text-app-text-main transition-colors hover:border-app-primary/40 hover:text-app-primary"
                    >
                      <Edit2 className="w-4 h-4 mr-1.5" /> Editar
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
