import { MemoryBillingProvider } from "@/adapters/billing-provider/memory.billing-provider";
import { StripeBillingProvider } from "@/adapters/billing-provider/stripe";
import { UnavailableBillingProvider } from "@/adapters/billing-provider/unavailable.billing-provider";
import { NodeEnv } from "@/configs";
import { defineModule } from "@/core/module";
import { bind } from "@/core/registry";

import { BillingProvider } from "./ports";

export const billingProviderModule = defineModule({
  name: "billing-provider",

  register: ({ env }) => {
    if (env.NODE_ENV === NodeEnv.Test) {
      const provider = new MemoryBillingProvider();

      bind(BillingProvider, () => provider);

      return;
    }

    const provider =
      env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET
        ? new StripeBillingProvider({
            secretKey: env.STRIPE_SECRET_KEY,
            webhookSecret: env.STRIPE_WEBHOOK_SECRET,
            appName: env.APP_NAME,
          })
        : new UnavailableBillingProvider();

    bind(BillingProvider, () => provider);
  },
});
