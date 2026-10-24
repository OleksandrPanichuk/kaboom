import type { FeaturedProblem, FeaturedWeek } from "./weekly-challenge.entity";

export const pickWeekly = (
  candidates: readonly FeaturedProblem[],
  history: readonly FeaturedWeek[],
): FeaturedProblem | null => {
  const lastFeatured = new Map<string, string>();
  let latest: FeaturedWeek | undefined;

  for (const week of history) {
    if ((lastFeatured.get(week.problemId) ?? "") < week.weekStart) {
      lastFeatured.set(week.problemId, week.weekStart);
    }

    if (!latest || latest.weekStart < week.weekStart) latest = week;
  }

  const ranked = candidates
    .map((problem) => ({
      problem,
      featuredOn: lastFeatured.get(problem.id) ?? "",
      sameTrack: problem.track === latest?.track ? 1 : 0,
    }))
    .sort(
      (a, b) =>
        a.featuredOn.localeCompare(b.featuredOn) ||
        a.sameTrack - b.sameTrack ||
        a.problem.slug.localeCompare(b.problem.slug),
    );

  return ranked[0]?.problem ?? null;
};
