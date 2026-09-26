import { t } from "elysia";

export const DesignParams = t.Object({ id: t.String({ format: "uuid" }) });
