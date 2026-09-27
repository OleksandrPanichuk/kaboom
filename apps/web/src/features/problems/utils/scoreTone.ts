export const scoreTone = (score: number): string =>
  score >= 80
    ? "text-emerald-700"
    : score >= 40
      ? "text-amber-700"
      : "text-red-700";
