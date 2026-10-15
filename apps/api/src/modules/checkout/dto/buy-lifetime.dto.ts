import { t } from "elysia";

export const BuyLifetimeInput = t.Object({
  offer: t.String({
    minLength: 1,
    maxLength: 64,
    description: "The offer to buy, such as pro_lifetime",
  }),
});
export type BuyLifetimeInput = typeof BuyLifetimeInput.static;
