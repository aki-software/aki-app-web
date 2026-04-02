import type { InstitutionOption } from "../../api/dashboard";

interface Props {
  institution: InstitutionOption;
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

export function InstitutionCard({ institution }: Props) {
  return (
    <div className="rounded-xl border border-app-border bg-app-bg p-4 transition-colors hover:border-app-primary/30">
      <div className="flex items-start justify-between gap-2">
        <div
          className="truncate font-medium text-app-text-main"
          title={institution.name}
        >
          {institution.name}
        </div>
        {institution.responsibleTherapistName && (
          <div className="flex-shrink-0">
            {statusBadge(institution.responsibleTherapistActive)}
          </div>
        )}
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
        <span className="font-medium">Responsable:</span>{" "}
        {institution.responsibleTherapistName ?? "Sin asignar"}
      </div>
    </div>
  );
}
