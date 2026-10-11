import { defineRoute } from "@/core/route";

import { ProblemDraftModel } from "../authoring.model";
import type { AuthoringActions } from "../authoring.routes";
import { DraftEntity } from "../draft.entity";
import { DraftParams } from "./draft-params";

export const getDraftRoute = ({ getDraft }: AuthoringActions) =>
  defineRoute({
    params: DraftParams,
    response: ProblemDraftModel,
    summary: "Get one of your drafts, with its reviews",
    auth: true,

    action: ({ params, user }) =>
      getDraft.execute({ authorId: user.id, draftId: params.id }),
    postAction: ({ output }) => DraftEntity.normalize(output),
  });
