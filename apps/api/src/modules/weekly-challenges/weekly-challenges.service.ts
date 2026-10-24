import { makeRepository } from "@/core/registry";
import { Service } from "@/core/service";
import { weekBounds, weekStartOf } from "@/modules/practice-plans";

import { WeeklyChallengesRepository } from "./ports";
import type { WeeklyChallengeView } from "./weekly-challenge.entity";
import { WEEKLY_TOP } from "./weekly-challenges.constants";
import { pickWeekly } from "./weekly-challenges.helpers";

export class WeeklyChallengesService extends Service {
  private readonly challenges = makeRepository(WeeklyChallengesRepository);

  public async current(
    userId: string,
    now = new Date(),
  ): Promise<WeeklyChallengeView | null> {
    const weekStart = weekStartOf(now);
    const problem = await this.featured(weekStart);

    if (!problem) return null;

    const { from, to } = weekBounds(weekStart);
    const window = { problemId: problem.id, from, to };
    const [standings, mine] = await Promise.all([
      this.challenges.standings(window, WEEKLY_TOP),
      this.challenges.standingOf(window, userId),
    ]);

    return { weekStart, endsAt: to, problem, standings, mine };
  }

  private async featured(weekStart: string) {
    const existing = await this.challenges.findWeek(weekStart);

    if (existing) return existing;

    const [candidates, history] = await Promise.all([
      this.challenges.candidates(),
      this.challenges.history(),
    ]);
    const picked = pickWeekly(candidates, history);

    if (!picked) return null;

    await this.challenges.feature(weekStart, picked.id);

    return (await this.challenges.findWeek(weekStart)) ?? picked;
  }
}
