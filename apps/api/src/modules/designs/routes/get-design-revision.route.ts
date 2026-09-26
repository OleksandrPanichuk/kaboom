import { defineRoute } from "@/core/route";

import { DesignRevisionModel } from "../design.model";
import { DesignRevisionEntity } from "../design-revision.entity";
import type { DesignsActions } from "../designs.routes";
import { DesignRevisionParams } from "./design-params";

export const getDesignRevisionRoute = ({ getDesignRevision }: DesignsActions) =>
  defineRoute({
    params: DesignRevisionParams,
    response: DesignRevisionModel,
    summary: "Get a design as it was at one revision",
    auth: true,

    action: ({ params, user }) =>
      getDesignRevision.execute({
        ownerId: user.id,
        id: params.id,
        number: params.number,
      }),
    postAction: ({ output }) => DesignRevisionEntity.normalize(output),
  });
