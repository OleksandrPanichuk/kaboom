import { t } from "elysia";

export const UserParams = t.Object({ id: t.String({ format: "uuid" }) });
export type UserParams = typeof UserParams.static;
