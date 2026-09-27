import { createNode, type NodeKind } from "@repo/design";
import { describe, expect, test } from "bun:test";

import { suggestEdgeKind } from "./suggestEdgeKind";

const node = (kind: NodeKind) => createNode(kind, { id: kind });

describe("suggestEdgeKind", () => {
  test.each([
    ["load-balancer", "service", "sync-call"],
    ["service", "queue", "async-message"],
    ["queue", "worker", "async-message"],
    ["service", "cache", "read"],
    ["service", "sql-database", "write"],
    ["worker", "object-storage", "write"],
    ["sql-database", "sql-database", "replication"],
    ["cache", "cache", "replication"],
    ["service", "service", "sync-call"],
  ] as const)("%s → %s is %s", (from, to, kind) => {
    expect(suggestEdgeKind(node(from), node(to))).toBe(kind);
  });
});
