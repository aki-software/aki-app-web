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
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40 hover:border-gray-200 dark:hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-gray-900 dark:text-white truncate" title={therapist.name}>
            {therapist.name}
          </div>
          <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate" title={therapist.email ?? ""}>
            {therapist.email ?? "Sin email"}
          </div>
        </div>
        <div className="flex-shrink-0">
          {statusBadge(therapist.isActive)}
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 truncate">
        <span className="font-medium text-gray-400 dark:text-gray-500 uppercase text-[10px] mr-1">Institución:</span> 
        {therapist.institutionName ?? "Consultorio propio"}
      </div>
      {!therapist.isActive ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => onResend(therapist)}
            disabled={isResending}
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-60 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-950/30 transition-colors"
          >
            <Mail className="mr-1.5 h-3.5 w-3.5" />
            {isResending ? "Reenviando..." : "Reenviar invitación"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
