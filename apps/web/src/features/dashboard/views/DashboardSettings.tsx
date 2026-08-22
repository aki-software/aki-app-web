import { Check, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/hooks/useAuth";
import { fetchCategories, type CategoryData } from "../api/dashboard";
import {
  fetchCombinations,
  type TresAreasCombinationItem,
} from "../api/combinations.api";
import { Spinner } from "../../../components/atoms/Spinner";
import { SecuritySettings } from "../components/settings/SecuritySettings";
import { CategoryCard } from "../components/settings/CategoryCard";
import { ContentEditDialog } from "../components/settings/ContentEditDialog";
import { useContentEditor } from "../hooks/useContentEditor";

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
      role="status"
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

  // --- Combinations tab state ---
  const [combinations, setCombinations] = useState<TresAreasCombinationItem[]>(
    [],
  );
  const [combLoading, setCombLoading] = useState(false);
  const [combLoaded, setCombLoaded] = useState(false);
  const [combSearch, setCombSearch] = useState("");
  const [combPage, setCombPage] = useState(1);

  // --- Toast ---
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // --- Tab ---
  const [activeTab, setActiveTab] = useState<ActiveTab>("settings");
  const editor = useContentEditor({
    onCategorySaved: (result) => {
      setCategories((items) =>
        items.map((item) =>
          item.categoryId === result.categoryId ? result : item,
        ),
      );
      showToast("Cambios guardados.", "success");
    },
    onCombinationSaved: (result) => {
      setCombinations((items) =>
        items.map((item) => (item.id === result.id ? result : item)),
      );
      showToast("Cambios guardados.", "success");
    },
  });

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
    return [...result].sort((a, b) => a.title.localeCompare(b.title, "es"));
  }, [combinations, combSearch]);

  // Pagination
  const totalCombPages = Math.max(
    1,
    Math.ceil(filteredCombinations.length / ITEMS_PER_PAGE),
  );
  const paginatedCombinations = filteredCombinations.slice(
    (combPage - 1) * ITEMS_PER_PAGE,
    combPage * ITEMS_PER_PAGE,
  );

  const handleCombSearchChange = (value: string) => {
    setCombSearch(value);
    setCombPage(1);
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
            Contenido de reportes
          </h2>
          <p className="mt-1 text-app-text-muted">
            Edita las dimensiones y combinaciones de referencia incluidas en los
            reportes de pacientes.
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
            Referencia ({categories.length})
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
            Combinaciones {combLoaded ? `(${filteredCombinations.length})` : ""}
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
                onEdit={() => editor.openCategory(cat)}
              />
            ))}
          </div>
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
              placeholder="Buscar combinaciones..."
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
                      <th className="px-4 md:px-6 py-4" />
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
                              {[comb.area1, comb.area2, comb.area3].map(
                                (area, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center rounded-full bg-app-bg border border-app-border/60 px-2.5 py-1 text-[10px] font-bold text-app-text-muted shadow-sm group-hover:border-app-primary/30 group-hover:text-app-text-main transition-colors"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-app-primary/60 mr-1.5 shadow-[0_0_8px_rgba(var(--color-primary),0.6)]" />
                                    {area}
                                  </span>
                                ),
                              )}
                            </div>
                          </td>
                          <td className="px-4 md:px-6 py-4 text-right">
                            <button
                              type="button"
                              aria-label={`Editar ${comb.title}`}
                              onClick={() => editor.openCombination(comb)}
                              className="rounded-lg border border-app-border px-3 py-1.5 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-app-primary"
                            >
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
                    Página {combPage} de {totalCombPages} ·{" "}
                    {filteredCombinations.length} resultados
                  </p>
                  <div className="flex gap-2">
                    <button
                      id="comb-prev-page"
                      type="button"
                      disabled={combPage === 1}
                      onClick={() => setCombPage((p) => p - 1)}
                      className="rounded-lg border border-app-border px-3 py-1.5 text-xs font-semibold text-app-text-muted disabled:opacity-40 hover:border-app-primary hover:text-app-primary transition-colors disabled:pointer-events-none"
                    >
                      Anterior
                    </button>
                    <button
                      id="comb-next-page"
                      type="button"
                      disabled={combPage === totalCombPages}
                      onClick={() => setCombPage((p) => p + 1)}
                      className="rounded-lg border border-app-border px-3 py-1.5 text-xs font-semibold text-app-text-muted disabled:opacity-40 hover:border-app-primary hover:text-app-primary transition-colors disabled:pointer-events-none"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <ContentEditDialog
        key={
          editor.selection
            ? `${editor.selection.kind}-${editor.selection.item.title}`
            : "closed"
        }
        selection={editor.selection}
        saving={editor.saving}
        error={editor.error}
        onClose={editor.close}
        onSubmit={editor.submit}
      />
      {/* Toast Notification */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
