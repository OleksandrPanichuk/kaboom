import {
  mapPage,
  PageModel,
  PageQuery,
  toPageRequest,
} from "@/core/pagination";
import { defineRoute } from "@/core/route";

import { InvoiceEntity } from "../invoice.entity";
import { InvoiceModel } from "../invoices.model";
import type { InvoicesActions } from "../invoices.routes";

export const listInvoicesRoute = ({ listInvoices }: InvoicesActions) =>
  defineRoute({
    query: PageQuery,
    response: PageModel(InvoiceModel),
    summary: "List your invoices, newest first",
    description:
      "Every invoice the billing provider issued you, with its totals and links to view or download it. Drafts are left out.",
    auth: true,

    action: ({ user, query }) =>
      listInvoices.execute({ userId: user.id, page: toPageRequest(query) }),
    postAction: ({ output }) => mapPage(output, InvoiceEntity.normalize),
  });
