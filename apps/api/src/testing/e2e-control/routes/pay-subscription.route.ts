import { t } from "elysia";

import {
  type MemoryBillingProvider,
  signMemoryWebhook,
} from "@/adapters/billing-provider/memory.billing-provider";
import { NotFoundError } from "@/core/errors";
import { make, makeRepository, makeService } from "@/core/registry";
import { defineRoute } from "@/core/route";
import { BillingEventInboxService } from "@/modules/billing-events";
import { BillingProvider } from "@/modules/billing-provider";
import { SubscriptionsService } from "@/modules/subscriptions";
import { UsersRepository } from "@/modules/users";

export const paySubscriptionRoute = () =>
  defineRoute({
    body: t.Object({ email: t.String({ format: "email" }) }),
    response: t.Object({ message: t.String() }),
    summary:
      "Settle a user's pending subscription as the provider would after the payment form",

    action: async ({ body }) => {
      const user = await makeRepository(UsersRepository).findByEmail(
        body.email,
      );
      const current = user
        ? await makeService(SubscriptionsService).currentFor(user.id)
        : null;

      if (!current) {
        throw new NotFoundError("That user has no subscription to pay");
      }

      const provider = make(BillingProvider) as MemoryBillingProvider;
      const subscription = await provider.findSubscription(
        current.providerSubscriptionId,
      );

      if (!subscription) {
        throw new NotFoundError("The provider has no such subscription");
      }

      provider.setSubscription({ ...subscription, status: "active" });

      const payload = JSON.stringify({
        id: `evt_e2e_paid_${subscription.id}`,
        type: "customer.subscription.updated",
        topic: "subscription",
        objectId: subscription.id,
        customerId: subscription.customerId,
      });

      await makeService(BillingEventInboxService).receive(
        await provider.parseWebhook(payload, signMemoryWebhook(payload)),
      );

      return { message: "ok" };
    },
  });
