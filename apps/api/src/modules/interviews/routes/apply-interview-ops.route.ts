import { parseDesignOps } from "@repo/design";

import { defineRoute } from "@/core/route";
import {
  AppliedDesignOpsModel,
  ApplyDesignOpsInput,
  DesignOpRejectedError,
} from "@/modules/designs";

import { INTERVIEW_OPS_RATE_LIMIT } from "../interviews.constants";
import type { InterviewsActions } from "../interviews.routes";
import { InterviewParams } from "./interview-params";

export const applyInterviewOpsRoute = ({
  applyInterviewOps,
}: InterviewsActions) =>
  defineRoute({
    params: InterviewParams,
    body: ApplyDesignOpsInput,
    response: AppliedDesignOpsModel,
    summary: "Change the interview's design",
    description:
      "The same contract as POST /designs/:id/ops, and it tells the interviewer. Answers 409 INTERVIEW_NOT_ACTIVE once the interview has ended.",
    auth: true,
    rateLimit: INTERVIEW_OPS_RATE_LIMIT,

    action: ({ params, body, user }) => {
      const parsed = parseDesignOps(body.ops);

      if (!parsed.ok) throw new DesignOpRejectedError(parsed);

      return applyInterviewOps.execute({
        ownerId: user.id,
        id: params.id,
        author: "user",
        baseRevision: body.baseRevision,
        ops: parsed.ops,
      });
    },
    postAction: ({ output }) => ({
      revision: output.revision,
      graph: output.graph,
      graphHash: output.graphHash,
    }),
  });
