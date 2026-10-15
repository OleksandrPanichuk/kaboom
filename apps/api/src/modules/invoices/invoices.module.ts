import { defineModule } from "@/core/module";
import { bind } from "@/core/registry";
import { registerBillingEventHandler } from "@/modules/billing-events";

import { InvoiceEventHandler } from "./handlers";
import { InvoicesRepository } from "./ports";
import { PostgresInvoicesRepository } from "./repositories";

export const invoicesModule = defineModule({
  name: "invoices",

  register: () => {
    bind(InvoicesRepository, () => new PostgresInvoicesRepository());
    registerBillingEventHandler("invoice", InvoiceEventHandler);
  },
});
