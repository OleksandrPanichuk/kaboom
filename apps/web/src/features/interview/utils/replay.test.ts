import type { InterviewReplayModel } from "@repo/api-client";
import { createNode, emptyGraph } from "@repo/design";
import { describe, expect, test } from "bun:test";

import {
  buildTimeline,
  graphAt,
  highlightAt,
  nextStop,
  phaseAt,
  previousStop,
} from "./replay";

const START = "2026-10-18T10:00:00.000Z";
const at = (seconds: number) =>
  new Date(Date.parse(START) + seconds * 1000).toISOString();

const replay = {
  startedAt: START,
  endedAt: at(600),
  messages: [
    {
      id: "m1",
      author: "interviewer",
      body: "Hi",
      turnId: null,
      interrupted: false,
      createdAt: at(1),
    },
    {
      id: "m2",
      author: "user",
      body: "How big?",
      turnId: null,
      interrupted: false,
      createdAt: at(30),
    },
  ],
  events: [
    { seq: 1, type: "message", at: at(1), payload: { messageId: "m1" } },
    { seq: 2, type: "message", at: at(30), payload: { messageId: "m2" } },
    { seq: 3, type: "revision", at: at(60), payload: { revision: 1 } },
    { seq: 4, type: "phase", at: at(120), payload: { phase: "high-level" } },
    { seq: 5, type: "highlight", at: at(130), payload: { nodeIds: ["api"] } },
    { seq: 6, type: "status", at: at(600), payload: { status: "reviewing" } },
  ],
  revisions: [
    { number: 0, author: "system", at: at(0), ops: [], snapshot: emptyGraph() },
    {
      number: 1,
      author: "user",
      at: at(60),
      ops: [{ op: "add-node", node: createNode("service", { id: "api" }) }],
      snapshot: null,
    },
  ],
} as unknown as InterviewReplayModel;

describe("replay timeline", () => {
  const timeline = buildTimeline(replay);

  test("rebuilds the design as it stood at each moment", () => {
    expect(graphAt(timeline.revisions, 30_000)?.graph.nodes).toHaveLength(0);
    expect(
      graphAt(timeline.revisions, 60_000)?.graph.nodes.map((node) => node.id),
    ).toEqual(["api"]);
  });

  test("knows the phase and a highlight that lingers for a while", () => {
    expect(phaseAt(timeline.entries, 60_000, "requirements")).toBe(
      "requirements",
    );
    expect(phaseAt(timeline.entries, 125_000, "requirements")).toBe(
      "high-level",
    );
    expect(highlightAt(timeline.entries, 135_000)?.nodeIds).toEqual(["api"]);
    expect(highlightAt(timeline.entries, 200_000)).toBeNull();
  });

  test("steps between the moments something happened", () => {
    expect(timeline.duration).toBe(600_000);
    expect(nextStop(timeline.stops, 1_000)).toBe(30_000);
    expect(previousStop(timeline.stops, 60_000)).toBe(30_000);
    expect(nextStop(timeline.stops, 600_000)).toBeNull();
    expect(timeline.entries.map((entry) => entry.offset)).toEqual([
      1_000, 30_000, 120_000, 130_000,
    ]);
  });
});
