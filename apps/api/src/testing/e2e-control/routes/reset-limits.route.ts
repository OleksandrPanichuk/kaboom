import { t } from "elysia";

import type { MemoryRateLimitStore } from "@/adapters/rate-limit/memory.rate-limit-store";
import { make } from "@/core/registry";
import { defineRoute } from "@/core/route";
import { RateLimitStore } from "@/platform/rate-limit";

export const resetLimitsRoute = () =>
  defineRoute({
    response: t.Object({ message: t.String() }),
    summary:
      "Forget every rate-limit counter, so one machine can sign up again",

    action: () => {
      (make(RateLimitStore) as MemoryRateLimitStore).clear();

      return Promise.resolve({ message: "ok" });
    },
  });
