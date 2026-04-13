import { Building2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  createInstitution,
  createInstitutionOperationalAccount,
  updateInstitution,
  updateInstitutionStatus,
  fetchInstitutions,
  resendInstitutionActivationInvitation,
  type InstitutionOption,
} from "../api/dashboard";
import {
    CreateEntityForm,
    initialFormState,
    type EntityFormState,
} from "../components/users/CreateEntityForm";
import { InstitutionCard } from "../components/users/InstitutionCard";

export function DashboardUsers() {
  const navigate = useNavigate();
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resendingInstitutionId, setResendingInstitutionId] = useState<
    string | null
  >(null);
  const [creatingOperationalAccountId, setCreatingOperationalAccountId] =
    useState<string | null>(null);
  const [formState, setFormState] = useState<EntityFormState>(initialFormState);
  const [editingInstitution, setEditingInstitution] = useState<InstitutionOption | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "PENDING">(
    "ALL",
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const ITEMS_PER_PAGE = 12;

  const loadData = async () => {
    const [institutionsData] = await Promise.all([fetchInstitutions()]);
    setInstitutions(institutionsData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetMessages = () => {
    setMessage(null);
    setErrorMessage(null);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetMessages();
 
    if (!formState.name.trim()) {
      setErrorMessage("Ingresá un nombre.");
      return;
    }

    if (!isEditModalOpen && !formState.email.trim()) {
      setErrorMessage("Ingresá un email de acceso.");
      return;
    }
 
    setSaving(true);
 
    if (editingInstitution) {
      const updated = await updateInstitution(editingInstitution.id, {
        name: formState.name,
        billingEmail: formState.billingEmail || undefined,
      });
      setSaving(false);
      if (!updated) {
        setErrorMessage("No se pudo actualizar la institución.");
        return;
      }
      setEditingInstitution(null);
      setFormState(initialFormState);
      setIsEditModalOpen(false);
      await loadData();
      setMessage(`Institución ${updated.name} actualizada.`);
      return;
    }

    const created = await createInstitution({
      name: formState.name,
      email: formState.email,
      billingEmail: formState.billingEmail || undefined,
    });
    setSaving(false);

    if (!created) {
      setErrorMessage("No se pudo crear la institución.");
      return;
    }

    setFormState(initialFormState);
    await loadData();
    setMessage(
      created.activationEmailSent
        ? `Institución ${created.name} creada. Se envió activación al email informado.`
        : `Institución ${created.name} creada, pero no se pudo enviar el mail de activación.`,
    );
  };
 
  const handleEditInstitution = (institution: InstitutionOption) => {
    resetMessages();
    setEditingInstitution(institution);
    setFormState({
      name: institution.name,
      email: "",
      billingEmail: institution.billingEmail || "",
    });
    setIsEditModalOpen(true);
  };
 
  const handleToggleInstitutionStatus = async (institution: InstitutionOption) => {
    resetMessages();
    setSaving(true);
    const success = await updateInstitutionStatus(
      institution.id,
      !institution.responsibleTherapistActive
    );
    setSaving(false);
 
    if (!success) {
      setErrorMessage(`No se pudo cambiar el estado de ${institution.name}.`);
      return;
    }
 
    setMessage(`Estado de ${institution.name} actualizado.`);
    await loadData();
  };
 
  const handleResendInstitutionActivation = async (
    institution: InstitutionOption,
  ) => {
    if (!institution.responsibleTherapistUserId) {
      setErrorMessage(
        `No hay cuenta operativa asignada a ${institution.name}.`,
      );
      return;
    }

    resetMessages();
    setResendingInstitutionId(institution.id);
    const sent = await resendInstitutionActivationInvitation(
      institution.responsibleTherapistUserId,
    );
    setResendingInstitutionId(null);

    if (!sent) {
      setErrorMessage(
        `No se pudo reenviar la invitación a la cuenta operativa de ${institution.name}.`,
      );
      return;
    }

    setMessage(`Invitación reenviada a la cuenta operativa de ${institution.name}.`);
  };

  const handleCreateOperationalAccount = async (args: {
    institutionId: string;
    email: string;
  }) => {
    resetMessages();
    setCreatingOperationalAccountId(args.institutionId);
    const created = await createInstitutionOperationalAccount({
      institutionId: args.institutionId,
      email: args.email,
    });
    setCreatingOperationalAccountId(null);

    if (!created) {
      setErrorMessage("No se pudo crear la cuenta operativa.");
      return;
    }

    await loadData();
    setMessage(
      created.activationEmailSent
        ? "Cuenta operativa creada. Se envió la activación al email informado."
        : "Cuenta operativa creada, pero no se pudo enviar el mail de activación.",
    );
  };

  const filteredInstitutions = useMemo(() => {
    const list = institutions.slice();
    const byStatus = list.filter((institution) => {
      if (statusFilter === "ALL") {
        return true;
      }

      const isActive = !!institution.responsibleTherapistActive;
      return statusFilter === "ACTIVE" ? isActive : !isActive;
    });

    byStatus.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (aTime !== bTime) {
        return bTime - aTime; // newest first
      }
      return a.name.localeCompare(b.name, "es");
    });

    return byStatus;
  }, [institutions, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredInstitutions.length / ITEMS_PER_PAGE),
  );
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const pageStart = (safePage - 1) * ITEMS_PER_PAGE;
  const pageItems = filteredInstitutions.slice(
    pageStart,
    pageStart + ITEMS_PER_PAGE,
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-app-text-main tracking-tight">
          Instituciones
        </h2>
        <p className="mt-1 text-sm text-app-text-muted">
          Alta mínima de instituciones y su cuenta operativa (email de acceso),
          que recibe activación por mail.
        </p>
        <p className="mt-1 text-xs text-app-text-muted">
          Si una cuenta operativa no activó o el link caducó, podés reenviar la
          activación desde la tarjeta de la institución.
        </p>
      </div>

      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          <div>{message}</div>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {errorMessage}
        </div>
      )}

        {/* Alta (siempre arriba). La edición se hace en modal para evitar saltos de scroll. */}
        <CreateEntityForm
          formState={formState}
          setFormState={setFormState}
          saving={saving}
          onSubmit={handleSubmit}
          isEditing={false}
        />


      <div className="grid grid-cols-1 gap-6">
        <div className="app-card !p-6">
          <div className="mb-4 flex items-center">
            <Building2 className="mr-2 h-5 w-5 text-app-primary" />
            <h3 className="font-semibold text-app-text-main">Instituciones</h3>
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <label className="text-sm">
              <span className="mr-2 font-medium text-app-text-muted">Estado</span>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as typeof statusFilter)
                }
                className="app-select rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text-main outline-none focus:border-app-primary focus:ring-2 focus:ring-app-primary/25"
              >
                <option value="ALL">Todos</option>
                <option value="ACTIVE">Activo</option>
                <option value="PENDING">Pendiente</option>
              </select>
            </label>

            <div className="text-xs text-app-text-muted">
              Total: <span className="font-medium">{filteredInstitutions.length}</span>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-app-text-muted">Cargando...</p>
          ) : (
            <div className="space-y-3">
                {pageItems.map((institution) => (
                  <InstitutionCard
                    key={institution.id}
                    institution={institution}
                    onEdit={handleEditInstitution}
                    onToggleStatus={handleToggleInstitutionStatus}
                    onResendActivation={handleResendInstitutionActivation}
                    isResendingActivation={
                      resendingInstitutionId === institution.id
                    }
                    onCreateOperationalAccount={handleCreateOperationalAccount}
                    isCreatingOperationalAccount={
                      creatingOperationalAccountId === institution.id
                    }
                    onOpenOverview={(selected) => {
                      navigate(`/dashboard/institutions/${selected.id}`, {
                        state: { institutionName: selected.name },
                      });
                    }}
                  />
                ))}

              {filteredInstitutions.length > ITEMS_PER_PAGE ? (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-app-border pt-4">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    className="inline-flex items-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-xs font-medium text-app-text-main transition-colors hover:border-app-primary/40 hover:text-app-primary disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </button>

                  <div className="text-xs text-app-text-muted">
                    Página <span className="font-medium">{safePage}</span> de{" "}
                    <span className="font-medium">{totalPages}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={safePage >= totalPages}
                    className="inline-flex items-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-xs font-medium text-app-text-main transition-colors hover:border-app-primary/40 hover:text-app-primary disabled:opacity-50"
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </div>
            )}
        </div>
      </div>

      {isEditModalOpen && editingInstitution ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-app-bg/70 backdrop-blur-sm"
            onClick={() => {
              setIsEditModalOpen(false);
              setEditingInstitution(null);
              setFormState(initialFormState);
            }}
          />
          <div className="relative w-full max-w-xl rounded-2xl border border-app-border bg-app-surface p-6 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.85)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-app-text-main">
                  Editar institución
                </h3>
                <p className="mt-1 text-xs text-app-text-muted">
                  Solo podés editar nombre y email de facturación.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingInstitution(null);
                  setFormState(initialFormState);
                }}
                className="rounded-lg p-2 text-app-text-muted transition-colors hover:bg-app-bg hover:text-app-text-main"
                title="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-app-text-muted">Nombre</span>
                  <input
                    type="text"
                    value={formState.name}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text-main outline-none focus:border-app-primary focus:ring-2 focus:ring-app-primary/25"
                    required
                    autoFocus
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-medium text-app-text-muted">
                    Email de facturación (opcional)
                  </span>
                  <input
                    type="email"
                    value={formState.billingEmail}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        billingEmail: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text-main outline-none focus:border-app-primary focus:ring-2 focus:ring-app-primary/25"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingInstitution(null);
                    setFormState(initialFormState);
                  }}
                  className="app-button-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="app-button-primary disabled:opacity-60"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
