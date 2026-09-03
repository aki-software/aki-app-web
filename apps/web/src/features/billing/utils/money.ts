import type { Money } from "@akit/contracts";

function formatterFor(currency: string): Intl.NumberFormat {
  return new Intl.NumberFormat(currency === "ARS" ? "es-AR" : "en-US", {
    maximumFractionDigits: 0,
    useGrouping: true,
  });
}

/** Formats two-decimal minor units without converting the amount to a Number. */
export function formatMoney({ amountMinor, currency }: Money): string {
  const amount = BigInt(amountMinor);
  const sign = amount < 0n ? "-" : "";
  const absoluteAmount = amount < 0n ? -amount : amount;
  const integer = absoluteAmount / 100n;
  const fraction = (absoluteAmount % 100n).toString().padStart(2, "0");
  const decimalSeparator = currency === "ARS" ? "," : ".";

  return `${currency} ${sign}${formatterFor(currency).format(integer)}${decimalSeparator}${fraction}`;
}
