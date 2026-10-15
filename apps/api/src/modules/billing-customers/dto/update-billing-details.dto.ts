import { t } from "elysia";

const Line = (maxLength: number) =>
  t.String({ minLength: 1, maxLength, pattern: "\\S" });

export const UpdateBillingDetailsInput = t.Object({
  name: Line(200),
  address: t.Object({
    line1: Line(200),
    line2: t.Optional(t.Nullable(t.String({ maxLength: 200 }))),
    city: Line(100),
    state: t.Optional(t.Nullable(t.String({ maxLength: 100 }))),
    postalCode: t.Optional(t.Nullable(t.String({ maxLength: 20 }))),
    country: t.String({
      pattern: "^[A-Z]{2}$",
      description: "ISO 3166-1 alpha-2, such as DE",
    }),
  }),
});
export type UpdateBillingDetailsInput = typeof UpdateBillingDetailsInput.static;
