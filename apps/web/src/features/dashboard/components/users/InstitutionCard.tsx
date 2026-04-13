import { BarChart3, Edit2, Mail, Power, UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { InstitutionOption } from "../../api/dashboard";
  
interface Props {
  institution: InstitutionOption;
  onEdit: (institution: InstitutionOption) => void;
  onToggleStatus: (institution: InstitutionOption) => void;
  onOpenOverview?: (institution: InstitutionOption) => void;
  onResendActivation?: (institution: InstitutionOption) => void;
  isResendingActivation?: boolean;
  onCreateOperationalAccount?: (args: {
    institutionId: string;
    email: string;
  }) => Promise<void>;
  isCreatingOperationalAccount?: boolean;
}
 
export function statusBadge(isActive?: boolean) {

  return isActive ? (
    <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
      Activo
    </span>
  ) : (
    <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">
      Pendiente
    </span>
  );
}

function activationBadge(hasAccount: boolean, isActive?: boolean) {
  if (!hasAccount) {
    return (
      <span className="inline-flex rounded-full border border-app-border bg-app-bg px-2 py-0.5 text-[11px] font-medium text-app-text-muted">
        Sin cuenta operativa
      </span>
    );
  }

  return isActive ? (
    <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
      Activa
    </span>
  ) : (
    <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">
      Activación pendiente
    </span>
  );
}

export function InstitutionCard({
  institution,
  onEdit,
  onToggleStatus,
  onOpenOverview,
  onResendActivation,
  isResendingActivation,
  onCreateOperationalAccount,
  isCreatingOperationalAccount,
}: Props) {
  const hasOperationalAccount = !!institution.responsibleTherapistUserId;
  const isOperationalAccountActive = !!institution.responsibleTherapistActive;
  const canResendActivation =
    !!onResendActivation &&
    hasOperationalAccount &&
    !isOperationalAccountActive;

  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [operationalEmail, setOperationalEmail] = useState("");
  const [createAccountError, setCreateAccountError] = useState<string | null>(null);

  const handleCreateOperationalAccount = async (event: FormEvent) => {
    event.preventDefault();
    setCreateAccountError(null);

    const email = operationalEmail.trim();
    if (!email) {
      setCreateAccountError("Ingresá un email.");
      return;
    }

    await onCreateOperationalAccount?.({ institutionId: institution.id, email });
    setShowCreateAccount(false);
    setOperationalEmail("");
  };

  return (
    <div className="rounded-xl border border-app-border bg-app-bg p-4 transition-colors hover:border-app-primary/30">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div
            className="truncate font-medium text-app-text-main"
            title={institution.name}
          >
            {institution.name}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-xs text-app-text-muted">Cuenta operativa:</span>
            {activationBadge(hasOperationalAccount, isOperationalAccountActive)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!hasOperationalAccount && onCreateOperationalAccount ? (
            <button
              type="button"
              onClick={() => {
                setCreateAccountError(null);
                setOperationalEmail("");
                setShowCreateAccount((prev) => !prev);
              }}
              className="hidden md:inline-flex items-center justify-center rounded-lg border border-app-border bg-app-surface px-2.5 py-1.5 text-xs font-medium text-app-text-main transition-colors hover:border-app-primary/40 hover:text-app-primary"
              title="Crear cuenta operativa"
            >
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />
              Crear cuenta
            </button>
          ) : null}

          {canResendActivation ? (
            <button
              type="button"
              onClick={() => onResendActivation?.(institution)}
              disabled={!!isResendingActivation}
              className="hidden md:inline-flex items-center justify-center rounded-lg border border-app-border bg-app-surface px-2.5 py-1.5 text-xs font-medium text-app-text-main transition-colors hover:border-app-primary/40 hover:text-app-primary disabled:opacity-60"
              title="Reenviar activación"
            >
              <Mail className="mr-1.5 h-3.5 w-3.5" />
              {isResendingActivation ? "Reenviando..." : "Reenviar activación"}
            </button>
          ) : null}

          {onOpenOverview ? (
            <button
              onClick={() => onOpenOverview(institution)}
              className="p-1.5 rounded-lg text-app-text-muted hover:text-app-primary hover:bg-app-primary/10 transition-colors"
              title="Ver overview"
            >
              <BarChart3 className="h-4 w-4" />
            </button>
          ) : null}

          <button
            onClick={() => onEdit(institution)}
            className="p-1.5 rounded-lg text-app-text-muted hover:text-app-primary hover:bg-app-primary/10 transition-colors"
            title="Editar"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onToggleStatus(institution)}
            className="p-1.5 rounded-lg text-app-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
            title={institution.responsibleTherapistActive ? "Suspender" : "Activar"}
          >
            <Power className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div
        className="mt-1 truncate text-sm text-app-text-muted"
        title={institution.billingEmail ?? ""}
      >
        <span className="font-medium">Facturación:</span>{" "}
        {institution.billingEmail ?? "No informada"}
      </div>
      <div
        className="mt-1 truncate text-sm text-app-text-muted"
        title={institution.responsibleTherapistName ?? ""}
      >
        <span className="font-medium">Cuenta operativa:</span>{" "}
        {institution.responsibleTherapistName ?? "Sin asignar"}
      </div>

      {canResendActivation ? (
        <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="text-xs text-app-text-muted">
            La cuenta operativa todavia no activo su acceso. Si el link vencio o
            no lo encontro, podes reenviar la activacion.
          </p>
          <button
            type="button"
            onClick={() => onResendActivation?.(institution)}
            disabled={!!isResendingActivation}
            className="mt-2 inline-flex items-center justify-center rounded-lg border border-app-border bg-app-surface px-3 py-1.5 text-xs font-medium text-app-text-main transition-colors hover:border-app-primary/40 hover:text-app-primary disabled:opacity-60"
            title="Reenviar activación"
          >
            <Mail className="mr-1.5 h-3.5 w-3.5" />
            {isResendingActivation ? "Reenviando..." : "Reenviar activación"}
          </button>
        </div>
      ) : null}

      {!hasOperationalAccount && onCreateOperationalAccount ? (
        <div className="mt-3 rounded-lg border border-app-border bg-app-surface p-3">
          <p className="text-xs text-app-text-muted">
            Esta institución fue creada sin cuenta operativa. Creala para que
            pueda iniciar sesión y gestionar vouchers.
          </p>

          {showCreateAccount ? (
            <form onSubmit={handleCreateOperationalAccount} className="mt-2 flex flex-col gap-2">
              <input
                type="email"
                placeholder="Email de acceso"
                value={operationalEmail}
                onChange={(e) => setOperationalEmail(e.target.value)}
                className="w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 text-xs text-app-text-main outline-none focus:border-app-primary focus:ring-2 focus:ring-app-primary/25"
                required
              />
              {createAccountError ? (
                <p className="text-xs font-medium text-rose-300">
                  {createAccountError}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={!!isCreatingOperationalAccount}
                  className="inline-flex items-center justify-center rounded-lg border border-app-border bg-app-bg px-3 py-1.5 text-xs font-medium text-app-text-main transition-colors hover:border-app-primary/40 hover:text-app-primary disabled:opacity-60"
                >
                  <Mail className="mr-1.5 h-3.5 w-3.5" />
                  {isCreatingOperationalAccount
                    ? "Enviando activación..."
                    : "Crear y enviar activación"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateAccount(false);
                    setOperationalEmail("");
                    setCreateAccountError(null);
                  }}
                  className="inline-flex items-center justify-center rounded-lg border border-app-border bg-transparent px-3 py-1.5 text-xs font-medium text-app-text-muted transition-colors hover:text-app-text-main disabled:opacity-60"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowCreateAccount(true)}
              className="mt-2 inline-flex items-center justify-center rounded-lg border border-app-border bg-app-bg px-3 py-1.5 text-xs font-medium text-app-text-main transition-colors hover:border-app-primary/40 hover:text-app-primary"
            >
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />
              Crear cuenta operativa
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
