import { defineRoute } from "@/core/route";

import { SetUserRoleInput } from "../dto";
import { StaffMemberModel } from "../user.model";
import { requireRole } from "../users.roles";
import type { UsersActions } from "../users.routes";
import { UserParams } from "./user-params";

export const setUserRoleRoute = ({ setUserRole }: UsersActions) =>
  defineRoute({
    params: UserParams,
    body: SetUserRoleInput,
    response: StaffMemberModel,
    summary: "Make someone a user, a moderator or an admin",
    description:
      "Admins only. Moderators review community problems; admins also change roles. An admin cannot change their own role (409 OWN_ROLE_CHANGE), so the platform always keeps one.",
    auth: true,
    guards: [requireRole("admin")],

    action: ({ params, body, user }) =>
      setUserRole.execute({
        actorId: user.id,
        userId: params.id,
        role: body.role,
      }),
    postAction: ({ output: { id, name, email, role } }) => ({
      id,
      name,
      email,
      role,
    }),
  });
