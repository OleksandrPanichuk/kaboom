import { defineModule } from "@/core/module";
import { bind, makeUseCase } from "@/core/registry";
import { registerBillingEventHandler } from "@/modules/billing-events";

import { InvoiceEventHandler } from "./handlers";
import { invoicesRoutes } from "./invoices.routes";
import { InvoicesRepository } from "./ports";
import { PostgresInvoicesRepository } from "./repositories";
import { ListInvoicesUseCase } from "./use-cases";

export const invoicesModule = defineModule({
  name: "invoices",

  register: () => {
    bind(InvoicesRepository, () => new PostgresInvoicesRepository());
    registerBillingEventHandler("invoice", InvoiceEventHandler);
  },

  routes: () =>
    invoicesRoutes({ listInvoices: makeUseCase(ListInvoicesUseCase) }),
});
