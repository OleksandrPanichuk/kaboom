const format = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

export const formatBillingDate = (
  value: string | number | Date | null | undefined,
): string | null =>
  value === null || value === undefined ? null : format.format(new Date(value));
