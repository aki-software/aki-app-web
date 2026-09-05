import { formatPaymentAmount, formatPaymentDate } from "../../payments/utils/payment-presenters";

export function formatPurchaseAmount(amount: string, currency: string): string {
  return formatPaymentAmount(Number(amount), currency);
}

export function formatAccreditationDate(value: string): string {
  return formatPaymentDate(value);
}

export function purchaseComparison(current: number, prior: number): string | null {
  if (prior <= 0) return null;
  const percentage = Math.round(((current - prior) / prior) * 100);
  if (percentage === 0) return "Sin variación respecto del período anterior.";
  return `${percentage > 0 ? "+" : ""}${percentage}% respecto del período anterior.`;
}

export function purchaseCountLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
