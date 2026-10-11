import type { AuthUser } from "@/core/auth";
import { makeService } from "@/core/registry";
import type { UserRole } from "@/db";

import { RoleRequiredError } from "./users.errors";
import { UsersService } from "./users.service";

const RANK: Readonly<Record<UserRole, number>> = {
  user: 0,
  moderator: 1,
  admin: 2,
};

export const hasRole = (role: UserRole, minimum: UserRole): boolean =>
  RANK[role] >= RANK[minimum];

export const requireRole =
  (minimum: UserRole) =>
  async ({ user }: { user: AuthUser }): Promise<void> => {
    const found = await makeService(UsersService).getById(user.id);

    if (!hasRole(found.role, minimum)) {
      throw new RoleRequiredError(`This needs the ${minimum} role`);
    }
  };
