import type { InstitutionOption } from "../../api/dashboard";

interface Props {
  institution: InstitutionOption;
}

export function statusBadge(isActive?: boolean) {
  return isActive ? (
    <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
      Activo
    </span>
  ) : (
    <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
      Pendiente
    </span>
  );
}

export function InstitutionCard({ institution }: Props) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40 hover:border-gray-200 dark:hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium text-gray-900 dark:text-white truncate" title={institution.name}>
          {institution.name}
        </div>
        {institution.responsibleTherapistName && (
          <div className="flex-shrink-0">
            {statusBadge(institution.responsibleTherapistActive)}
          </div>
        )}
      </div>
      <div className="mt-1 text-sm text-gray-500 dark:text-gray-400 truncate" title={institution.billingEmail ?? ""}>
        <span className="font-medium">Facturación:</span> {institution.billingEmail ?? "No informada"}
      </div>
      <div className="mt-1 text-sm text-gray-500 dark:text-gray-400 truncate" title={institution.responsibleTherapistName ?? ""}>
        <span className="font-medium">Responsable:</span> {institution.responsibleTherapistName ?? "Sin asignar"}
      </div>
    </div>
  );
}
