import { createUser, type TestUser } from "@tests/helpers";
import { describe, expect, test } from "bun:test";

import { makeService } from "@/core/registry";
import type { UserRole } from "@/db";
import { UsersService } from "@/modules/users";

interface Me {
  role: UserRole;
}

interface Staff {
  id: string;
  email: string;
  role: UserRole;
  code?: string;
}

const make = async (role: UserRole): Promise<TestUser> => {
  const user = await createUser();

  if (role !== "user") await makeService(UsersService).setRole(user.id, role);

  return user;
};

describe("roles", () => {
  test("start as user, and say so on the account", async () => {
    const user = await createUser();

    expect((await user.get<Me>("/api/users/me")).body.role).toBe("user");
  });

  test("are changed by an admin, at once", async () => {
    const admin = await make("admin");
    const user = await createUser();

    expect((await user.get<Me>("/api/users/me")).body.role).toBe("user");

    const changed = await admin.put<Staff>(`/api/users/${user.id}/role`, {
      role: "moderator",
    });

    expect(changed.status).toBe(200);
    expect(changed.body).toMatchObject({ id: user.id, role: "moderator" });
    expect((await user.get<Me>("/api/users/me")).body.role).toBe("moderator");
    expect(
      (await admin.get<Staff[]>("/api/users/staff")).body.map(
        (member) => member.role,
      ),
    ).toEqual(["admin", "moderator"]);
  });

  test("are refused to anyone but an admin", async () => {
    const moderator = await make("moderator");
    const user = await createUser();

    for (const caller of [moderator, user]) {
      const listed = await caller.get<Staff>("/api/users/staff");
      const set = await caller.put<Staff>(`/api/users/${caller.id}/role`, {
        role: "admin",
      });

      expect(listed.status).toBe(403);
      expect(listed.body.code).toBe("ROLE_REQUIRED");
      expect(set.status).toBe(403);
    }
  });

  test("never let an admin change their own, so one always remains", async () => {
    const admin = await make("admin");
    const own = await admin.put<Staff>(`/api/users/${admin.id}/role`, {
      role: "user",
    });

    expect(own.status).toBe(409);
    expect(own.body.code).toBe("OWN_ROLE_CHANGE");
    expect(
      (
        await admin.put<Staff>(`/api/users/${crypto.randomUUID()}/role`, {
          role: "moderator",
        })
      ).status,
    ).toBe(404);
  });
});
