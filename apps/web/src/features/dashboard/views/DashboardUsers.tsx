import { Building2 } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useInstitutionsManager } from "../hooks/useInstitutionsManager";
import { Alert } from "../../../components/atoms/Alert";
import { Select } from "../../../components/atoms/Select";
import { Spinner } from "../../../components/atoms/Spinner";
import { Pagination } from "../../../components/molecules/Pagination";
import { CreateEntityForm, initialFormState } from "../components/users/CreateEntityForm";
import { InstitutionCard } from "../components/users/InstitutionCard";
import { InstitutionEditModal } from "../components/users/InstitutionEditModal";
import { type InstitutionOption } from "../api/dashboard";

const ITEMS_PER_PAGE = 12;

export function DashboardUsers() {
  const navigate = useNavigate();
  const { 
    institutions, loading, saving, message, error, notify,
    loadData, handleCreate, handleUpdate, handleToggleStatus, handleResendAuth, handleCreateAuth 
  } = useInstitutionsManager();
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

  const onCardAction = async (action: Promise<any>, id: string) => {
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
      <div>
        <h2 className="text-2xl font-display font-bold text-app-text-main tracking-tight">Instituciones</h2>
        <p className="mt-1 text-sm text-app-text-muted">Alta mínima de instituciones y su cuenta operativa.</p>
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
                onResendActivation={() => onCardAction(handleResendAuth(inst), inst.id)}
                isResendingActivation={activeAsyncId === inst.id}
                onCreateOperationalAccount={(data) => onCardAction(handleCreateAuth(data.institutionId, data.email), inst.id)}
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
    </div>
  );
};