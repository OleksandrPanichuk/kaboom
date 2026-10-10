import { createEdge, createNode, type DesignOp } from "@repo/design";
import { describe, expect, test } from "bun:test";

import {
  addColumn,
  addIndex,
  columnNameProblem,
  indexProblem,
  moveColumn,
  removeColumn,
  type TableNode,
  updateColumn,
} from "./tableEdits";

const posts = (): TableNode => {
  const node = createNode("table", {
    id: "posts",
    label: "posts",
  });

  node.props.columns = [
    {
      id: "id",
      name: "id",
      type: "bigint",
      nullable: false,
      primaryKey: true,
      unique: false,
    },
    {
      id: "author",
      name: "author_id",
      type: "bigint",
      nullable: false,
      primaryKey: false,
      unique: false,
    },
    {
      id: "at",
      name: "created_at",
      type: "timestamptz",
      nullable: true,
      primaryKey: false,
      unique: false,
    },
  ];
  node.props.indexes = [
    { id: "feed", columns: ["author", "at"], unique: false },
    { id: "by-time", columns: ["at"], unique: false },
  ];

  return node;
};

const propsOf = (op: DesignOp | null | undefined) =>
  op?.op === "update-node" ? (op.patch.props as TableNode["props"]) : null;

describe("table edits", () => {
  test("add a column with a free name", () => {
    const columns = propsOf(addColumn(posts()))?.columns ?? [];

    expect(columns.at(-1)).toMatchObject({ name: "column_4", type: "text" });
  });

  test("a primary key column cannot be null", () => {
    const columns = propsOf(
      updateColumn(posts(), "at", { primaryKey: true }),
    )?.columns;

    expect(columns?.[2]).toMatchObject({ primaryKey: true, nullable: false });
  });

  test("move a column up or down, and not past either end", () => {
    expect(
      propsOf(moveColumn(posts(), "at", -1))?.columns.map(
        (column) => column.id,
      ),
    ).toEqual(["id", "at", "author"]);
    expect(moveColumn(posts(), "id", -1)).toBeNull();
  });

  test("remove a column with the relations that use it, and out of its indexes", () => {
    const relation = {
      ...createEdge({ id: "r1", from: "posts", to: "users", kind: "relation" }),
      relation: {
        fromColumn: "author",
        toColumn: "id",
        onDelete: "restrict" as const,
      },
    };
    const ops = removeColumn(posts(), "at", [relation]);
    const withRelation = removeColumn(posts(), "author", [relation]);

    expect(ops).toHaveLength(1);
    expect(propsOf(ops[0])?.indexes).toEqual([
      { id: "feed", columns: ["author"], unique: false },
    ]);
    expect(withRelation[0]).toEqual({ op: "remove-edge", id: "r1" });
  });

  test("explain a bad column name or a repeated index", () => {
    expect(columnNameProblem(posts(), null, "Author_ID")).toBe(
      "posts already has a column Author_ID.",
    );
    expect(columnNameProblem(posts(), "author", "author_id")).toBeNull();
    expect(columnNameProblem(posts(), null, "2fast")).toContain("letters");
    expect(indexProblem(posts(), ["author", "at"])).toContain("already exists");
    expect(indexProblem(posts(), ["at", "author"])).toBeNull();
    expect(
      propsOf(addIndex(posts(), ["id", "at"], true))?.indexes.at(-1),
    ).toMatchObject({
      columns: ["id", "at"],
      unique: true,
    });
  });
});
