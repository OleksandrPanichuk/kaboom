import { Repository } from "@/core/repository";

import type {
  LeaderboardFilter,
  LeaderboardProfileEntity,
  Standing,
} from "../leaderboard.entity";

export interface SaveProfileData {
  userId: string;
  handle: string;
  visible: boolean;
}

export abstract class LeaderboardRepository extends Repository {
  public abstract standings(filter: LeaderboardFilter): Promise<Standing[]>;

  public abstract findProfile(
    userId: string,
  ): Promise<LeaderboardProfileEntity | null>;

  public abstract saveProfile(
    data: SaveProfileData,
  ): Promise<LeaderboardProfileEntity | null>;
}
