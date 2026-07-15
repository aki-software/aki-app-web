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
      <span className={`inline-flex rounded-full border border-status-success/30 bg-status-success/10 px-2 py-0.5 text-[11px] font-medium text-status-success ${className}`}>
        Activo
      </span>
    ) : (
      <span className={`inline-flex rounded-full border border-status-warning/30 bg-status-warning/10 px-2 py-0.5 text-[11px] font-medium text-status-warning ${className}`}>
        Pendiente
      </span>
    );
  }

  // Voucher Status Badge logic
  const voucherStyles: Record<string, string> = {
    AVAILABLE: "border-status-success/30 bg-status-success/10 text-status-success",
    SENT: "border-app-primary/30 bg-app-primary/10 text-app-primary",
    USED: "border-purple-500/30 bg-purple-500/10 text-purple-300",
    EXPIRED: "border-status-error/30 bg-status-error/10 text-status-error",
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
      <span className="inline-flex rounded-full border border-status-error/30 bg-status-error/10 px-2 py-0.5 text-[11px] font-medium text-status-error">
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
    <span className="inline-flex rounded-full border border-status-success/30 bg-status-success/10 px-2 py-0.5 text-[11px] font-medium text-status-success">
      Activa
    </span>
  ) : (
    <span className="inline-flex rounded-full border border-status-warning/30 bg-status-warning/10 px-2 py-0.5 text-[11px] font-medium text-status-warning">
      Activación pendiente
    </span>
  );
}
