import { makeService } from "@/core/registry";
import { ScoreBoard } from "@/modules/submissions";

import { LeaderboardService } from "./leaderboard.service";

export class LeaderboardScoreBoard extends ScoreBoard {
  public scored(userId: string, problemId: string): Promise<void> {
    return makeService(LeaderboardService).refresh(userId, problemId);
  }
}
