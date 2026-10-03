import { defineRoute } from "@/core/route";

import { ProgressModel } from "../submission.model";
import type { SubmissionsActions } from "../submissions.routes";

export const getProgressRoute = ({ getProgress }: SubmissionsActions) =>
  defineRoute({
    response: ProgressModel,
    summary: "The solver's points, rank and best score per official problem",
    auth: true,

    action: ({ user }) => getProgress.execute({ userId: user.id }),
  });
