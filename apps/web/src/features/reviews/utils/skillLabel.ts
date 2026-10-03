const LABELS: Record<string, string> = {
  requirements: "Requirements",
  design: "Core design",
  scaling: "Scaling",
  reliability: "Reliability",
  communication: "Communication",
};

export const skillLabel = (skill: string): string => LABELS[skill] ?? skill;
