import { formatPaymentAmount, formatPaymentDate } from "../../payments/utils/payment-presenters";

export interface PurchaseAmountTotal {
  currency: string;
  amount: string;
}

export function formatPurchaseAmount(amount: string, currency: string): string {
  return formatPaymentAmount(Number(amount), currency);
}

export function purchaseAmountComparison(
  current: PurchaseAmountTotal[],
  prior: PurchaseAmountTotal[],
): string | null {
  if (
    current.length !== 1 ||
    prior.length !== 1 ||
    current[0].currency !== prior[0].currency
  ) {
    return null;
  }

  return purchaseComparison(Number(current[0].amount), Number(prior[0].amount));
}

export function purchaseAmountPresentation(amounts: PurchaseAmountTotal[]): {
  value: string;
  description: string;
} {
  if (amounts.length === 0) {
    return { value: "Sin compras", description: "No hubo compras acreditadas en este período." };
  }

  if (amounts.length === 1) {
    return {
      value: formatPurchaseAmount(amounts[0].amount, amounts[0].currency),
      description: `Monto acreditado en ${amounts[0].currency}.`,
    };
  }

  return {
    value: `${amounts.length} monedas`,
    description: amounts
      .map(({ amount, currency }) => formatPurchaseAmount(amount, currency))
      .join(" · "),
  };
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
