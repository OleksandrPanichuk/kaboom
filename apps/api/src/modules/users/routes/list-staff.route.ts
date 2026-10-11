import { t } from "elysia";

import { defineRoute } from "@/core/route";

import { StaffMemberModel } from "../user.model";
import { requireRole } from "../users.roles";
import type { UsersActions } from "../users.routes";

export const listStaffRoute = ({ listStaff }: UsersActions) =>
  defineRoute({
    response: t.Array(StaffMemberModel),
    summary: "List the moderators and admins",
    description: "Admins only. Answers 403 ROLE_REQUIRED to anyone else.",
    auth: true,
    guards: [requireRole("admin")],

    action: () => listStaff.execute(),
    postAction: ({ output }) =>
      output.map(({ id, name, email, role }) => ({ id, name, email, role })),
  });
