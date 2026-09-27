const LABELS: Record<string, string> = {
  requirements: "Requirements",
  "high-level": "High-level design",
  "deep-dive": "Deep dive",
  "wrap-up": "Wrap-up",
};

export const phaseLabel = (phase: string): string => LABELS[phase] ?? phase;
