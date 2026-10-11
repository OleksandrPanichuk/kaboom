import { t } from "elysia";

import { defineRoute } from "@/core/route";

import type { AuthoringActions } from "../authoring.routes";
import { DraftDesignParams } from "./draft-design-params";

export const openDraftDesignRoute = ({ openDraftDesign }: AuthoringActions) =>
  defineRoute({
    params: DraftDesignParams,
    response: t.Object({ designId: t.String({ format: "uuid" }) }),
    summary: "Open the design a draft's baseline or reference is drawn in",
    description:
      "Creates it from the draft's graph the first time, or answers the one already linked. From then on the draft reads that graph from the design, so the canvas is where it is edited.",
    auth: true,

    action: ({ params, user }) =>
      openDraftDesign.execute({
        authorId: user.id,
        draftId: params.id,
        part: params.part,
      }),
  });
