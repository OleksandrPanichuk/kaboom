import { describe, expect, test } from "bun:test";

import { graph, node } from "../evaluate/load/fixtures";
import { drillScenario } from "./resolve";
import { LoadDrillSchema } from "./schema";

describe("drillScenario", () => {
  test("a partition of nodes in no group cuts them off one by one", () => {
    const drill = LoadDrillSchema.parse({
      id: "cut",
      title: "Cut the database off",
      visibility: "public",
      faults: [
        { kind: "partition", select: { nodeKind: "sql-database" }, at: 60 },
      ],
      expect: {},
    });
    const design = graph(
      [node("api", "service"), node("db", "sql-database")],
      [],
    );

    expect(drillScenario(drill, design).faults).toEqual([
      { kind: "node-down", nodeId: "db", at: 60 },
    ]);
  });
});
