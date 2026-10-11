export const scoreTone = (score: number): string =>
  score >= 80
    ? "text-success-foreground"
    : score >= 40
      ? "text-warning-foreground"
      : "text-danger-foreground";
