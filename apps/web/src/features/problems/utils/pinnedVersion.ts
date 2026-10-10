import type { AttemptModel } from "@repo/api-client";

export const pinnedVersion = (
  attempt: Pick<AttemptModel, "problemVersion" | "latestVersion"> | null,
): number | undefined =>
  attempt && attempt.problemVersion !== attempt.latestVersion
    ? attempt.problemVersion
    : undefined;
