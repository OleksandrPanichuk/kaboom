import { defineRoute } from "@/core/route";

import { CREATE_DRAFT_RATE_LIMIT } from "../authoring.constants";
import { ProblemDraftModel } from "../authoring.model";
import type { AuthoringActions } from "../authoring.routes";
import { DraftEntity } from "../draft.entity";
import { CreateDraftInput } from "../dto";

export const createDraftRoute = ({ createDraft }: AuthoringActions) =>
  defineRoute({
    body: CreateDraftInput,
    response: ProblemDraftModel,
    summary: "Start a problem, blank or as a fork of a published one",
    description:
      "Needs a verified email. A fork copies the published problem's current version under a new slug and remembers where it came from. Answers 409 DRAFT_LIMIT past 20 drafts.",
    auth: true,
    verifiedEmail: true,
    rateLimit: CREATE_DRAFT_RATE_LIMIT,

    action: ({ body, user }) =>
      createDraft.execute({ authorId: user.id, forkOf: body.forkOf ?? null }),
    postAction: ({ output }) => DraftEntity.normalize(output),
  });
