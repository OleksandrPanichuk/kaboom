import { defineModule } from "@/core/module";
import { registerJob } from "@/platform/jobs";

import { ReconcileBillingJob } from "./jobs";

export const billingReconciliationModule = defineModule({
  name: "billing-reconciliation",

  register: () => {
    registerJob(ReconcileBillingJob);
  },
});
