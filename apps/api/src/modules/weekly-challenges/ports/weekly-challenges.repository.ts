import { Repository } from "@/core/repository";

import type {
  FeaturedProblem,
  FeaturedWeek,
  WeeklyMine,
  WeeklyStandings,
} from "../weekly-challenge.entity";

export interface WeeklyWindow {
  problemId: string;
  from: Date;
  to: Date;
}

export abstract class WeeklyChallengesRepository extends Repository {
  public abstract findWeek(weekStart: string): Promise<FeaturedProblem | null>;

  public abstract candidates(): Promise<FeaturedProblem[]>;

  public abstract history(): Promise<FeaturedWeek[]>;

  public abstract feature(weekStart: string, problemId: string): Promise<void>;

  public abstract standings(
    window: WeeklyWindow,
    limit: number,
  ): Promise<WeeklyStandings>;

  public abstract standingOf(
    window: WeeklyWindow,
    userId: string,
  ): Promise<WeeklyMine>;
}
