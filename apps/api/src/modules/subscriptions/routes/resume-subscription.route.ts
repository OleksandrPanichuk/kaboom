import { defineRoute } from "@/core/route";

import { SubscriptionEntity } from "../subscription.entity";
import { CHANGE_SUBSCRIPTION_RATE_LIMIT } from "../subscriptions.constants";
import { SubscriptionModel } from "../subscriptions.model";
import type { SubscriptionsActions } from "../subscriptions.routes";

export const resumeSubscriptionRoute = ({
  resumeSubscription,
}: SubscriptionsActions) =>
  defineRoute({
    response: SubscriptionModel,
    summary: "Keep a subscription you scheduled to cancel",
    description:
      "Undoes a cancellation that has not taken effect yet, so the subscription renews as before.",
    auth: true,
    rateLimit: {
      ...CHANGE_SUBSCRIPTION_RATE_LIMIT,
      scope: "subscriptions:change",
      key: ({ user }) => `user:${user.id}`,
    },

    action: ({ user }) => resumeSubscription.execute({ userId: user.id }),
    postAction: ({ output }) => SubscriptionEntity.normalize(output),
  });
