import { useState, type FormEvent } from "react";
import { BarChart3, Edit2, Mail, MoreHorizontal, Power, RefreshCw, Trash2, UserPlus } from "lucide-react";
import type { InstitutionOption } from "../../api/dashboard";
import { ActivationBadge } from "../../../../components/atoms/StatusBadge";
import { Modal } from "../../../../components/atoms/Modal";

interface Props {
  institution: InstitutionOption;
  onEdit: (institution: InstitutionOption) => void;
  onToggleStatus: (institution: InstitutionOption) => void;
  onDelete?: (institution: InstitutionOption) => void;
  onOpenOverview?: (institution: InstitutionOption) => void;
  onResendActivation?: (institution: InstitutionOption) => void;
  isResendingActivation?: boolean;
  onCreateOperationalAccount?: (args: { institutionId: string; email: string }) => Promise<void>;
  isCreatingOperationalAccount?: boolean;
}

export function InstitutionTableRow({
  institution,
  onEdit,
  onToggleStatus,
  onDelete,
  onOpenOverview,
  onResendActivation,
  isResendingActivation,
  onCreateOperationalAccount,
  isCreatingOperationalAccount,
}: Props) {
  const hasOperationalAccount = !!institution.responsibleTherapistUserId;
  const isOperationalAccountActive = !!institution.responsibleTherapistActive;
  const isInstitutionActive = institution.isActive ?? true;

  const canResendActivation = !!onResendActivation && hasOperationalAccount && !isOperationalAccountActive;

  const [menuOpen, setMenuOpen] = useState(false);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [operationalEmail, setOperationalEmail] = useState("");
  const [createAccountError, setCreateAccountError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleCreateOperationalAccount = async (event: FormEvent) => {
    event.preventDefault();
    setCreateAccountError(null);
    const email = operationalEmail.trim();
    if (!email) {
      setCreateAccountError("Ingresa un email.");
      return;
    }
    await onCreateOperationalAccount?.({ institutionId: institution.id, email });
    setShowCreateAccount(false);
    setOperationalEmail("");
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <tr className="border-b border-app-border/40 hover:bg-app-surface/40 transition-colors">
        {/* Institution */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 h-8 w-8 rounded-lg bg-app-primary/10 flex items-center justify-center">
              <span className="text-xs font-black text-app-primary">
                {institution.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-app-text-main truncate">{institution.name}</p>
              {institution.legalName && (
                <p className="text-xs text-app-text-muted/60 truncate">{institution.legalName}</p>
              )}
            </div>
          </div>
        </td>

        {/* Responsible */}
        <td className="px-4 py-3">
          {institution.responsibleTherapistName ? (
            <div className="min-w-0">
              <p className="text-sm text-app-text-main truncate">{institution.responsibleTherapistName}</p>
              {institution.billingEmail && (
                <p className="text-xs text-app-text-muted/60 truncate">{institution.billingEmail}</p>
              )}
            </div>
          ) : (
            <span className="text-xs text-app-text-muted/40 italic">Sin cuenta operativa</span>
          )}
        </td>

        {/* Status */}
        <td className="px-4 py-3">
          <ActivationBadge
            hasAccount={hasOperationalAccount}
            isActive={isOperationalAccountActive}
            institutionSuspended={!isInstitutionActive}
          />
        </td>

        {/* Actions */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-1 justify-end">
            {/* Primary: quick overview */}
            {onOpenOverview && (
              <button
                type="button"
                title="Ver métricas"
                onClick={() => { closeMenu(); onOpenOverview(institution); }}
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-app-text-muted hover:text-app-primary hover:bg-app-primary/10 transition-colors"
              >
                <BarChart3 className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Edit */}
            <button
              type="button"
              title="Editar"
              onClick={() => { closeMenu(); onEdit(institution); }}
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-app-text-muted hover:text-app-primary hover:bg-app-primary/10 transition-colors"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>

            {/* More menu */}
            <div className="relative">
              <button
                type="button"
                title="Más acciones"
                onClick={() => setMenuOpen((v) => !v)}
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-app-text-muted hover:text-app-primary hover:bg-app-primary/10 transition-colors"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>

              {menuOpen && (
                <>
                  {/* Backdrop */}
                  <div className="fixed inset-0 z-10" onClick={closeMenu} />
                  <div className="absolute right-0 z-20 mt-1 w-52 rounded-xl border border-app-border bg-app-surface shadow-lg py-1">
                    {/* Resend activation */}
                    {canResendActivation && (
                      <button
                        type="button"
                        disabled={isResendingActivation}
                        onClick={() => { closeMenu(); onResendActivation?.(institution); }}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-app-text-main hover:bg-app-bg transition-colors disabled:opacity-60"
                      >
                        <RefreshCw className="h-3.5 w-3.5 text-app-text-muted" />
                        {isResendingActivation ? "Reenviando..." : "Reenviar activación"}
                      </button>
                    )}

                    {/* Create operational account */}
                    {!hasOperationalAccount && onCreateOperationalAccount && (
                      <button
                        type="button"
                        onClick={() => { closeMenu(); setShowCreateAccount(true); }}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-app-text-main hover:bg-app-bg transition-colors"
                      >
                        <UserPlus className="h-3.5 w-3.5 text-app-text-muted" />
                        Crear cuenta de acceso
                      </button>
                    )}

                    {/* Send billing email */}
                    {institution.billingEmail && (
                      <a
                        href={`mailto:${institution.billingEmail}`}
                        onClick={closeMenu}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-app-text-main hover:bg-app-bg transition-colors"
                      >
                        <Mail className="h-3.5 w-3.5 text-app-text-muted" />
                        Enviar email
                      </a>
                    )}

                    <div className="my-1 border-t border-app-border/40" />

                    {/* Toggle status */}
                    <button
                      type="button"
                      onClick={() => { closeMenu(); onToggleStatus(institution); }}
                      className={`flex w-full items-center gap-2.5 px-3 py-2 text-xs hover:bg-app-bg transition-colors ${isInstitutionActive ? "text-status-warning" : "text-status-success"}`}
                    >
                      <Power className="h-3.5 w-3.5" />
                      {isInstitutionActive ? "Suspender" : "Activar"}
                    </button>

                    {/* Delete */}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => { closeMenu(); setShowDeleteConfirm(true); }}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-status-error hover:bg-status-error/5 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Eliminar
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </td>
      </tr>

      {/* Create operational account modal */}
      <Modal
        isOpen={showCreateAccount}
        onClose={() => { setShowCreateAccount(false); setOperationalEmail(""); setCreateAccountError(null); }}
        title="Crear cuenta de acceso"
        subtitle={institution.name}
        size="sm"
        isLoading={isCreatingOperationalAccount}
        footer={
          <>
            <button
              type="button"
              onClick={() => { setShowCreateAccount(false); setOperationalEmail(""); setCreateAccountError(null); }}
              className="rounded-xl border border-app-border bg-app-surface px-5 py-2.5 text-sm font-medium text-app-text-muted transition-colors hover:text-app-text-main"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="create-account-form"
              disabled={isCreatingOperationalAccount}
              className="rounded-xl bg-app-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-app-primary/90 disabled:opacity-60"
            >
              {isCreatingOperationalAccount ? "Enviando..." : "Crear y enviar activación"}
            </button>
          </>
        }
      >
        <form id="create-account-form" onSubmit={handleCreateOperationalAccount} className="space-y-3">
          <p className="text-sm text-app-text-muted">
            Se enviará un email de activación al responsable de la institución.
          </p>
          <input
            type="email"
            placeholder="Email del responsable"
            value={operationalEmail}
            onChange={(e) => setOperationalEmail(e.target.value)}
            className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text-main outline-none focus:border-app-primary focus:ring-2 focus:ring-app-primary/25"
            required
            autoFocus
          />
          {createAccountError && (
            <p className="text-xs font-medium text-status-error">{createAccountError}</p>
          )}
        </form>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title={`Eliminar "${institution.name}"`}
        subtitle="Accion irreversible"
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="rounded-xl border border-app-border bg-app-surface px-5 py-2.5 text-sm font-medium text-app-text-muted transition-colors hover:text-app-text-main"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => { setShowDeleteConfirm(false); onDelete?.(institution); }}
              className="rounded-xl bg-status-error/10 border border-status-error/30 px-5 py-2.5 text-sm font-semibold text-status-error transition-colors hover:bg-status-error/20"
            >
              Si, eliminar
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-app-text-muted leading-relaxed">
            Estas por eliminar la institucion{" "}
            <span className="font-semibold text-app-text-main">{institution.name}</span>.
            Esta accion no se puede deshacer.
          </p>
          <div className="rounded-xl border border-status-error/20 bg-status-error/5 p-4">
            <p className="text-xs text-status-error/80 leading-relaxed">
              Los vouchers y sesiones asociadas no se van a borrar, pero la institucion
              dejara de aparecer en el sistema.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}
