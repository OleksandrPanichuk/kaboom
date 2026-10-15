import { t } from "elysia";

export const TaxIdParams = t.Object({
  taxIdId: t.String({ format: "uuid" }),
});
