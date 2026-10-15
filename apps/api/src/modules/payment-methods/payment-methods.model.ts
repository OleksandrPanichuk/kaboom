import { t } from "elysia";

export const CardModel = t.Object({
  id: t.String({ description: "The provider's id for the card" }),
  brand: t.Nullable(t.String()),
  last4: t.Nullable(t.String()),
  expMonth: t.Nullable(t.Integer()),
  expYear: t.Nullable(t.Integer()),
  isDefault: t.Boolean({
    description: "Invoices and renewals are charged to this card",
  }),
});
export type CardModel = typeof CardModel.static;

export const CardSetupModel = t.Object({
  clientSecret: t.String({
    description:
      "Confirm the card with this in the provider's payment form, then make it the default",
  }),
});
export type CardSetupModel = typeof CardSetupModel.static;
