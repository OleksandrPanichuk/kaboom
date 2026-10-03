import {
  applyOps,
  createNode,
  type DesignGraph,
  type DesignOp,
  emptyGraph,
} from "@repo/design";
import { describe, expect, test } from "bun:test";

import {
  CANNOT_UNDO,
  CONFLICT_DROPPED,
  CONFLICT_GAVE_UP,
  type DesignSnapshot,
  DesignWriter,
  type DesignWriterState,
  type SendOpsResult,
} from "./designWriter";

const add = (id: string): DesignOp => ({
  op: "add-node",
  node: createNode("service", { id }),
});

const remove = (id: string): DesignOp => ({ op: "remove-node", id });

const ids = (graph: DesignGraph) => graph.nodes.map((node) => node.id);

class FakeServer {
  public snapshot: DesignSnapshot = { revision: 0, graph: emptyGraph() };
  public sent: Array<{ base: number; ops: DesignOp[] }> = [];
  public failNext: unknown = null;

  public commit(ops: DesignOp[]): void {
    const result = applyOps(this.snapshot.graph, ops);

    if (!result.ok) throw new Error(result.message);

    this.snapshot = {
      revision: this.snapshot.revision + 1,
      graph: result.graph,
    };
  }

  public send = (base: number, ops: DesignOp[]): Promise<SendOpsResult> => {
    this.sent.push({ base, ops });

    if (this.failNext) {
      const error = this.failNext;

      this.failNext = null;

      return Promise.resolve({ ok: false, conflict: false, error });
    }

    if (base !== this.snapshot.revision) {
      return Promise.resolve({ ok: false, conflict: true });
    }

    this.commit(ops);

    return Promise.resolve({ ok: true, snapshot: this.snapshot });
  };

  public fetchLatest = (): Promise<DesignSnapshot> =>
    Promise.resolve(this.snapshot);
}

const writerFor = (server: FakeServer) => {
  const states: DesignWriterState[] = [];
  const writer = new DesignWriter(server.snapshot, {
    send: server.send,
    fetchLatest: server.fetchLatest,
    onChange: (state) => states.push(state),
    describeError: (error) => String(error),
  });

  return { writer, states };
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("DesignWriter", () => {
  test("shows a change at once and confirms it with the server's revision", async () => {
    const server = new FakeServer();
    const { writer, states } = writerFor(server);

    expect(writer.apply([add("api")])).toBeNull();
    expect(ids(states[0]!.graph)).toEqual(["api"]);
    expect(states[0]!.saving).toBe(true);

    await settle();

    expect(writer.state).toMatchObject({ revision: 1, saving: false });
    expect(ids(writer.state.graph)).toEqual(["api"]);
  });

  test("sends queued batches one at a time, each on the revision before it", async () => {
    const server = new FakeServer();
    const { writer } = writerFor(server);

    writer.apply([add("a")]);
    writer.apply([add("b")]);
    writer.apply([add("c")]);
    await settle();

    expect(server.sent.map((call) => call.base)).toEqual([0, 1, 2]);
    expect(writer.state.revision).toBe(3);
    expect(ids(writer.state.graph)).toEqual(["a", "b", "c"]);
  });

  test("refuses a change that does not apply, without sending it", () => {
    const server = new FakeServer();
    const { writer } = writerFor(server);

    expect(writer.apply([remove("ghost")])).toBe("No node ghost");
    expect(server.sent).toHaveLength(0);
  });

  test("on a conflict, rebases onto the latest design and sends again", async () => {
    const server = new FakeServer();
    const { writer } = writerFor(server);

    server.commit([add("theirs")]);
    writer.apply([add("mine")]);
    await settle();

    expect(server.sent.map((call) => call.base)).toEqual([0, 1]);
    expect(ids(writer.state.graph)).toEqual(["theirs", "mine"]);
    expect(writer.state).toMatchObject({ revision: 2, error: null });
  });

  test("drops a change the latest design no longer accepts, and says so", async () => {
    const server = new FakeServer();

    server.commit([add("shared")]);

    const { writer } = writerFor(server);

    server.commit([remove("shared")]);
    writer.apply([remove("shared")]);
    await settle();

    expect(writer.state).toMatchObject({
      revision: 2,
      saving: false,
      error: CONFLICT_DROPPED,
    });
    expect(ids(writer.state.graph)).toEqual([]);
  });

  test("gives up after repeated conflicts instead of looping", async () => {
    const server = new FakeServer();
    const send = server.send;

    server.send = (base, ops) => {
      server.commit([add(`other-${server.snapshot.revision}`)]);

      return send(base, ops);
    };

    const { writer } = writerFor(server);

    writer.apply([add("mine")]);
    await settle();

    expect(writer.state).toMatchObject({
      saving: false,
      error: CONFLICT_GAVE_UP,
    });
    expect(ids(writer.state.graph)).not.toContain("mine");
  });

  test("rolls back a rejected batch and keeps the next one", async () => {
    const server = new FakeServer();
    const { writer } = writerFor(server);

    server.failNext = "rejected";
    writer.apply([add("bad")]);
    writer.apply([add("good")]);
    await settle();

    expect(ids(writer.state.graph)).toEqual(["good"]);
    expect(writer.state).toMatchObject({ revision: 1, error: "rejected" });
  });
});

describe("DesignWriter history", () => {
  test("undoes and redoes a change, each as a new revision", async () => {
    const server = new FakeServer();
    const { writer } = writerFor(server);

    writer.apply([add("api")]);
    await settle();
    expect(writer.state).toMatchObject({ canUndo: true, canRedo: false });

    writer.undo();
    await settle();
    expect(ids(writer.state.graph)).toEqual([]);
    expect(writer.state).toMatchObject({
      revision: 2,
      canUndo: false,
      canRedo: true,
    });

    writer.redo();
    await settle();
    expect(ids(writer.state.graph)).toEqual(["api"]);
    expect(ids(server.snapshot.graph)).toEqual(["api"]);
    expect(writer.state.revision).toBe(3);
  });

  test("undoing a removal brings the node back with its edges", async () => {
    const server = new FakeServer();
    const { writer } = writerFor(server);

    writer.apply([
      add("api"),
      add("db"),
      {
        op: "add-edge",
        edge: {
          id: "e1",
          from: "api",
          to: "db",
          kind: "write",
          label: "",
          props: { share: 1, fanOut: 1, timeoutMs: 1_000, retries: 0 },
        },
      },
    ]);
    writer.apply([remove("db")]);
    await settle();
    expect(server.snapshot.graph.edges).toHaveLength(0);

    writer.undo();
    await settle();
    expect(ids(server.snapshot.graph)).toEqual(["api", "db"]);
    expect(server.snapshot.graph.edges.map((edge) => edge.id)).toEqual(["e1"]);
  });

  test("a new change clears what could be redone", () => {
    const server = new FakeServer();
    const { writer } = writerFor(server);

    writer.apply([add("a")]);
    writer.undo();
    expect(writer.state.canRedo).toBe(true);

    writer.apply([add("b")]);
    expect(writer.state.canRedo).toBe(false);
  });

  test("says so when a change can no longer be undone", async () => {
    const server = new FakeServer();
    const { writer } = writerFor(server);

    writer.apply([add("api")]);
    await settle();
    server.commit([remove("api")]);
    writer.apply([add("other")]);
    await settle();

    writer.undo();
    writer.undo();

    expect(writer.state.error).toBe(CANNOT_UNDO);
    expect(writer.state.canUndo).toBe(false);
  });
});
