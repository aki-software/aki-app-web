import {
  BookOpen,
  CheckCircle2,
  Check,
  ChevronDown,
  ChevronUp,
  Edit2,
  Shield,
  Save,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/hooks/useAuth";
import {
  fetchCategories,
  updateCategory,
  type CategoryData,
} from "../api/dashboard";
import { API_URL, getAuthHeaders } from "../api/client";

const PREVIEW_CHARS = 360;

export function DashboardSettings() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const [editingCategory, setEditingCategory] = useState<CategoryData | null>(
    null,
  );
  const [editForm, setEditForm] = useState({ title: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isAdmin = user?.role?.toUpperCase() === "ADMIN";

  const loadCategories = useCallback(async () => {
    setLoading(true);
    const data = await fetchCategories();
    setCategories(data);
    setLoading(false);
  }, []);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    void loadCategories();
  }, [isAdmin, loadCategories]);

  const changePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setPasswordError("Completa la contraseña actual y la nueva.");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("La confirmación no coincide.");
      return;
    }

    setPasswordSaving(true);
    try {
      const response = await fetch(`${API_URL}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { message?: string | string[] }
          | null;
        const msg =
          typeof data?.message === "string"
            ? data.message
            : Array.isArray(data?.message)
              ? data?.message.join(". ")
              : "No se pudo cambiar la contraseña.";
        setPasswordError(msg);
        return;
      }

      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordSuccess("Contraseña actualizada.");
    } catch (error) {
      console.error("Error changing password:", error);
      setPasswordError("No se pudo cambiar la contraseña. Intenta nuevamente.");
    } finally {
      setPasswordSaving(false);
    }
  };

  const categoriesCountLabel = useMemo(() => {
    if (!Array.isArray(categories)) return "";
    return `${categories.length} dimensiones`;
  }, [categories]);

  const openEditModal = (cat: CategoryData) => {
    if (!isAdmin) return;
    setSaveError(null);
    setEditForm({ title: cat.title, description: cat.description });
    setEditingCategory(cat);
  };

  const closeEditModal = useCallback(() => {
    setEditingCategory(null);
    setEditForm({ title: "", description: "" });
    setSaveError(null);
    setSaving(false);
  }, []);

  useEffect(() => {
    if (!editingCategory) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (saving) return;
        closeEditModal();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editingCategory, closeEditModal, saving]);

  const handleSave = async (categoryId: string) => {
    if (!isAdmin) return;
    setSaving(true);
    setSaveError(null);
    const ok = await updateCategory(categoryId, editForm);
    if (ok) {
      setCategories((prev) =>
        prev.map((c) => (c.categoryId === categoryId ? { ...c, ...editForm } : c)),
      );
      closeEditModal();
    } else {
      setSaveError(
        "No se pudo guardar. Verificá tu conexión o volvé a intentar.",
      );
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

  if (!isAdmin) {
    return (
      <div className="space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-display font-bold tracking-tight text-app-text-main">
              Cuenta operativa
              <Shield className="h-5 w-5 text-app-primary" />
            </h2>
            <p className="mt-1 text-app-text-muted">
              Seguridad de acceso y ajustes de la cuenta.
            </p>
          </div>
        </div>

        <div className="app-card !p-8 !rounded-2xl border-app-border shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="app-label opacity-60 tracking-[0.2em]">
                Seguridad
              </p>
              <h3 className="mt-2 text-lg font-black tracking-tight text-app-text-main">
                Cambiar contraseña
              </h3>
              <p className="mt-2 text-xs text-app-text-muted">
                Requiere tu contraseña actual.
              </p>
            </div>
            {passwordSuccess ? (
              <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-emerald-200">
                <CheckCircle2 className="h-4 w-4" />
                Actualizado
              </div>
            ) : null}
          </div>

          {passwordError ? (
            <div className="mt-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm font-semibold text-rose-200">
              {passwordError}
            </div>
          ) : null}
          {passwordSuccess ? (
            <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm font-semibold text-emerald-200">
              {passwordSuccess}
            </div>
          ) : null}

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="space-y-2">
              <span className="app-label opacity-60">Contraseña actual</span>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    currentPassword: e.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-app-border bg-app-bg px-5 py-4 text-sm font-bold text-app-text-main focus:border-app-primary outline-none transition-all"
                autoComplete="current-password"
              />
            </label>

            <label className="space-y-2">
              <span className="app-label opacity-60">Nueva contraseña</span>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    newPassword: e.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-app-border bg-app-bg px-5 py-4 text-sm font-bold text-app-text-main focus:border-app-primary outline-none transition-all"
                autoComplete="new-password"
              />
            </label>

            <label className="space-y-2">
              <span className="app-label opacity-60">Confirmar</span>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-app-border bg-app-bg px-5 py-4 text-sm font-bold text-app-text-main focus:border-app-primary outline-none transition-all"
                autoComplete="new-password"
              />
            </label>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setPasswordError(null);
                setPasswordSuccess(null);
                setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
              }}
              disabled={passwordSaving}
              className="inline-flex items-center justify-center rounded-2xl border border-app-border bg-app-surface px-5 py-3 text-xs font-black uppercase tracking-widest text-app-text-main shadow-sm transition-all hover:border-app-primary hover:text-app-primary disabled:opacity-50"
            >
              Limpiar
            </button>

            <button
              type="button"
              onClick={changePassword}
              disabled={passwordSaving}
              className="inline-flex items-center justify-center rounded-2xl border border-app-primary/30 bg-app-primary/10 px-6 py-3 text-xs font-black uppercase tracking-widest text-app-primary shadow-sm transition-all hover:bg-app-primary hover:text-white disabled:opacity-50"
            >
              {passwordSaving ? "Guardando..." : "Actualizar"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-display font-bold tracking-tight text-app-text-main">
            Material Teórico (CMS)
          </h2>
          <p className="mt-1 text-app-text-muted">
            Configura las 12 dimensiones devueltas al paciente al finalizar el test.
          </p>
          {categoriesCountLabel ? (
            <p className="mt-2 text-xs font-medium text-app-text-muted">
              {categoriesCountLabel}
            </p>
          ) : null}
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
            <div className="flex justify-between items-start gap-4">
              <div className="flex items-start space-x-3 min-w-0">
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-app-primary/20 bg-app-primary/10">
                  <BookOpen className="h-4 w-4 text-app-primary" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="truncate text-lg font-bold text-app-text-main">
                      {cat.title}
                    </h3>
                    <span className="inline-flex items-center rounded border border-app-border bg-app-bg px-2 py-0.5 text-xs font-medium text-app-text-muted">
                      {cat.categoryId}
                    </span>
                  </div>

                  <div className="mt-2">
                    <p className="whitespace-pre-line text-sm leading-relaxed text-app-text-muted">
                      {expandedIds[cat.categoryId]
                        ? cat.description
                        : cat.description.length > PREVIEW_CHARS
                          ? `${cat.description.slice(0, PREVIEW_CHARS).trimEnd()}...`
                          : cat.description}
                    </p>

                    {cat.description.length > PREVIEW_CHARS ? (
                      <div className="mt-3 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedIds((prev) => ({
                              ...prev,
                              [cat.categoryId]: !prev[cat.categoryId],
                            }))
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-app-border bg-app-bg px-3 py-1.5 text-xs font-semibold text-app-text-main transition-colors hover:border-app-primary/40 hover:text-app-primary"
                        >
                          {expandedIds[cat.categoryId] ? (
                            <>
                              Ver menos <ChevronUp className="h-4 w-4" />
                            </>
                          ) : (
                            <>
                              Ver más <ChevronDown className="h-4 w-4" />
                            </>
                          )}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => openEditModal(cat)}
                  className="mt-1 inline-flex shrink-0 items-center rounded-lg border border-app-border px-3 py-1.5 text-sm font-medium text-app-text-main transition-colors hover:border-app-primary/40 hover:text-app-primary"
                >
                  <Edit2 className="w-4 h-4 mr-1.5" /> Editar
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {editingCategory ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Cerrar edición"
            onClick={closeEditModal}
            disabled={saving}
            className="absolute inset-0 bg-app-bg/70 backdrop-blur-sm"
          />

          <div className="relative flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-[0_24px_60px_-28px_rgba(0,0,0,0.85)] max-h-[85vh]">
            <div className="flex items-start justify-between gap-3 border-b border-app-border bg-app-surface/95 px-6 py-5 backdrop-blur">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-app-text-muted">
                  Editar dimensión
                </p>
                <h3 className="mt-1 truncate text-lg font-semibold text-app-text-main">
                  {editingCategory.title}
                </h3>
                <p className="mt-1 text-xs text-app-text-muted">
                  ID: <span className="font-semibold">{editingCategory.categoryId}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditModal}
                disabled={saving}
                className="rounded-lg p-2 text-app-text-muted transition-colors hover:bg-app-bg hover:text-app-text-main"
                title="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="grid gap-4">
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-app-text-muted">
                    Título
                  </span>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, title: e.target.value }))
                    }
                    className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text-main outline-none focus:border-app-primary focus:ring-2 focus:ring-app-primary/25"
                    required
                    autoFocus
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-medium text-app-text-muted">
                    Descripción extendida (Marco teórico)
                  </span>
                  <textarea
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={14}
                    className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 font-mono text-sm leading-relaxed text-app-text-main outline-none focus:border-app-primary focus:ring-2 focus:ring-app-primary/25"
                  />
                </label>

                {saveError ? (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200">
                    {saveError}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="shrink-0 border-t border-app-border bg-app-surface/95 px-6 py-4 backdrop-blur">
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={saving}
                  className="app-button-secondary disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleSave(editingCategory.categoryId)}
                  disabled={saving}
                  className="app-button-primary inline-flex items-center disabled:opacity-50"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
