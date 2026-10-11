import { defineRoute } from "@/core/route";

import { SAVE_DRAFT_RATE_LIMIT } from "../authoring.constants";
import { ProblemDraftModel } from "../authoring.model";
import type { AuthoringActions } from "../authoring.routes";
import { DraftEntity } from "../draft.entity";
import { SaveDraftInput } from "../dto";
import { DraftParams } from "./draft-params";

export const saveDraftRoute = ({ saveDraft }: AuthoringActions) =>
  defineRoute({
    params: DraftParams,
    body: SaveDraftInput,
    response: ProblemDraftModel,
    summary: "Save a draft as it stands",
    description:
      "Stores the content even when it does not parse, and answers what does not parse yet, each issue with its path. At most 512 KB (422 DRAFT_TOO_LARGE).",
    auth: true,
    rateLimit: SAVE_DRAFT_RATE_LIMIT,

    action: ({ params, body, user }) =>
      saveDraft.execute({
        authorId: user.id,
        draftId: params.id,
        content: body.content,
      }),
    postAction: ({ output }) => DraftEntity.normalize(output),
  });
