import { defineRoute } from "@/core/route";

import { DesignMessageModel } from "../design.model";
import type { DesignsActions } from "../designs.routes";
import { DesignParams } from "./design-params";

export const deleteDesignRoute = ({ deleteDesign }: DesignsActions) =>
  defineRoute({
    params: DesignParams,
    response: DesignMessageModel,
    summary: "Delete a design",
    auth: true,

    action: ({ params, user }) =>
      deleteDesign.execute({ ownerId: user.id, id: params.id }),
    postAction: () => ({ message: "ok" }),
  });
