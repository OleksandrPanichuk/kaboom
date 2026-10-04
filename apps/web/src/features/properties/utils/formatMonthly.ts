export const formatMonthly = (usd: number): string =>
  `$${Math.round(usd).toLocaleString("en")}`;
