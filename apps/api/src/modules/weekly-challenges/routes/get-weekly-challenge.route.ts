import { defineRoute } from "@/core/route";

import { WeeklyChallengeEntity } from "../weekly-challenge.entity";
import { WeeklyChallengeResponseModel } from "../weekly-challenge.model";
import type { WeeklyChallengesActions } from "../weekly-challenges.routes";

export const getWeeklyChallengeRoute = ({
  getWeeklyChallenge,
}: WeeklyChallengesActions) =>
  defineRoute({
    response: WeeklyChallengeResponseModel,
    summary: "This week's challenge and who is leading it",
    description:
      "One official problem for the whole week, which starts on Monday in UTC. The first request of a week picks it, the one featured longest ago and from another track than last week's when it can, and the pick is stored, so it never changes. The standings are the best counted score of each person this week, among visible profiles; a score from an earlier week counts for nothing.",
    auth: true,

    action: ({ user }) => getWeeklyChallenge.execute({ userId: user.id }),
    postAction: ({ output, user }) => ({
      challenge:
        output === null
          ? null
          : WeeklyChallengeEntity.normalize(output, user.id),
    }),
  });
