import { defineRoute } from "@/core/route";

import { DesignEntity } from "../design.entity";
import { DesignModel } from "../design.model";
import type { DesignsActions } from "../designs.routes";
import { CreateDesignInput } from "../dto";

export const createDesignRoute = ({ createDesign }: DesignsActions) =>
  defineRoute({
    body: CreateDesignInput,
    response: DesignModel,
    summary: "Create a design",
    auth: true,

    action: ({ body, user }) =>
      createDesign.execute({ ownerId: user.id, name: body.name }),
    postAction: ({ output }) => DesignEntity.normalize(output),
  });
