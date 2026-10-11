import { Repository } from "@/core/repository";

import type {
  LeaderboardFilter,
  LeaderboardProfileEntity,
  ListedStanding,
  OfficialRule,
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

  public abstract officialRules(): Promise<OfficialRule[]>;

  public abstract findProfile(
    userId: string,
  ): Promise<LeaderboardProfileEntity | null>;
}
