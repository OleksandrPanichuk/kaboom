import { t } from "elysia";

export const DraftParams = t.Object({ id: t.String({ format: "uuid" }) });
export type DraftParams = typeof DraftParams.static;
