import { defineRoute } from "@/core/route";

import { EntitlementsEntity } from "../entitlement.entity";
import { EntitlementsModel } from "../entitlements.model";
import type { EntitlementsActions } from "../entitlements.routes";

export const getMyEntitlementsRoute = ({
  getMyEntitlements,
}: EntitlementsActions) =>
  defineRoute({
    response: EntitlementsModel,
    summary: "What the caller's plan includes",
    description:
      "The limits and features of the plan the caller is on, the same table the pricing page draws. A feature a plan lacks answers 402 PLAN_LIMIT where it is used.",
    auth: true,

    action: ({ user }) => getMyEntitlements.execute({ userId: user.id }),
    postAction: ({ output }) => EntitlementsEntity.normalize(output),
  });
