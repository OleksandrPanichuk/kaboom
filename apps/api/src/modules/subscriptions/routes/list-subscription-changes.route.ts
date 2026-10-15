import {
  mapPage,
  PageModel,
  PageQuery,
  toPageRequest,
} from "@/core/pagination";
import { defineRoute } from "@/core/route";

import { SubscriptionChangeEntity } from "../subscription.entity";
import { SubscriptionChangeModel } from "../subscriptions.model";
import type { SubscriptionsActions } from "../subscriptions.routes";

export const listSubscriptionChangesRoute = ({
  listSubscriptionChanges,
}: SubscriptionsActions) =>
  defineRoute({
    query: PageQuery,
    response: PageModel(SubscriptionChangeModel),
    summary: "List what happened to your subscription, latest first",
    description:
      "Every change to every subscription you have had: when it started, renewed, changed plan, was scheduled to cancel or ended, and who made the change.",
    auth: true,

    action: ({ user, query }) =>
      listSubscriptionChanges.execute({
        userId: user.id,
        page: toPageRequest(query),
      }),
    postAction: ({ output }) =>
      mapPage(output, SubscriptionChangeEntity.normalize),
  });
