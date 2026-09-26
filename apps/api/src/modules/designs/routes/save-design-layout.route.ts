import { defineRoute } from "@/core/route";

import { DesignMessageModel } from "../design.model";
import { DESIGN_LAYOUT_RATE_LIMIT } from "../designs.constants";
import type { DesignsActions } from "../designs.routes";
import { SaveDesignLayoutInput } from "../dto";
import { DesignParams } from "./design-params";

export const saveDesignLayoutRoute = ({ saveDesignLayout }: DesignsActions) =>
  defineRoute({
    params: DesignParams,
    body: SaveDesignLayoutInput,
    response: DesignMessageModel,
    summary: "Save where the design's nodes sit on the canvas",
    description:
      "Replaces the whole layout. Creates no revision and leaves the design's revision and updatedAt alone.",
    auth: true,
    rateLimit: DESIGN_LAYOUT_RATE_LIMIT,

    action: ({ params, body, user }) =>
      saveDesignLayout.execute({
        ownerId: user.id,
        id: params.id,
        layout: body.layout,
      }),
    postAction: () => ({ message: "ok" }),
  });
