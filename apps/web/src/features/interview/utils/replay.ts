import type {
  InterviewMessageModel,
  InterviewReplayModel,
} from "@repo/api-client";
import {
  applyOps,
  type DesignGraph,
  type DesignOp,
  migrateGraph,
} from "@repo/design";

import type { DurableEvent } from "@/features/interview/typedefs";

export const HIGHLIGHT_LINGER_MS = 20_000;

export interface ReplayRevision {
  number: number;
  offset: number;
  graph: DesignGraph;
}

export type ReplayEntry =
  | { kind: "message"; offset: number; message: InterviewMessageModel }
  | { kind: "event"; offset: number; event: DurableEvent };

export interface ReplayTimeline {
  duration: number;
  revisions: ReplayRevision[];
  entries: ReplayEntry[];
  stops: number[];
}

const offsetOf = (at: string, startedAt: number) =>
  Math.max(0, new Date(at).getTime() - startedAt);

export const buildRevisions = (
  replay: Pick<InterviewReplayModel, "revisions" | "startedAt">,
): ReplayRevision[] => {
  const startedAt = new Date(replay.startedAt).getTime();
  const built: ReplayRevision[] = [];
  let graph: DesignGraph | null = null;

  for (const revision of replay.revisions) {
    if (revision.snapshot) {
      graph = migrateGraph(revision.snapshot);
    } else if (graph) {
      const applied = applyOps(graph, revision.ops as DesignOp[], {
        derive: false,
      });

      if (!applied.ok) break;

      graph = applied.graph;
    }

    if (graph) {
      built.push({
        number: revision.number,
        offset: offsetOf(revision.at, startedAt),
        graph,
      });
    }
  }

  return built;
};

export const buildTimeline = (replay: InterviewReplayModel): ReplayTimeline => {
  const startedAt = new Date(replay.startedAt).getTime();
  const revisions = buildRevisions(replay);
  const entries: ReplayEntry[] = [
    ...replay.messages.map((message): ReplayEntry => ({
      kind: "message",
      offset: offsetOf(message.createdAt, startedAt),
      message,
    })),
    ...replay.events
      .filter((event) =>
        ["simulation", "phase", "highlight"].includes(event.type),
      )
      .map((event): ReplayEntry => ({
        kind: "event",
        offset: offsetOf(event.at, startedAt),
        event: event as DurableEvent,
      })),
  ].sort((a, b) => a.offset - b.offset);
  const lastEvent = replay.events.at(-1);
  const end = replay.endedAt ?? lastEvent?.at ?? replay.startedAt;
  const duration = Math.max(
    offsetOf(end, startedAt),
    ...entries.map((entry) => entry.offset),
    ...revisions.map((revision) => revision.offset),
  );
  const stops = [
    ...new Set([
      0,
      ...entries.map((entry) => entry.offset),
      ...revisions.map((revision) => revision.offset),
      duration,
    ]),
  ].sort((a, b) => a - b);

  return { duration, revisions, entries, stops };
};

export const graphAt = (
  revisions: readonly ReplayRevision[],
  offset: number,
): ReplayRevision | null =>
  revisions.reduce<ReplayRevision | null>(
    (found, revision) => (revision.offset <= offset ? revision : found),
    revisions[0] ?? null,
  );

export const entriesAt = (
  entries: readonly ReplayEntry[],
  offset: number,
): ReplayEntry[] => entries.filter((entry) => entry.offset <= offset);

export const phaseAt = (
  entries: readonly ReplayEntry[],
  offset: number,
  first: string,
): string =>
  entriesAt(entries, offset).reduce(
    (phase, entry) =>
      entry.kind === "event" && entry.event.type === "phase"
        ? String(entry.event.payload.phase)
        : phase,
    first,
  );

export const highlightAt = (
  entries: readonly ReplayEntry[],
  offset: number,
): { nodeIds: string[]; offset: number } | null => {
  const last = entriesAt(entries, offset)
    .filter(
      (entry) => entry.kind === "event" && entry.event.type === "highlight",
    )
    .at(-1);

  if (last?.kind !== "event") return null;
  if (offset - last.offset > HIGHLIGHT_LINGER_MS) return null;

  return {
    nodeIds: (last.event.payload.nodeIds as string[] | undefined) ?? [],
    offset: last.offset,
  };
};

export const nextStop = (stops: readonly number[], offset: number) =>
  stops.find((stop) => stop > offset) ?? null;

export const previousStop = (stops: readonly number[], offset: number) =>
  [...stops].reverse().find((stop) => stop < offset) ?? 0;
