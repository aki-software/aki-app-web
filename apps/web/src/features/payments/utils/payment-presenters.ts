const STATUS_LABELS: Record<string, string> = {
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  PENDING: "Pendiente",
  EXPIRED: "Expirado",
};

export function paymentGatewayLabel(gateway: string): string {
  return gateway === "MERCADO_PAGO" ? "Mercado Pago" : "Stripe";
}

export function paymentStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";

export function formatPaymentDate(value: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: ARGENTINA_TIME_ZONE,
  }).format(new Date(value));
}

export function formatPaymentTimestamp(value: string): string {
  const formatter = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: ARGENTINA_TIME_ZONE,
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(value)).map(({ type, value: partValue }) => [
      type,
      partValue,
    ]),
  );

  return `${parts.day} de ${parts.month} de ${parts.year}, ${parts.hour}:${parts.minute}`;
}

export function formatPaymentAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
