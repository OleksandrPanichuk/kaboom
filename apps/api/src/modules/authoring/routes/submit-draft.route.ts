import { defineRoute } from "@/core/route";

import { SUBMIT_DRAFT_RATE_LIMIT } from "../authoring.constants";
import { ProblemDraftModel } from "../authoring.model";
import type { AuthoringActions } from "../authoring.routes";
import { DraftEntity } from "../draft.entity";
import { DraftParams } from "./draft-params";

export const submitDraftRoute = ({ submitDraft }: AuthoringActions) =>
  defineRoute({
    params: DraftParams,
    response: ProblemDraftModel,
    summary: "Send a draft to the moderators",
    description:
      "Runs the publish check first: 422 PROBLEM_NOT_PUBLISHABLE carries the issues in details. A new problem needs a slug nobody uses (409 SLUG_TAKEN); a published one keeps its slug (422 SLUG_CHANGED) and must differ from what is live (409 NOTHING_TO_REVIEW). One review waits at a time (409 REVIEW_PENDING). Editing afterwards changes the draft, not what was sent.",
    auth: true,
    verifiedEmail: true,
    rateLimit: SUBMIT_DRAFT_RATE_LIMIT,

    action: ({ params, user }) =>
      submitDraft.execute({ authorId: user.id, draftId: params.id }),
    postAction: ({ output }) => DraftEntity.normalize(output),
  });
