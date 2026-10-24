import { defineRoute } from "@/core/route";

import { DesignQuotaModel } from "../design.model";
import type { DesignsActions } from "../designs.routes";

export const getDesignQuotaRoute = ({ getDesignQuota }: DesignsActions) =>
  defineRoute({
    response: DesignQuotaModel,
    summary: "How many designs of their own the caller may keep",
    description:
      "The plan's limit on designs made from the Designs page, null when there is none, and how many exist. Designs a problem, an interview or a problem draft opened are not counted. Creating one past the limit answers 402 PLAN_LIMIT.",
    auth: true,

    action: ({ user }) => getDesignQuota.execute({ ownerId: user.id }),
    postAction: ({ output }) => output,
  });
