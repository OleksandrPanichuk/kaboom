import { t } from "elysia";

export const BillingAddressModel = t.Object({
  line1: t.Nullable(t.String()),
  line2: t.Nullable(t.String()),
  city: t.Nullable(t.String()),
  state: t.Nullable(t.String()),
  postalCode: t.Nullable(t.String()),
  country: t.Nullable(t.String({ description: "ISO 3166-1 alpha-2" })),
});
export type BillingAddressModel = typeof BillingAddressModel.static;

export const BillingCustomerModel = t.Object({
  name: t.Nullable(t.String()),
  email: t.Nullable(t.String()),
  address: t.Nullable(BillingAddressModel),
  card: t.Nullable(
    t.Object({
      brand: t.Nullable(t.String()),
      last4: t.Nullable(t.String()),
    }),
  ),
});
export type BillingCustomerModel = typeof BillingCustomerModel.static;
