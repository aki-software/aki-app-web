import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../../auth/hooks/useAuth";
import { fetchCategories, updateCategory, type CategoryData } from "../api/dashboard";
import { Spinner } from "../../../components/atoms/Spinner";
import { SecuritySettings } from "../components/settings/SecuritySettings";
import { CategoryEditModal } from "../components/settings/CategoryEditModal";
import { CategoryCard } from "../components/settings/CategoryCard";

export function DashboardSettings() {
  const { user } = useAuth();
  const isAdmin = user?.role?.toUpperCase() === "ADMIN";

  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [editingCategory, setEditingCategory] = useState<CategoryData | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    fetchCategories().then(setCategories).finally(() => setLoading(false));
  }, [isAdmin]);

  const handleSaveCategory = async (id: string, form: { title: string; description: string }) => {
    const ok = await updateCategory(id, form);
    if (ok) {
      setCategories(prev => prev.map(c => c.categoryId === id ? { ...c, ...form } : c));
      setEditingCategory(null);
    }
    return ok;
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner size="lg" className="border-app-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return <SecuritySettings />;
  }

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold tracking-tight text-app-text-main">
            Material Teórico (CMS)
          </h2>
          <p className="mt-1 text-app-text-muted">
            Configura las dimensiones devueltas al paciente al finalizar el test.
          </p>
          <p className="mt-2 text-xs font-medium text-app-text-muted">
            {categories.length} dimensiones
          </p>
        </div>
        <div className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
          <Check className="w-4 h-4 mr-1" /> Sincronizado con Android
        </div>
      </div>

      {/* Lista de Categorías (Usando nuestra molécula) */}
      <div className="grid grid-cols-1 gap-4">
        {categories.map((cat) => (
          <CategoryCard
            key={cat.categoryId}
            category={cat}
            isExpanded={!!expandedIds[cat.categoryId]}
            onToggleExpand={() => setExpandedIds(prev => ({ ...prev, [cat.categoryId]: !prev[cat.categoryId] }))}
            onEdit={() => setEditingCategory(cat)}
          />
        ))}
      </div>

      {/* Modal de Edición */}
      {editingCategory && (
        <CategoryEditModal
          category={editingCategory}
          onClose={() => setEditingCategory(null)}
          onSave={handleSaveCategory}
        />
      )}
    </div>
  );
};