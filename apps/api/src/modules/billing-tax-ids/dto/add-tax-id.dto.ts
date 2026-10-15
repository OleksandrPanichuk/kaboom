import { t } from "elysia";

export const AddTaxIdInput = t.Object({
  type: t.String({
    pattern: "^[a-z]{2,3}_[a-z]{2,10}$",
    description: "The provider's type, such as eu_vat or gb_vat",
  }),
  value: t.String({ minLength: 1, maxLength: 64 }),
});
export type AddTaxIdInput = typeof AddTaxIdInput.static;
