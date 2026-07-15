import { Check, Pencil, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/hooks/useAuth";
import { fetchCategories, updateCategory, type CategoryData } from "../api/dashboard";
import {
  fetchCombinations,
  updateCombination,
  type TresAreasCombinationItem,
} from "../api/combinations.api";
import { Spinner } from "../../../components/atoms/Spinner";
import { SecuritySettings } from "../components/settings/SecuritySettings";
import { CategoryEditModal } from "../components/settings/CategoryEditModal";
import { CategoryCard } from "../components/settings/CategoryCard";
import { CombinationEditModal } from "../components/CombinationEditModal";

type ActiveTab = "settings" | "combinations";

const ITEMS_PER_PAGE = 10;

function Toast({
  message,
  type,
}: {
  message: string;
  type: "success" | "error";
}) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-3 text-sm font-semibold shadow-lg animate-in slide-in-from-bottom-4 duration-300 ${
        type === "success"
          ? "bg-status-success/90 text-white"
          : "bg-status-error/90 text-white"
      }`}
    >
      {type === "success" ? (
        <Check className="h-4 w-4 shrink-0" />
      ) : (
        <span className="h-4 w-4 shrink-0">✕</span>
      )}
      {message}
    </div>
  );
}

export function DashboardSettings() {
  const { user } = useAuth();
  const isAdmin = user?.role?.toUpperCase() === "ADMIN";

  // --- Settings tab state ---
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [editingCategory, setEditingCategory] = useState<CategoryData | null>(null);

  // --- Combinations tab state ---
  const [combinations, setCombinations] = useState<TresAreasCombinationItem[]>([]);
  const [combLoading, setCombLoading] = useState(false);
  const [combLoaded, setCombLoaded] = useState(false);
  const [combSearch, setCombSearch] = useState("");
  const [combPage, setCombPage] = useState(1);
  const [editingCombination, setEditingCombination] = useState<TresAreasCombinationItem | null>(null);

  // --- Toast ---
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // --- Tab ---
  const [activeTab, setActiveTab] = useState<ActiveTab>("settings");

  // Load categories on mount
  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    fetchCategories()
      .then(setCategories)
      .finally(() => setLoading(false));
  }, [isAdmin]);

  // Load combinations when tab is first activated
  useEffect(() => {
    if (activeTab === "combinations" && !combLoaded && isAdmin) {
      setCombLoading(true);
      fetchCombinations(1, 1000, "")
        .then((res) => {
          setCombinations(res.data);
          setCombLoaded(true);
        })
        .catch(() => showToast("Failed to load combinations.", "error"))
        .finally(() => setCombLoading(false));
    }
  }, [activeTab, combLoaded, isAdmin]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSaveCategory = async (
    id: string,
    form: { title: string; description: string },
  ) => {
    const ok = await updateCategory(id, form);
    if (ok) {
      setCategories((prev) =>
        prev.map((c) => (c.categoryId === id ? { ...c, ...form } : c)),
      );
      setEditingCategory(null);
    }
    return ok;
  };

  // Client-side search and sort for combinations
  const filteredCombinations = useMemo(() => {
    let result = combinations;
    if (combSearch.trim()) {
      const q = combSearch.toLowerCase();
      result = combinations.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.area1.toLowerCase().includes(q) ||
          c.area2.toLowerCase().includes(q) ||
          c.area3.toLowerCase().includes(q) ||
          c.narrative.toLowerCase().includes(q),
      );
    }
    return [...result].sort((a, b) => a.title.localeCompare(b.title, 'es'));
  }, [combinations, combSearch]);

  // Pagination
  const totalCombPages = Math.max(1, Math.ceil(filteredCombinations.length / ITEMS_PER_PAGE));
  const paginatedCombinations = filteredCombinations.slice(
    (combPage - 1) * ITEMS_PER_PAGE,
    combPage * ITEMS_PER_PAGE,
  );

  const handleCombSearchChange = (value: string) => {
    setCombSearch(value);
    setCombPage(1);
  };

  const handleSaveCombination = async (
    id: string,
    payload: {
      narrative: string;
      tendencies: string[];
      possibleJobs: string;
      relatedProfessions: string;
      customSections: { title: string; items: string[] }[];
    },
  ) => {
    if (!editingCombination) return;

    const ok = await updateCombination(id, payload);
    if (ok) {
      setCombinations((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, ...payload } : c,
        ),
      );
      showToast("Combination updated successfully.", "success");
    } else {
      showToast("Failed to save. Please try again.", "error");
    }
    setEditingCombination(null);
  };

  // --- Loading state ---
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
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold tracking-tight text-app-text-main">
            Material Teórico (CMS)
          </h2>
          <p className="mt-1 text-app-text-muted">
            Configura las dimensiones devueltas al paciente al finalizar el test.
          </p>
        </div>
        <div className="inline-flex items-center rounded-full border border-status-success/30 bg-status-success/10 px-3 py-1 text-sm text-status-success">
          <Check className="w-4 h-4 mr-1" /> Sincronizado con Android
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-app-border">
        <nav className="-mb-px flex gap-6" aria-label="Settings tabs">
          <button
            id="tab-settings"
            role="tab"
            aria-selected={activeTab === "settings"}
            onClick={() => setActiveTab("settings")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "settings"
                ? "border-app-primary text-app-primary"
                : "border-transparent text-app-text-muted hover:text-app-text-main"
            }`}
          >
            Settings ({categories.length})
          </button>
          <button
            id="tab-combinations"
            role="tab"
            aria-selected={activeTab === "combinations"}
            onClick={() => setActiveTab("combinations")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "combinations"
                ? "border-app-primary text-app-primary"
                : "border-transparent text-app-text-muted hover:text-app-text-main"
            }`}
          >
            Combinations {combLoaded ? `(${filteredCombinations.length})` : ""}
          </button>
        </nav>
      </div>

      {/* Tab: Settings */}
      {activeTab === "settings" && (
        <>
          <p className="text-xs font-medium text-app-text-muted">
            {categories.length} dimensiones
          </p>
          <div className="grid grid-cols-1 gap-4">
            {categories.map((cat) => (
              <CategoryCard
                key={cat.categoryId}
                category={cat}
                isExpanded={!!expandedIds[cat.categoryId]}
                onToggleExpand={() =>
                  setExpandedIds((prev) => ({
                    ...prev,
                    [cat.categoryId]: !prev[cat.categoryId],
                  }))
                }
                onEdit={() => setEditingCategory(cat)}
              />
            ))}
          </div>

          {editingCategory && (
            <CategoryEditModal
              category={editingCategory}
              onClose={() => setEditingCategory(null)}
              onSave={handleSaveCategory}
            />
          )}
        </>
      )}

      {/* Tab: Combinations */}
      {activeTab === "combinations" && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-app-text-muted pointer-events-none" />
            <input
              id="comb-search"
              type="text"
              placeholder="Search combinations..."
              value={combSearch}
              onChange={(e) => handleCombSearchChange(e.target.value)}
              className="w-full rounded-xl border border-app-border bg-app-bg pl-10 pr-4 py-2.5 text-sm text-app-text-main outline-none focus:border-app-primary focus:ring-4 focus:ring-app-primary/10 transition-all"
            />
          </div>

          {combLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" className="border-app-primary" />
            </div>
          ) : (
            <>
              {/* Table */}
              {/* Premium Table */}
              <div className="relative rounded-[2rem] border border-app-border/40 bg-gradient-to-b from-app-surface/80 to-app-bg shadow-sm backdrop-blur-xl overflow-x-auto">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-app-primary/30 to-transparent min-w-full" />
                
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="border-b border-app-border/30 bg-app-surface/30">
                      <th className="px-4 md:px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-app-text-muted/80">
                        Combinación
                      </th>
                      <th className="px-4 md:px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-app-text-muted/80 hidden md:table-cell">
                        Áreas (Triada)
                      </th>
                      <th className="px-4 md:px-6 py-4 text-right text-[10px] font-black uppercase tracking-[0.2em] text-app-text-muted/80">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border/20">
                    {paginatedCombinations.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-8 py-16 text-center text-sm font-medium text-app-text-muted"
                        >
                          No se encontraron combinaciones.
                        </td>
                      </tr>
                    ) : (
                      paginatedCombinations.map((comb) => (
                        <tr
                          key={comb.id}
                          className="group relative bg-transparent hover:bg-gradient-to-r hover:from-app-primary/[0.03] hover:to-transparent transition-all duration-300"
                        >
                          <td className="px-4 md:px-6 py-4 relative">
                            {/* Animated left border indicator */}
                            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-app-primary scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-center rounded-r-full" />
                            
                            <div className="font-bold text-sm text-app-text-main group-hover:text-app-primary transition-colors">
                              {comb.title}
                            </div>
                          </td>
                          <td className="px-4 md:px-6 py-4 hidden md:table-cell">
                            <div className="flex gap-1.5 flex-wrap">
                              {[comb.area1, comb.area2, comb.area3].map((area, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center rounded-full bg-app-bg border border-app-border/60 px-2.5 py-1 text-[10px] font-bold text-app-text-muted shadow-sm group-hover:border-app-primary/30 group-hover:text-app-text-main transition-colors"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-app-primary/60 mr-1.5 shadow-[0_0_8px_rgba(var(--color-primary),0.6)]" />
                                  {area}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 md:px-6 py-4 text-right">
                            <button
                              id={`edit-comb-${comb.id}`}
                              type="button"
                              onClick={() => setEditingCombination(comb)}
                              className="inline-flex items-center gap-2 rounded-xl bg-app-bg border border-app-border/60 px-4 py-2 text-xs font-bold text-app-text-main shadow-sm hover:bg-app-primary hover:text-white hover:border-transparent hover:shadow-[0_8px_16px_-4px_rgba(var(--color-primary),0.4)] transition-all duration-300 hover:-translate-y-0.5"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Editar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalCombPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-app-text-muted">
                    Page {combPage} of {totalCombPages} · {filteredCombinations.length} results
                  </p>
                  <div className="flex gap-2">
                    <button
                      id="comb-prev-page"
                      type="button"
                      disabled={combPage === 1}
                      onClick={() => setCombPage((p) => p - 1)}
                      className="rounded-lg border border-app-border px-3 py-1.5 text-xs font-semibold text-app-text-muted disabled:opacity-40 hover:border-app-primary hover:text-app-primary transition-colors disabled:pointer-events-none"
                    >
                      Previous
                    </button>
                    <button
                      id="comb-next-page"
                      type="button"
                      disabled={combPage === totalCombPages}
                      onClick={() => setCombPage((p) => p + 1)}
                      className="rounded-lg border border-app-border px-3 py-1.5 text-xs font-semibold text-app-text-muted disabled:opacity-40 hover:border-app-primary hover:text-app-primary transition-colors disabled:pointer-events-none"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Rich Text Editor Modal */}
      {editingCombination && (
        <CombinationEditModal
          isOpen={true}
          onClose={() => setEditingCombination(null)}
          combination={editingCombination}
          onSave={handleSaveCombination}
        />
      )}

      {/* Toast Notification */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}