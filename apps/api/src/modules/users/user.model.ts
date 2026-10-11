import { t } from "elysia";

import { USER_ROLES } from "@/db";

export const UserModel = t.Object({
  id: t.String({ format: "uuid" }),
  name: t.String(),
  email: t.String({ format: "email" }),
  emailVerified: t.Boolean(),
  role: t.UnionEnum(USER_ROLES),
});
export type UserModel = typeof UserModel.static;

export const StaffMemberModel = t.Object({
  id: t.String({ format: "uuid" }),
  name: t.String(),
  email: t.String({ format: "email" }),
  role: t.UnionEnum(USER_ROLES),
});
export type StaffMemberModel = typeof StaffMemberModel.static;

export const UserMessageModel = t.Object({
  message: t.String(),
});
export type UserMessageModel = typeof UserMessageModel.static;
