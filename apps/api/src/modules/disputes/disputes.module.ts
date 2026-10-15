import { defineModule } from "@/core/module";
import { bind } from "@/core/registry";
import { registerBillingEventHandler } from "@/modules/billing-events";

import { DisputeEventHandler } from "./handlers";
import { DisputesRepository } from "./ports";
import { PostgresDisputesRepository } from "./repositories";

export const disputesModule = defineModule({
  name: "disputes",

  register: () => {
    bind(DisputesRepository, () => new PostgresDisputesRepository());
    registerBillingEventHandler("dispute", DisputeEventHandler);
  },
});
