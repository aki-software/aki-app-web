import { Mail } from "lucide-react";
import type { TherapistOption } from "../../api/dashboard";
import { statusBadge } from "./InstitutionCard";

interface Props {
  therapist: TherapistOption;
  onResend: (therapist: TherapistOption) => void;
  isResending: boolean;
}

export function TherapistCard({ therapist, onResend, isResending }: Props) {
  return (
    <div className="rounded-xl border border-app-border bg-app-bg p-4 transition-colors hover:border-app-primary/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div
            className="truncate font-medium text-app-text-main"
            title={therapist.name}
          >
            {therapist.name}
          </div>
          <div
            className="mt-0.5 truncate text-xs text-app-text-muted"
            title={therapist.email ?? ""}
          >
            {therapist.email ?? "Sin email"}
          </div>
        </div>
        <div className="flex-shrink-0">{statusBadge(therapist.isActive)}</div>
      </div>
      <div className="mt-2 truncate text-xs text-app-text-muted">
        <span className="mr-1 text-[10px] font-medium uppercase text-app-text-muted/70">
          Institucion:
        </span>
        {therapist.institutionName ?? "Consultorio propio"}
      </div>
      {!therapist.isActive ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => onResend(therapist)}
            disabled={isResending}
            className="inline-flex w-full items-center justify-center rounded-lg border border-app-border bg-app-surface px-3 py-1.5 text-xs font-medium text-app-text-main transition-colors hover:border-app-primary/40 hover:text-app-primary disabled:opacity-60 sm:w-auto"
          >
            <Mail className="mr-1.5 h-3.5 w-3.5" />
            {isResending ? "Reenviando..." : "Reenviar invitación"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
