import { Elysia } from "elysia";

import { getEnv, NodeEnv } from "@/configs";
import { defineModule } from "@/core/module";

import {
  lastEmailRoute,
  paySubscriptionRoute,
  resetLimitsRoute,
  scriptModelRoute,
} from "./routes";

export const e2eControlModule = defineModule({
  name: "e2e-control",

  routes: () => {
    const env = getEnv();
    const routes = new Elysia({ name: "e2e-control", prefix: "/e2e" });

    if (env.NODE_ENV !== NodeEnv.Test || !env.E2E_CONTROL) return routes;

    return routes
      .get("/emails/last", ...lastEmailRoute())
      .post("/llm/script", ...scriptModelRoute())
      .post("/billing/pay", ...paySubscriptionRoute())
      .post("/rate-limits/reset", ...resetLimitsRoute());
  },
});
