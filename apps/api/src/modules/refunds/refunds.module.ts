import { defineModule } from "@/core/module";
import { bind } from "@/core/registry";
import { registerBillingEventHandler } from "@/modules/billing-events";

import { RefundEventHandler } from "./handlers";
import { RefundsRepository } from "./ports";
import { PostgresRefundsRepository } from "./repositories";

export const refundsModule = defineModule({
  name: "refunds",

  register: () => {
    bind(RefundsRepository, () => new PostgresRefundsRepository());
    registerBillingEventHandler("refund", RefundEventHandler);
  },
});
