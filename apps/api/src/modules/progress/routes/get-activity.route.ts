import { defineRoute } from "@/core/route";

import { ACTIVITY_LIMIT } from "../progress.constants";
import { ActivityEntity } from "../progress.entity";
import { ActivityModel } from "../progress.model";
import type { ProgressActions } from "../progress.routes";

export const getActivityRoute = ({ getActivity }: ProgressActions) =>
  defineRoute({
    response: ActivityModel,
    summary: "Get the signed-in user's recent interviews and submissions",
    description:
      "The latest reviewed interviews and challenge submissions, newest first, with how many interviews have been reviewed and their average score.",
    auth: true,

    action: ({ user }) =>
      getActivity.execute({ userId: user.id, limit: ACTIVITY_LIMIT }),
    postAction: ({ output }) => ActivityEntity.normalize(output),
  });
