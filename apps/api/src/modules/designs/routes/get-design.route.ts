import { defineRoute } from "@/core/route";

import { DesignEntity } from "../design.entity";
import { DesignModel } from "../design.model";
import type { DesignsActions } from "../designs.routes";
import { DesignParams } from "./design-params";

export const getDesignRoute = ({ getDesign }: DesignsActions) =>
  defineRoute({
    params: DesignParams,
    response: DesignModel,
    summary: "Get a design",
    auth: true,

    action: ({ params, user }) =>
      getDesign.execute({ ownerId: user.id, id: params.id }),
    postAction: ({ output }) => DesignEntity.normalize(output),
  });
