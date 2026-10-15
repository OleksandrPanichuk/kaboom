import { t } from "elysia";

export const SubscribeInput = t.Object({
  offer: t.String({
    minLength: 1,
    maxLength: 64,
    description: "The offer to subscribe to, such as pro_monthly",
  }),
});
export type SubscribeInput = typeof SubscribeInput.static;
