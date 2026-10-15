export const formatMoney = (amount: number, currency: string): string => {
  const format = new Intl.NumberFormat("en", {
    style: "currency",
    currency: currency.toUpperCase(),
  });
  const digits = format.resolvedOptions().maximumFractionDigits ?? 2;
  const value = amount / 10 ** digits;

  return Number.isInteger(value)
    ? new Intl.NumberFormat("en", {
        style: "currency",
        currency: currency.toUpperCase(),
        maximumFractionDigits: 0,
      }).format(value)
    : format.format(value);
};
