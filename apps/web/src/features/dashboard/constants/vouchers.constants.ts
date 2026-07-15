export const ITEMS_PER_PAGE = 10;
export const DETAIL_ITEMS_PER_PAGE = 10;
export const PERIOD_DAYS = 30;

export const VOUCHER_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Disponible",
  USED: "Consumido",
  EXPIRED: "Vencido",
  REVOKED: "Revocado",
  SENT: "Enviado",
};

export const VOUCHER_STATUS_CLASSES: Record<string, string> = {
  AVAILABLE: "border-status-success/30 bg-status-success/10 text-status-success",
  USED: "border-status-warning/30 bg-status-warning/10 text-status-warning",
  EXPIRED: "border-status-error/30 bg-status-error/10 text-status-error",
  REVOKED: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
  SENT: "border-sky-500/30 bg-sky-500/10 text-sky-300",
};

export const getStatusLabel = (status: string) => VOUCHER_STATUS_LABELS[status] || status;
export const getStatusPillClass = (status: string) => VOUCHER_STATUS_CLASSES[status] || "border-app-border bg-app-bg text-app-text-muted";