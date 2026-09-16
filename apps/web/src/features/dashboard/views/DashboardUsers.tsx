import { Building2, Plus, Users, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { useInstitutionsManager } from "../hooks/useInstitutionsManager";
import { Alert } from "../../../components/atoms/Alert";
import { Select } from "../../../components/atoms/Select";
import { Spinner } from "../../../components/atoms/Spinner";
import { Pagination } from "../../../components/molecules/Pagination";
import { CreateInstitutionModal } from "../components/users/CreateInstitutionModal";
import { InstitutionTableRow } from "../components/users/InstitutionTableRow";
import { InstitutionEditModal } from "../components/users/InstitutionEditModal";
import { InstitutionDetailsModal } from "../components/users/InstitutionDetailsModal";
import { type InstitutionOption } from "../api/dashboard";
import { fetchTherapists, type TherapistOption } from "../api/users.api";
const ITEMS_PER_PAGE = 6;

type ActiveTab = "institutions" | "professionals";

const TAB_STYLES = {
  base: "px-6 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer",
  active: "bg-app-primary/10 text-app-primary border border-app-primary/20",
  inactive: "text-app-text-muted/60 hover:text-app-text-main hover:bg-app-surface/50 border border-transparent",
};

export function DashboardUsers() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.role?.toUpperCase() === "ADMIN";
  const { 
    institutions, loading, saving, message, error, notify,
    loadData, handleCreate, handleUpdate, handleToggleStatus, 
    handleResendActivation, handleCreateOperational, handleDelete
  } = useInstitutionsManager();

  // Tab state from URL or default
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<ActiveTab>(
    tabParam === "professionals" ? "professionals" : "institutions"
  );
  const [therapists, setTherapists] = useState<TherapistOption[]>([]);
  const [therapistsLoading, setTherapistsLoading] = useState(false);

  // Protección de ruta: solo ADMIN puede acceder
  useEffect(() => {
    if (!isAdmin) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAdmin, navigate]);

  // Load therapists when switching to professionals tab
  useEffect(() => {
    if (activeTab !== "professionals") return;
    setTherapistsLoading(true);
    fetchTherapists()
      .then(setTherapists)
      .finally(() => setTherapistsLoading(false));
  }, [activeTab]);

  // Sync tab to URL — preserves other search params
  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    if (tab === "institutions") {
      next.delete("tab");
    } else {
      next.set("tab", tab);
    }
    setSearchParams(next, { replace: true });
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "PENDING">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingInst, setEditingInst] = useState<InstitutionOption | null>(null);
  const [viewingInst, setViewingInst] = useState<InstitutionOption | null>(null);
  const [activeAsyncId, setActiveAsyncId] = useState<string | null>(null);

  const [therapistSearchQuery, setTherapistSearchQuery] = useState("");
  const [therapistStatusFilter, setTherapistStatusFilter] = useState<"ALL" | "ACTIVE" | "PENDING">("ALL");
  const [therapistOrderFilter, setTherapistOrderFilter] = useState<"name-asc" | "name-desc" | "institution">("name-asc");
  const [therapistCurrentPage, setTherapistCurrentPage] = useState(1);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { setCurrentPage(1); }, [statusFilter, searchQuery]);
  useEffect(() => { setTherapistCurrentPage(1); }, [therapistStatusFilter, therapistSearchQuery, therapistOrderFilter]);

  const onSubmitCreate = async (form: { name: string; email: string; billingEmail: string }) => {
    if (!form.name.trim() || !form.email.trim()) {
      notify("Nombre y email son requeridos.", true);
      return false;
    }
    const success = await handleCreate(form.name, form.email, form.billingEmail);
    if (success) setCreateModalOpen(false);
    return !!success;
  };

  const onSubmitUpdate = async (id: string, form: {
    name: string;
    billingEmail?: string;
    legalName?: string;
    taxId?: string;
    taxCondition?: string;
    billingAddress?: string;
  }) => {
    const success = await handleUpdate(id, form);
    if (success) setEditingInst(null);
  };

  const onCardAction = async (action: Promise<unknown>, id: string) => {
    setActiveAsyncId(id);
    await action;
    setActiveAsyncId(null);
  };

  const filtered = useMemo(() => {
    return institutions
      .filter(i => {
        const matchesStatus = statusFilter === "ALL" || (statusFilter === "ACTIVE") === !!i.responsibleTherapistActive;
        const query = searchQuery.trim().toLowerCase();
        const matchesSearch = !query || 
          i.name.toLowerCase().includes(query) || 
          i.responsibleTherapistName?.toLowerCase().includes(query) ||
          i.billingEmail?.toLowerCase().includes(query);
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
  }, [institutions, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const pageItems = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const filteredTherapists = useMemo(() => {
    return therapists
      .filter(t => {
        const matchesStatus = therapistStatusFilter === "ALL" || (therapistStatusFilter === "ACTIVE" ? t.isActive : !t.isActive);
        const query = therapistSearchQuery.trim().toLowerCase();
        const matchesSearch = !query || 
          t.name.toLowerCase().includes(query) || 
          t.email?.toLowerCase().includes(query) ||
          t.institutionName?.toLowerCase().includes(query);
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        if (therapistOrderFilter === "name-asc") {
          return a.name.localeCompare(b.name);
        }
        if (therapistOrderFilter === "name-desc") {
          return b.name.localeCompare(a.name);
        }
        if (therapistOrderFilter === "institution") {
          const instA = a.institutionName || "";
          const instB = b.institutionName || "";
          if (instA === instB) {
            return a.name.localeCompare(b.name);
          }
          return instA.localeCompare(instB);
        }
        return 0;
      });
  }, [therapists, therapistStatusFilter, therapistSearchQuery, therapistOrderFilter]);

  const totalTherapistPages = Math.max(1, Math.ceil(filteredTherapists.length / ITEMS_PER_PAGE));
  const pageTherapists = filteredTherapists.slice((therapistCurrentPage - 1) * ITEMS_PER_PAGE, therapistCurrentPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={`${TAB_STYLES.base} ${activeTab === "institutions" ? TAB_STYLES.active : TAB_STYLES.inactive}`}
          onClick={() => handleTabChange("institutions")}
        >
          <span className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Instituciones
          </span>
        </button>
        <button
          type="button"
          className={`${TAB_STYLES.base} ${activeTab === "professionals" ? TAB_STYLES.active : TAB_STYLES.inactive}`}
          onClick={() => handleTabChange("professionals")}
        >
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Profesionales
          </span>
        </button>
      </div>

      {activeTab === "institutions" && (
        <>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-display font-bold text-app-text-main tracking-tight">Instituciones</h2>
              <p className="mt-1 text-sm text-app-text-muted">Gestion de instituciones y sus cuentas de acceso.</p>
            </div>
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-app-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-app-primary/90 hover:shadow-lg hover:shadow-app-primary/20 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Nueva institución
            </button>
          </div>

          <Alert type="success" message={message || ""} />
          <Alert type="error" message={error || ""} />

          <div className="app-card !p-6">
            <div className="mb-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div className="flex items-center">
                <Building2 className="mr-2 h-5 w-5 text-app-primary" />
                <h3 className="font-semibold text-app-text-main whitespace-nowrap">Instituciones Registradas</h3>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-app-text-muted/60" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-[44px] pl-10 pr-4 rounded-xl border border-app-border bg-app-surface text-sm font-medium text-app-text-main placeholder:text-app-text-muted/60 outline-none transition-all focus:border-app-primary focus:ring-4 focus:ring-app-primary/5"
                  />
                </div>
                <div className="w-full sm:w-48">
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "PENDING")}
                    options={[{ value: "ALL", label: "Todos los estados" }, { value: "ACTIVE", label: "Activos" }, { value: "PENDING", label: "Pendientes" }]}
                  />
                </div>
                <div className="text-xs text-app-text-muted whitespace-nowrap hidden sm:block">
                  Total: <span className="font-medium">{filtered.length}</span>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center p-10"><Spinner size="lg" /></div>
            ) : filtered.length === 0 ? (
              <div className="p-12 flex flex-col items-center justify-center text-center">
                <Building2 className="h-12 w-12 text-app-text-muted/20 mb-4" />
                <p className="text-sm font-bold text-app-text-muted/60 uppercase tracking-widest">
                  No se encontraron instituciones
                </p>
                <p className="mt-2 text-xs text-app-text-muted/40 max-w-md">
                  Intenta cambiar los filtros o el termino de busqueda.
                </p>
              </div>
            ) : (
              <div className="min-h-[400px] flex flex-col justify-between">
                <div className="overflow-visible">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-app-border/60">
                        <th className="px-4 pb-3 text-xs font-semibold uppercase tracking-wider text-app-text-muted/60">Institución</th>
                        <th className="px-4 pb-3 text-xs font-semibold uppercase tracking-wider text-app-text-muted/60">Responsable</th>
                        <th className="px-4 pb-3 text-xs font-semibold uppercase tracking-wider text-app-text-muted/60">Estado</th>
                        <th className="px-4 pb-3 text-xs font-semibold uppercase tracking-wider text-app-text-muted/60 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.map((inst) => (
                        <InstitutionTableRow
                          key={inst.id}
                          institution={inst}
                          onEdit={() => setEditingInst(inst)}
                          onViewDetail={() => setViewingInst(inst)}
                          onToggleStatus={() => handleToggleStatus(inst)}
                          onDelete={() => onCardAction(handleDelete(inst), inst.id)}
                          onResendActivation={() => inst.responsibleTherapistUserId && onCardAction(handleResendActivation(inst.responsibleTherapistUserId), inst.id)}
                          isResendingActivation={activeAsyncId === inst.id}
                          onCreateOperationalAccount={(data) => onCardAction(handleCreateOperational(data.institutionId, data.email), inst.id)}
                          isCreatingOperationalAccount={activeAsyncId === inst.id}
                          onOpenOverview={(s) => navigate(`/dashboard/institutions/${s.id}`, { state: { institutionName: s.name } })}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="pt-4 border-t border-app-border/40 mt-auto">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              </div>
            )}
          </div>

          <CreateInstitutionModal
            isOpen={createModalOpen}
            onClose={() => setCreateModalOpen(false)}
            onSubmit={onSubmitCreate}
            saving={saving && !editingInst}
          />

          {editingInst && (
            <InstitutionEditModal
              institution={editingInst}
              onClose={() => setEditingInst(null)}
              onSave={onSubmitUpdate}
              saving={saving}
            />
          )}

          {viewingInst && (
            <InstitutionDetailsModal
              institution={viewingInst}
              onClose={() => setViewingInst(null)}
            />
          )}
        </>
      )}

      {/* Tab Content: Professionals */}
      {activeTab === "professionals" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-display font-bold text-app-text-main tracking-tight">Profesionales</h2>
            <p className="mt-1 text-sm text-app-text-muted">Terapeutas internos registrados en las instituciones.</p>
          </div>

          <div className="app-card !p-6">
            <div className="mb-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div className="flex items-center">
                <Users className="mr-2 h-5 w-5 text-app-primary" />
                <h3 className="font-semibold text-app-text-main whitespace-nowrap">Profesionales Registrados</h3>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-app-text-muted/60" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, email o inst..."
                    value={therapistSearchQuery}
                    onChange={(e) => setTherapistSearchQuery(e.target.value)}
                    className="w-full h-[52px] pl-10 pr-4 rounded-2xl border border-app-border bg-app-surface text-sm font-medium text-app-text-main placeholder:text-app-text-muted/60 outline-none transition-all focus:border-app-primary focus:ring-4 focus:ring-app-primary/5"
                  />
                </div>
                <div className="w-full sm:w-44">
                  <Select
                    value={therapistStatusFilter}
                    onChange={(e) => setTherapistStatusFilter(e.target.value as "ALL" | "ACTIVE" | "PENDING")}
                    options={[{ value: "ALL", label: "Todos los estados" }, { value: "ACTIVE", label: "Activos" }, { value: "PENDING", label: "Pendientes" }]}
                  />
                </div>
                <div className="w-full sm:w-48">
                  <Select
                    value={therapistOrderFilter}
                    onChange={(e) => setTherapistOrderFilter(e.target.value as "name-asc" | "name-desc" | "institution")}
                    options={[
                      { value: "name-asc", label: "Nombre (A-Z)" },
                      { value: "name-desc", label: "Nombre (Z-A)" },
                      { value: "institution", label: "Institución" }
                    ]}
                  />
                </div>
                <div className="text-xs text-app-text-muted whitespace-nowrap hidden xl:block">
                  Total: <span className="font-medium">{filteredTherapists.length}</span>
                </div>
              </div>
            </div>

            {therapistsLoading ? (
              <div className="flex justify-center p-10"><Spinner size="lg" /></div>
            ) : filteredTherapists.length === 0 ? (
              <div className="p-12 flex flex-col items-center justify-center text-center">
                <Users className="h-12 w-12 text-app-text-muted/20 mb-4" />
                <p className="text-sm font-bold text-app-text-muted/60 uppercase tracking-widest">
                  No se encontraron profesionales
                </p>
                <p className="mt-2 text-xs text-app-text-muted/40 max-w-md">
                  Intentá cambiar los filtros o el término de búsqueda.
                </p>
              </div>
            ) : (
              <div className="min-h-[480px] flex flex-col justify-between">
                <div className="space-y-3">
                  {pageTherapists.map((therapist) => (
                    <div
                      key={therapist.id}
                      className="rounded-xl border border-app-border bg-app-bg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:border-app-primary/30"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="shrink-0 h-10 w-10 rounded-full bg-app-primary/10 flex items-center justify-center">
                          <span className="text-sm font-black text-app-primary">
                            {therapist.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-app-text-main truncate">
                            {therapist.name}
                          </p>
                          {therapist.email && (
                            <p className="text-xs text-app-text-muted/70 truncate">
                              {therapist.email}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        {therapist.institutionName && (
                          <span className="text-app-text-muted/60 truncate max-w-[200px]" title={therapist.institutionName}>
                            {therapist.institutionName}
                          </span>
                        )}
                        <span
                          className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            therapist.isActive
                              ? "bg-status-success/10 text-status-success"
                              : "bg-status-warning/10 text-status-warning"
                          }`}
                        >
                          {therapist.isActive ? "Activo" : "Pendiente"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t border-app-border/40 mt-auto">
                  <Pagination 
                    currentPage={therapistCurrentPage} 
                    totalPages={totalTherapistPages} 
                    onPageChange={setTherapistCurrentPage} 
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
