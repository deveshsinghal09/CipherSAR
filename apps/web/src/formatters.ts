const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatInr(value: number): string {
  return inrFormatter.format(value);
}

export function localizeCurrencyText(value: string): string {
  return value
    .replace(/\bUSD\b/g, "INR")
    .replace(/\$(\d[\d,]*(?:\.\d+)?)/g, (_match, amount: string) =>
      formatInr(Number(amount.replaceAll(",", ""))),
    )
    .replaceAll("$", "₹");
}
