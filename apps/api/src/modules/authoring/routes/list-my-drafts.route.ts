import { t } from "elysia";

import { defineRoute } from "@/core/route";

import { ProblemDraftSummaryModel } from "../authoring.model";
import type { AuthoringActions } from "../authoring.routes";
import { DraftEntity } from "../draft.entity";

export const listMyDraftsRoute = ({ listMyDrafts }: AuthoringActions) =>
  defineRoute({
    response: t.Array(ProblemDraftSummaryModel),
    summary: "List the problems you are writing",
    auth: true,

    action: ({ user }) => listMyDrafts.execute({ authorId: user.id }),
    postAction: ({ output }) =>
      output.map(({ draft, reviews, problemSlug }) =>
        DraftEntity.summary(draft, reviews, problemSlug),
      ),
  });
