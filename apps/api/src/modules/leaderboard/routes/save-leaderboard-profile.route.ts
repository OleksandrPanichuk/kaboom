import { defineRoute } from "@/core/route";

import { SaveLeaderboardProfileInput } from "../dto";
import { SAVE_PROFILE_RATE_LIMIT } from "../leaderboard.constants";
import { LeaderboardProfileModel } from "../leaderboard.model";
import type { LeaderboardActions } from "../leaderboard.routes";

export const saveLeaderboardProfileRoute = ({
  saveLeaderboardProfile,
}: LeaderboardActions) =>
  defineRoute({
    body: SaveLeaderboardProfileInput,
    response: LeaderboardProfileModel,
    summary: "Choose a public handle and whether to be listed",
    description:
      "The handle is the only thing the leaderboard shows, never the name or the email. Answers 409 HANDLE_TAKEN when someone else holds it.",
    auth: true,
    rateLimit: SAVE_PROFILE_RATE_LIMIT,

    action: ({ body, user }) =>
      saveLeaderboardProfile.execute({
        userId: user.id,
        handle: body.handle,
        visible: body.visible,
      }),
    postAction: ({ output }) => ({
      handle: output.handle,
      visible: output.visible,
    }),
  });
