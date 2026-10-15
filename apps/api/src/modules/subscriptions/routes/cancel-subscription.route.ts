import { defineRoute } from "@/core/route";

import { SubscriptionEntity } from "../subscription.entity";
import { CHANGE_SUBSCRIPTION_RATE_LIMIT } from "../subscriptions.constants";
import { SubscriptionModel } from "../subscriptions.model";
import type { SubscriptionsActions } from "../subscriptions.routes";

export const cancelSubscriptionRoute = ({
  cancelSubscription,
}: SubscriptionsActions) =>
  defineRoute({
    response: SubscriptionModel,
    summary: "Cancel your subscription at the end of the period",
    description:
      "Pro stays until the period you paid for ends, and nothing more is charged; resume before then to keep it. A subscription whose first payment never went through ends at once.",
    auth: true,
    rateLimit: {
      ...CHANGE_SUBSCRIPTION_RATE_LIMIT,
      scope: "subscriptions:change",
      key: ({ user }) => `user:${user.id}`,
    },

    action: ({ user }) => cancelSubscription.execute({ userId: user.id }),
    postAction: ({ output }) => SubscriptionEntity.normalize(output),
  });
