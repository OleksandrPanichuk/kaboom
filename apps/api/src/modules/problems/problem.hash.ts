import { createHash } from "node:crypto";

import type { ProblemContent } from "@repo/design";

const stable = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stable);

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stable((value as Record<string, unknown>)[key])]),
    );
  }

  return value;
};

export const hashProblem = (content: ProblemContent): string =>
  createHash("sha256")
    .update(JSON.stringify(stable(content)))
    .digest("hex");
