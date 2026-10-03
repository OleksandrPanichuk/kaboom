const LABELS: Record<string, string> = {
  requirements: "Requirements",
  design: "Core design",
  scaling: "Scaling",
  reliability: "Reliability",
  delivery: "Delivery",
  operability: "Operability",
  communication: "Communication",
};

export const skillLabel = (skill: string): string => LABELS[skill] ?? skill;
