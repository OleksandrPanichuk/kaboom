import { createNode } from "@repo/design";
import { describe, expect, test } from "bun:test";

import { orientRelation } from "./orientRelation";

const table = (id: string, columns: Array<[string, boolean, boolean]>) => {
  const node = createNode("table", { id });

  node.props.columns = columns.map(([name, primaryKey, unique]) => ({
    id: name,
    name,
    type: "bigint",
    nullable: false,
    primaryKey,
    unique,
  }));

  return node;
};

const users = table("users", [["id", true, false]]);
const posts = table("posts", [
  ["id", true, false],
  ["author_id", false, false],
]);

describe("orientRelation", () => {
  test("points from the foreign key to the key, whichever way it was drawn", () => {
    expect(orientRelation(posts, "author_id", users, "id")).toMatchObject({
      from: "posts",
      to: "users",
      relation: { fromColumn: "author_id", toColumn: "id" },
    });
    expect(orientRelation(users, "id", posts, "author_id")).toMatchObject({
      from: "posts",
      to: "users",
      relation: { fromColumn: "author_id", toColumn: "id" },
    });
  });

  test("keeps the drawn direction when both ends are keys", () => {
    expect(orientRelation(posts, "id", users, "id")).toMatchObject({
      from: "posts",
      to: "users",
    });
  });
});
