import { t } from "elysia";

export const ReviewParams = t.Object({ id: t.String({ format: "uuid" }) });
export type ReviewParams = typeof ReviewParams.static;
