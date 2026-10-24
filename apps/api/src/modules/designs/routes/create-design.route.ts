import { defineRoute } from "@/core/route";

import { DesignEntity } from "../design.entity";
import { DesignModel } from "../design.model";
import type { DesignsActions } from "../designs.routes";
import { CreateDesignInput } from "../dto";

export const createDesignRoute = ({ createDesign }: DesignsActions) =>
  defineRoute({
    body: CreateDesignInput,
    response: DesignModel,
    summary: "Create a design, a system or a schema",
    auth: true,

    action: ({ body, user }) =>
      createDesign.execute({
        ownerId: user.id,
        name: body.name,
        kind: body.kind,
        origin: "sandbox",
      }),
    postAction: ({ output }) => DesignEntity.normalize(output),
  });
