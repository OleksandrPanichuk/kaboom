import { defineRoute } from "@/core/route";

import { AchievementsEntity } from "../achievements.entity";
import { AchievementsModel } from "../achievements.model";
import type { AchievementsActions } from "../achievements.routes";

export const getMyAchievementsRoute = ({
  getMyAchievements,
}: AchievementsActions) =>
  defineRoute({
    response: AchievementsModel,
    summary: "The caller's practice streak and badges",
    description:
      "Worked out from what the caller has done, so nothing is stored. A day is a UTC day with a submission or an interview started, and a streak survives until the end of the day after its last one. A problem the caller wrote counts for nothing here, as on the leaderboard.",
    auth: true,

    action: ({ user }) => getMyAchievements.execute({ userId: user.id }),
    postAction: ({ output }) => AchievementsEntity.normalize(output),
  });
