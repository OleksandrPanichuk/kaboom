import { t } from "elysia";

import { defineRoute } from "@/core/route";

import type { AuthoringActions } from "../authoring.routes";
import { DraftParams } from "./draft-params";

export const deleteDraftRoute = ({ deleteDraft }: AuthoringActions) =>
  defineRoute({
    params: DraftParams,
    response: t.Object({ deleted: t.Literal(true) }),
    summary: "Delete a draft",
    description:
      "A problem it already published stays published; only the working copy goes.",
    auth: true,

    action: ({ params, user }) =>
      deleteDraft.execute({ authorId: user.id, draftId: params.id }),
    postAction: () => ({ deleted: true as const }),
  });
