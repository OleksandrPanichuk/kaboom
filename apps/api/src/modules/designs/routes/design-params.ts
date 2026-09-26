import { t } from "elysia";

export const DesignParams = t.Object({ id: t.String({ format: "uuid" }) });

export const DesignRevisionParams = t.Object({
  id: t.String({ format: "uuid" }),
  number: t.Integer({ minimum: 0 }),
});
