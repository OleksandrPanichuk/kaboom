import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import { listSubscriptionChangesRoute } from "./routes";
import type { ListSubscriptionChangesUseCase } from "./use-cases";

export interface SubscriptionsActions {
  listSubscriptionChanges: Executable<ListSubscriptionChangesUseCase>;
}

export const subscriptionsRoutes = (actions: SubscriptionsActions) =>
  new Elysia({ name: "subscriptions", prefix: "/billing/subscription" }).get(
    "/changes",
    ...listSubscriptionChangesRoute(actions),
  );
