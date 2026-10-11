import { Repository } from "@/core/repository";

import type {
  CountedRule,
  LeaderboardFilter,
  LeaderboardProfileEntity,
  ListedStanding,
  UserStanding,
} from "../leaderboard.entity";

export abstract class LeaderboardRepository extends Repository {
  public abstract board(
    filter: LeaderboardFilter,
    limit: number,
  ): Promise<ListedStanding[]>;

  public abstract standingOf(
    userId: string,
    filter: LeaderboardFilter,
  ): Promise<UserStanding>;

  public abstract refresh(userId: string, problemId: string): Promise<void>;

  public abstract rebuild(fingerprint: string): Promise<boolean>;

  public abstract fingerprint(): Promise<string | null>;

  public abstract countedRules(): Promise<CountedRule[]>;

  public abstract refreshProblem(problemId: string): Promise<void>;

  public abstract findProfile(
    userId: string,
  ): Promise<LeaderboardProfileEntity | null>;
}
