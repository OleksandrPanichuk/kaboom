import { parseDesignOps } from "@repo/design";

import { defineRoute } from "@/core/route";

import { AppliedDesignOpsModel } from "../design.model";
import { DESIGN_OPS_RATE_LIMIT } from "../designs.constants";
import { DesignOpRejectedError } from "../designs.errors";
import type { DesignsActions } from "../designs.routes";
import { ApplyDesignOpsInput } from "../dto";
import { DesignParams } from "./design-params";

export const applyDesignOpsRoute = ({ applyDesignOps }: DesignsActions) =>
  defineRoute({
    params: DesignParams,
    body: ApplyDesignOpsInput,
    response: AppliedDesignOpsModel,
    summary: "Apply a batch of operations to a design",
    description:
      "Applies every operation or none. Answers 409 DESIGN_REVISION_CONFLICT when baseRevision is not the design's current revision, and 422 DESIGN_OP_REJECTED with the index and reason of the operation it refused.",
    auth: true,
    rateLimit: DESIGN_OPS_RATE_LIMIT,

    action: ({ params, body, user }) => {
      const parsed = parseDesignOps(body.ops);

      if (!parsed.ok) throw new DesignOpRejectedError(parsed);

      return applyDesignOps.execute({
        ownerId: user.id,
        id: params.id,
        author: "user",
        baseRevision: body.baseRevision,
        ops: parsed.ops,
      });
    },
    postAction: ({ output }) => ({
      revision: output.revision.number,
      graph: output.design.graph,
      graphHash: output.design.graphHash,
    }),
  });
