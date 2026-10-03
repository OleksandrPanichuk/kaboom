import { createNode, type NodeKind } from "@repo/design";
import { describe, expect, test } from "bun:test";

import { suggestEdgeKind } from "./suggestEdgeKind";

const node = (kind: NodeKind) => createNode(kind, { id: kind });

describe("suggestEdgeKind", () => {
  test.each([
    ["load-balancer", "service", "sync-call"],
    ["service", "queue", "async-message"],
    ["queue", "worker", "async-message"],
    ["service", "stream", "async-message"],
    ["stream", "worker", "async-message"],
    ["service", "cache", "read"],
    ["service", "sql-database", "write"],
    ["worker", "object-storage", "write"],
    ["sql-database", "sql-database", "replication"],
    ["cache", "cache", "replication"],
    ["service", "service", "sync-call"],
    ["sql-database", "search-index", "change-feed"],
    ["nosql-database", "stream", "change-feed"],
    ["service", "search-index", "read"],
    ["scheduler", "coordination", "lock"],
    ["scheduler", "queue", "async-message"],
    ["ingress", "k8s-service", "sync-call"],
    ["k8s-deployment", "secret", "mounts"],
    ["k8s-deployment", "config-map", "mounts"],
    ["hpa", "k8s-deployment", "scales"],
    ["alert", "k8s-deployment", "watches"],
    ["pipeline-stage", "pipeline-stage", "pipeline-next"],
    ["pipeline-stage", "artifact-registry", "publishes"],
  ] as const)("%s → %s is %s", (from, to, kind) => {
    expect(suggestEdgeKind(node(from), node(to))).toBe(kind);
  });
});

describe("suggestEdgeKind with edges already there", () => {
  test("offers a read once the service already writes to the database", () => {
    expect(
      suggestEdgeKind(node("service"), node("sql-database"), ["write"]),
    ).toBe("read");
    expect(
      suggestEdgeKind(node("service"), node("sql-database"), ["read"]),
    ).toBe("write");
  });

  test("offers a write once a cache is already read", () => {
    expect(suggestEdgeKind(node("service"), node("cache"), ["read"])).toBe(
      "write",
    );
  });

  test("keeps one kind between two services, so a second connection is a duplicate", () => {
    expect(
      suggestEdgeKind(node("service"), node("service"), ["sync-call"]),
    ).toBe("sync-call");
  });

  test("falls back to the first kind when every one is taken", () => {
    expect(
      suggestEdgeKind(node("service"), node("sql-database"), ["write", "read"]),
    ).toBe("write");
  });
});
