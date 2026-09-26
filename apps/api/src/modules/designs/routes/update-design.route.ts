import { defineRoute } from "@/core/route";

import { DesignEntity } from "../design.entity";
import { DesignModel } from "../design.model";
import type { DesignsActions } from "../designs.routes";
import { UpdateDesignInput } from "../dto";
import { DesignParams } from "./design-params";

export const updateDesignRoute = ({ updateDesign }: DesignsActions) =>
  defineRoute({
    params: DesignParams,
    body: UpdateDesignInput,
    response: DesignModel,
    summary: "Update a design",
    auth: true,

    action: ({ params, body, user }) =>
      updateDesign.execute({
        ownerId: user.id,
        id: params.id,
        name: body.name,
      }),
    postAction: ({ output }) => DesignEntity.normalize(output),
  });
