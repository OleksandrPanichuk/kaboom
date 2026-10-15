import { t } from "elysia";

import { PAYMENT_STATUSES } from "@/db";

export const PaymentModel = t.Object({
  id: t.String({ format: "uuid" }),
  status: t.UnionEnum(PAYMENT_STATUSES),
  amount: t.Integer({ description: "In the currency's smallest unit" }),
  amountReceived: t.Integer(),
  currency: t.String({ description: "Lowercase ISO 4217 code" }),
  methodType: t.Nullable(t.String({ description: "card, for instance" })),
  cardBrand: t.Nullable(t.String()),
  cardLast4: t.Nullable(t.String()),
  failureMessage: t.Nullable(
    t.String({
      description: "Why the last attempt failed, as the provider says it",
    }),
  ),
  succeededAt: t.Nullable(t.Date()),
  createdAt: t.Date(),
});
export type PaymentModel = typeof PaymentModel.static;
