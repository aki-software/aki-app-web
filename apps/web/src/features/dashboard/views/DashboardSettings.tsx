import { useState, useEffect } from "react";
import { BookOpen, Edit2, Save, X, Check, Lock } from "lucide-react";
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
      setCategories(categories.map(c => c.categoryId === categoryId ? { ...c, ...editForm } : c));
      setEditingId(null);
    } else {
      alert("Hubo un error al guardar.");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
         <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Material Teórico (CMS)
            {!isAdmin && <Lock className="w-5 h-5 text-gray-400" />}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {isAdmin 
              ? "Configura las 12 dimensiones devueltas al paciente al finalizar el test"
              : "Consulta las 12 dimensiones que se presentan al paciente al finalizar el test"
            }
          </p>
        </div>
        <div className="inline-flex items-center self-start px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-sm font-medium">
          <Check className="w-4 h-4 mr-1"/> Sincronizado con Android
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {categories.map((cat) => (
          <div key={cat.categoryId} className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-all hover:border-blue-300 dark:hover:border-blue-800/50">
            {editingId === cat.categoryId ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 tracking-wider">
                      {cat.categoryId}
                    </span>
                    <span className="text-sm text-gray-400">Editando área vocacional</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título de la Categoría</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full xl:w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción Extendida (Marco Teórico)</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:border-gray-600 dark:text-white font-mono text-sm leading-relaxed"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button 
                    onClick={() => setEditingId(null)}
                    disabled={saving}
                    className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 mr-2"/> Cancelar
                  </button>
                  <button 
                    onClick={() => handleSave(cat.categoryId)}
                    disabled={saving}
                    className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                  >
                    <Save className="w-4 h-4 mr-2"/> {saving ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-start">
                  <div className="flex items-start space-x-3">
                    <div className="mt-1 w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                      <BookOpen className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{cat.title}</h3>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          {cat.categoryId}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed">
                        {cat.description}
                      </p>
                    </div>
                  </div>
                  {isAdmin && (
                    <button 
                      onClick={() => handleEdit(cat)}
                      className="flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/40 rounded-lg mt-1 transition-colors"
                    >
                      <Edit2 className="w-4 h-4 mr-1.5"/> Editar
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
