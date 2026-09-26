import { createUser } from "@tests/helpers";
import { describe, expect, test } from "bun:test";

import { createDesign, type DesignBody, PATH } from "./helpers";

describe("design layout", () => {
  test("saves positions without touching the revision or updatedAt", async () => {
    const user = await createUser();
    const design = await createDesign(user);
    const layout = { api: { x: 120, y: -40.5 }, db: { x: 300, y: 80 } };

    const saved = await user.put(`${PATH}/${design.id}/layout`, { layout });

    expect(saved.status).toBe(200);

    const stored = await user.get<DesignBody>(`${PATH}/${design.id}`);

    expect(stored.body).toMatchObject({
      layout,
      revision: 0,
      updatedAt: design.updatedAt,
      graphHash: design.graphHash,
    });
  });

  test.each([
    ["a coordinate out of range", { api: { x: 1e9, y: 0 } }],
    ["a position without y", { api: { x: 0 } }],
    [
      "more positions than a design can hold",
      Object.fromEntries(
        Array.from({ length: 601 }, (_, index) => [
          `n${index}`,
          { x: 0, y: 0 },
        ]),
      ),
    ],
  ])("refuses %s", async (_, layout) => {
    const user = await createUser();
    const design = await createDesign(user);

    expect(
      (await user.put(`${PATH}/${design.id}/layout`, { layout })).status,
    ).toBe(422);
  });

  test("keeps another user's layout out of reach", async () => {
    const owner = await createUser();
    const other = await createUser();
    const design = await createDesign(owner);

    const refused = await other.put(`${PATH}/${design.id}/layout`, {
      layout: { api: { x: 0, y: 0 } },
    });

    expect(refused.status).toBe(404);
  });
});
