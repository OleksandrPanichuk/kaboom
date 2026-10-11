import { t } from "elysia";

import { USER_ROLES } from "@/db";

export const SetUserRoleInput = t.Object({
  role: t.UnionEnum(USER_ROLES),
});
export type SetUserRoleInput = typeof SetUserRoleInput.static;
