import { t } from "elysia";

export const ProfileParams = t.Object({ handle: t.String({ maxLength: 20 }) });
export type ProfileParams = typeof ProfileParams.static;
