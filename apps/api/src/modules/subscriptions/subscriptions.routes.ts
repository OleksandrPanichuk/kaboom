import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import {
  cancelSubscriptionRoute,
  listSubscriptionChangesRoute,
  resumeSubscriptionRoute,
} from "./routes";
import type {
  CancelSubscriptionUseCase,
  ListSubscriptionChangesUseCase,
  ResumeSubscriptionUseCase,
} from "./use-cases";

export interface SubscriptionsActions {
  listSubscriptionChanges: Executable<ListSubscriptionChangesUseCase>;
  cancelSubscription: Executable<CancelSubscriptionUseCase>;
  resumeSubscription: Executable<ResumeSubscriptionUseCase>;
}

export const subscriptionsRoutes = (actions: SubscriptionsActions) =>
  new Elysia({ name: "subscriptions", prefix: "/billing/subscription" })
    .get("/changes", ...listSubscriptionChangesRoute(actions))
    .post("/cancel", ...cancelSubscriptionRoute(actions))
    .post("/resume", ...resumeSubscriptionRoute(actions));
