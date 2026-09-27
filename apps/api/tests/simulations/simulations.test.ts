import { createEdge, createNode, type DesignOp } from "@repo/design";
import { createUser, type TestClient } from "@tests/helpers";
import { describe, expect, test } from "bun:test";

import {
  applyOps,
  createDesign,
  type ErrorBody,
  PATH,
} from "../designs/helpers";

interface RunBody {
  id: string;
  designId: string;
  revision: number;
  graphHash: string;
  scenario: { kind: string; stepSeconds: number; durationSeconds: number };
  findings: Array<{
    kind: string;
    target: { type: string; id?: string };
    atStep: number;
    data: Record<string, number>;
  }>;
  summary: {
    steps: number;
    stepSeconds: number;
    clients: Record<string, { minAvailability: number; maxP99: number }>;
  };
}

interface PageBody<Item> {
  items: Item[];
  nextCursor: string | null;
}

const shop: DesignOp[] = [
  {
    op: "add-node",
    node: {
      ...createNode("client", { id: "users" }),
      props: { rps: 100, readRatio: 0.9, payloadKb: 4 },
    },
  },
  { op: "add-node", node: createNode("service", { id: "api" }) },
  { op: "add-node", node: createNode("sql-database", { id: "db" }) },
  {
    op: "add-edge",
    edge: createEdge({ id: "e1", from: "users", to: "api", kind: "sync-call" }),
  },
  {
    op: "add-edge",
    edge: createEdge({ id: "e2", from: "api", to: "db", kind: "write" }),
  },
  {
    op: "add-edge",
    edge: createEdge({ id: "e3", from: "api", to: "db", kind: "read" }),
  },
];

const seeded = async (user: TestClient) => {
  const design = await createDesign(user, "Shop");
  const applied = await applyOps(user, design.id, 0, shop);

  return { design, applied: applied.body };
};

const run = (user: TestClient, id: string, body: unknown) =>
  user.post<RunBody & ErrorBody>(`${PATH}/${id}/simulations`, body);

describe("simulation runs", () => {
  test("evaluates the current revision and keeps the result", async () => {
    const user = await createUser();
    const { design, applied } = await seeded(user);

    const response = await run(user, design.id, { scenario: { kind: "load" } });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      designId: design.id,
      revision: 1,
      graphHash: applied.graphHash,
      scenario: { kind: "load", stepSeconds: 10, durationSeconds: 600 },
      summary: { steps: 60, stepSeconds: 10 },
      findings: [],
    });
    expect(response.body.summary.clients.users?.minAvailability).toBe(1);
  });

  test("reports what a fault does, with the step it starts at", async () => {
    const user = await createUser();
    const { design } = await seeded(user);

    const response = await run(user, design.id, {
      scenario: {
        kind: "load",
        durationSeconds: 120,
        faults: [{ kind: "node-down", nodeId: "db", at: 30 }],
      },
    });
    const kinds = response.body.findings.map((finding) => finding.kind);
    const errors = response.body.findings.find(
      (finding) => finding.kind === "errors",
    );

    expect(response.status).toBe(200);
    expect(kinds).toContain("slo-breach");
    expect(errors).toMatchObject({
      target: { type: "node", id: "db" },
      atStep: 3,
    });
    expect(response.body.summary.clients.users?.minAvailability).toBe(0);
  });

  test("lists runs newest first and returns one by id", async () => {
    const user = await createUser();
    const { design } = await seeded(user);
    const first = await run(user, design.id, {
      scenario: { kind: "load", durationSeconds: 10 },
    });
    const second = await run(user, design.id, {
      scenario: { kind: "load", durationSeconds: 20 },
    });

    const list = await user.get<PageBody<RunBody>>(
      `${PATH}/${design.id}/simulations`,
    );
    const one = await user.get<RunBody>(
      `${PATH}/${design.id}/simulations/${first.body.id}`,
    );

    expect(list.status).toBe(200);
    expect(list.body.items.map((item) => item.id)).toEqual([
      second.body.id,
      first.body.id,
    ]);
    expect(one.body).toEqual(first.body);
  });

  test("evaluates a past revision when asked", async () => {
    const user = await createUser();
    const { design, applied } = await seeded(user);

    await applyOps(user, design.id, 1, [
      { op: "add-node", node: createNode("cache", { id: "cache" }) },
    ]);

    const past = await run(user, design.id, {
      scenario: { kind: "load", durationSeconds: 10 },
      revision: 1,
    });

    expect(past.status).toBe(200);
    expect(past.body).toMatchObject({
      revision: 1,
      graphHash: applied.graphHash,
    });
  });

  test("refuses a scenario the evaluator cannot run", async () => {
    const user = await createUser();
    const { design } = await seeded(user);

    const malformed = await run(user, design.id, {
      scenario: { kind: "load", stepSeconds: 0 },
    });
    const unknownNode = await run(user, design.id, {
      scenario: {
        kind: "load",
        faults: [{ kind: "node-down", nodeId: "ghost", at: 0 }],
      },
    });

    expect(malformed.status).toBe(422);
    expect(malformed.body.code).toBe("SIMULATION_SCENARIO_INVALID");
    expect(unknownNode.status).toBe(422);
    expect(unknownNode.body.details).toEqual({ unknownNodes: ["ghost"] });
  });

  test("refuses a region fault on a region the design does not have", async () => {
    const user = await createUser();
    const { design } = await seeded(user);

    const response = await run(user, design.id, {
      scenario: {
        kind: "load",
        faults: [{ kind: "region-down", groupId: "atlantis", at: 0 }],
      },
    });

    expect(response.status).toBe(422);
    expect(response.body.details).toEqual({ unknownGroups: ["atlantis"] });
  });

  test("answers 404 for a revision the design has not reached", async () => {
    const user = await createUser();
    const { design } = await seeded(user);

    expect(
      (await run(user, design.id, { scenario: { kind: "load" }, revision: 9 }))
        .status,
    ).toBe(404);
  });

  test("keeps another user's design and runs out of reach", async () => {
    const owner = await createUser();
    const other = await createUser();
    const { design } = await seeded(owner);
    const mine = await run(owner, design.id, {
      scenario: { kind: "load", durationSeconds: 10 },
    });

    expect(
      (await run(other, design.id, { scenario: { kind: "load" } })).status,
    ).toBe(404);
    expect((await other.get(`${PATH}/${design.id}/simulations`)).status).toBe(
      404,
    );
    expect(
      (await other.get(`${PATH}/${design.id}/simulations/${mine.body.id}`))
        .status,
    ).toBe(404);
  });

  test("answers 404 for a run that belongs to another design", async () => {
    const user = await createUser();
    const { design } = await seeded(user);
    const otherDesign = await createDesign(user, "Other");
    const runOnFirst = await run(user, design.id, {
      scenario: { kind: "load", durationSeconds: 10 },
    });

    expect(
      (
        await user.get(
          `${PATH}/${otherDesign.id}/simulations/${runOnFirst.body.id}`,
        )
      ).status,
    ).toBe(404);
  });
});
