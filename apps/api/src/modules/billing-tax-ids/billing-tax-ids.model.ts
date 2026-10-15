import { t } from "elysia";

export const BillingTaxIdModel = t.Object({
  id: t.String({ format: "uuid" }),
  type: t.String({ description: "The provider's type, such as eu_vat" }),
  value: t.String(),
  verificationStatus: t.Nullable(
    t.String({ description: "pending, verified, unverified or unavailable" }),
  ),
});
export type BillingTaxIdModel = typeof BillingTaxIdModel.static;
