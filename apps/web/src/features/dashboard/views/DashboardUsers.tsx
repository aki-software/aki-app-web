import { Building2, Users } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { useInstitutionsManager } from "../hooks/useInstitutionsManager";
import { Alert } from "../../../components/atoms/Alert";
import { Select } from "../../../components/atoms/Select";
import { Spinner } from "../../../components/atoms/Spinner";
import { Pagination } from "../../../components/molecules/Pagination";
import { CreateEntityForm } from "../components/users/CreateEntityForm";
import { initialFormState } from "../components/users/CreateEntityForm.types";
import { InstitutionCard } from "../components/users/InstitutionCard";
import { InstitutionEditModal } from "../components/users/InstitutionEditModal";
import { type InstitutionOption } from "../api/dashboard";
import { fetchTherapists, type TherapistOption } from "../api/users.api";

const ITEMS_PER_PAGE = 12;

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

  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "PENDING">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [formState, setFormState] = useState(initialFormState);
  const [editingInst, setEditingInst] = useState<InstitutionOption | null>(null);
  const [activeAsyncId, setActiveAsyncId] = useState<string | null>(null); // Para spinners de la card

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { setCurrentPage(1); }, [statusFilter]);

  const onSubmitCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!formState.name.trim() || !formState.email.trim()) {
      return notify("Nombre y email son requeridos.", true);
    }
    const success = await handleCreate(formState.name, formState.email, formState.billingEmail);
    if (success) setFormState(initialFormState);
  };

  const onSubmitUpdate = async (id: string, form: { name: string; billingEmail?: string }) => {
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
      .filter(i => statusFilter === "ALL" || (statusFilter === "ACTIVE") === !!i.responsibleTherapistActive)
      .sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
  }, [institutions, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const pageItems = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

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

      {/* Tab Content: Institutions */}
      {activeTab === "institutions" && (
        <>
          <div>
            <h2 className="text-2xl font-display font-bold text-app-text-main tracking-tight">Instituciones</h2>
            <p className="mt-1 text-sm text-app-text-muted">Alta de instituciones y sus respectivas cuentas de acceso.</p>
          </div>

          <Alert type="success" message={message || ""} />
          <Alert type="error" message={error || ""} />

          <CreateEntityForm
            formState={formState}
            setFormState={setFormState}
            saving={saving && !editingInst}
            onSubmit={onSubmitCreate}
            isEditing={false}
          />

          <div className="app-card !p-6">
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center">
                <Building2 className="mr-2 h-5 w-5 text-app-primary" />
                <h3 className="font-semibold text-app-text-main">Listado</h3>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-48">
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "PENDING")}
                    options={[{ value: "ALL", label: "Todos los estados" }, { value: "ACTIVE", label: "Activos" }, { value: "PENDING", label: "Pendientes" }]}
                  />
                </div>
                <div className="text-xs text-app-text-muted whitespace-nowrap">
                  Total: <span className="font-medium">{filtered.length}</span>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center p-10"><Spinner size="lg" /></div>
            ) : (
              <div className="space-y-3">
                {pageItems.map((inst) => (
                  <InstitutionCard
                    key={inst.id}
                    institution={inst}
                    onEdit={() => setEditingInst(inst)}
                    onToggleStatus={() => handleToggleStatus(inst)}
                    onDelete={() => onCardAction(handleDelete(inst), inst.id)}
                    onResendActivation={() => inst.responsibleTherapistUserId && onCardAction(handleResendActivation(inst.responsibleTherapistUserId), inst.id)}
                    isResendingActivation={activeAsyncId === inst.id}
                    onCreateOperationalAccount={(data) => onCardAction(handleCreateOperational(data.institutionId, data.email), inst.id)}
                    isCreatingOperationalAccount={activeAsyncId === inst.id}
                    onOpenOverview={(s) => navigate(`/dashboard/institutions/${s.id}`, { state: { institutionName: s.name } })}
                  />
                ))}
                <Pagination 
                  currentPage={currentPage} 
                  totalPages={totalPages} 
                  onPageChange={setCurrentPage} 
                />
              </div>
            )}
          </div>

          {editingInst && (
            <InstitutionEditModal
              institution={editingInst}
              onClose={() => setEditingInst(null)}
              onSave={onSubmitUpdate}
              saving={saving}
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

          {therapistsLoading ? (
            <div className="flex justify-center p-10"><Spinner size="lg" /></div>
          ) : therapists.length === 0 ? (
            <div className="app-card !p-12 flex flex-col items-center justify-center text-center">
              <Users className="h-12 w-12 text-app-text-muted/20 mb-4" />
              <p className="text-sm font-bold text-app-text-muted/60 uppercase tracking-widest">
                No hay profesionales registrados
              </p>
              <p className="mt-2 text-xs text-app-text-muted/40 max-w-md">
                Los terapeutas creados por las instituciones aparecerán aquí.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {therapists.map((therapist) => (
                <div
                  key={therapist.id}
                  className="app-card !p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
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
                      <span className="text-app-text-muted/60 truncate max-w-[200px]">
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
          )}
        </div>
      )}
    </div>
  );
}
