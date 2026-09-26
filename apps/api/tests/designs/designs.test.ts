import { emptyGraph } from "@repo/design";
import { createGuest, createUser } from "@tests/helpers";
import { describe, expect, test } from "bun:test";

import { createDesign, type DesignBody, PATH } from "./helpers";

interface DesignPage {
  items: Array<Pick<DesignBody, "id" | "name" | "revision">>;
  nextCursor: string | null;
}

describe("designs", () => {
  test("starts a design empty, at revision 0", async () => {
    const user = await createUser();

    const design = await createDesign(user, "URL shortener");

    expect(design).toMatchObject({
      name: "URL shortener",
      graph: emptyGraph(),
      layout: {},
      revision: 0,
    });
    expect(design.graphHash).toMatch(/^[0-9a-f]{64}$/);
    expect((await user.get<DesignBody>(`${PATH}/${design.id}`)).body).toEqual(
      design,
    );
  });

  test("renames and deletes one", async () => {
    const user = await createUser();
    const design = await createDesign(user);
    const path = `${PATH}/${design.id}`;

    const renamed = await user.patch<DesignBody>(path, { name: "Renamed" });

    expect(renamed.body).toMatchObject({ name: "Renamed", revision: 0 });

    expect((await user.delete(path)).status).toBe(200);
    expect((await user.get(path)).status).toBe(404);
  });

  test("lists a user's designs newest first, a page at a time", async () => {
    const user = await createUser();
    const other = await createUser();

    for (const name of ["one", "two", "three"]) {
      await createDesign(user, name);
    }
    await createDesign(other, "not mine");

    const first = await user.get<DesignPage>(`${PATH}?limit=2`);
    const second = await user.get<DesignPage>(
      `${PATH}?limit=2&cursor=${encodeURIComponent(first.body.nextCursor!)}`,
    );

    expect(first.body.items.map((design) => design.name)).toEqual([
      "three",
      "two",
    ]);
    expect(second.body.items.map((design) => design.name)).toEqual(["one"]);
    expect(second.body.nextCursor).toBeNull();
  });

  test("keeps each user's designs to themselves", async () => {
    const owner = await createUser();
    const other = await createUser();
    const design = await createDesign(owner, "Mine");
    const path = `${PATH}/${design.id}`;

    expect((await other.get(path)).status).toBe(404);
    expect((await other.patch(path, { name: "Theirs" })).status).toBe(404);
    expect((await other.delete(path)).status).toBe(404);
    expect((await owner.get<DesignBody>(path)).body.name).toBe("Mine");
  });

  test("refuses a guest", async () => {
    const guest = createGuest();

    expect((await guest.get(PATH)).status).toBe(401);
    expect((await guest.post(PATH, { name: "x" })).status).toBe(401);
  });

  test("refuses an empty name", async () => {
    const user = await createUser();

    expect((await user.post(PATH, { name: "" })).status).toBe(422);
  });
});
