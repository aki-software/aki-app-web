import type { VoucherStatus } from "@akit/contracts";

interface StatusBadgeProps {
  isActive?: boolean;
  status?: VoucherStatus | string;
  type?: "institution" | "voucher";
  className?: string;
}

export function StatusBadge({ isActive, status, type = "institution", className = "" }: StatusBadgeProps) {
  if (type === "institution") {
    return isActive ? (
      <span className={`inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300 ${className}`}>
        Activo
      </span>
    ) : (
      <span className={`inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300 ${className}`}>
        Pendiente
      </span>
    );
  }

  // Voucher Status Badge logic
  const voucherStyles: Record<string, string> = {
    AVAILABLE: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    SENT: "border-blue-500/30 bg-blue-500/10 text-blue-300",
    USED: "border-purple-500/30 bg-purple-500/10 text-purple-300",
    EXPIRED: "border-rose-500/30 bg-rose-500/10 text-rose-300",
    REVOKED: "border-app-border bg-app-bg text-app-text-muted",
  };

  const voucherLabels: Record<string, string> = {
    AVAILABLE: "Disponible",
    SENT: "Enviado",
    USED: "Utilizado",
    EXPIRED: "Expirado",
    REVOKED: "Revocado",
  };

  const style = voucherStyles[status || ""] || voucherStyles.AVAILABLE;
  const label = voucherLabels[status || ""] || status || "Disponible";

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${style} ${className}`}>
      {label}
    </span>
  );
}

interface ActivationBadgeProps {
  hasAccount: boolean;
  isActive?: boolean;
  institutionSuspended?: boolean;
}

export function ActivationBadge({ hasAccount, isActive, institutionSuspended }: ActivationBadgeProps) {
  if (institutionSuspended) {
    return (
      <span className="inline-flex rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-300">
        Suspendida
      </span>
    );
  }

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
