import { t } from "elysia";

import { INVOICE_STATUSES } from "@/db";

export const InvoiceModel = t.Object({
  id: t.String({ format: "uuid" }),
  number: t.Nullable(t.String()),
  status: t.UnionEnum(INVOICE_STATUSES),
  currency: t.String({ description: "Lowercase ISO 4217 code" }),
  subtotal: t.Integer({ description: "In the currency's smallest unit" }),
  tax: t.Integer(),
  total: t.Integer(),
  amountPaid: t.Integer(),
  amountRemaining: t.Integer(),
  periodStart: t.Nullable(t.Date()),
  periodEnd: t.Nullable(t.Date()),
  hostedUrl: t.Nullable(
    t.String({ description: "The provider's page for paying or viewing it" }),
  ),
  pdfUrl: t.Nullable(t.String()),
  paidAt: t.Nullable(t.Date()),
  createdAt: t.Date(),
});
export type InvoiceModel = typeof InvoiceModel.static;
