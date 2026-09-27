import type { EdgeKind } from "@repo/design";
import type { CSSProperties } from "react";

export interface EdgeKindStyle {
  label: string;
  description: string;
  style: CSSProperties;
  animated: boolean;
}

export const EDGE_KIND_STYLES: Readonly<Record<EdgeKind, EdgeKindStyle>> = {
  "sync-call": {
    description: "The source waits for an answer before it replies itself.",
    label: "Sync call",
    style: { stroke: "var(--color-zinc-500)", strokeWidth: 1.5 },
    animated: false,
  },
  "async-message": {
    description:
      "The source hands work over and moves on; it never waits for the result.",
    label: "Async message",
    style: {
      stroke: "var(--color-indigo-500)",
      strokeWidth: 1.5,
      strokeDasharray: "6 4",
    },
    animated: true,
  },
  read: {
    description:
      "The source reads from a store, such as a cache lookup or a query.",
    label: "Read",
    style: { stroke: "var(--color-sky-600)", strokeWidth: 1.5 },
    animated: false,
  },
  write: {
    description: "The source changes what a store holds.",
    label: "Write",
    style: { stroke: "var(--color-amber-600)", strokeWidth: 1.5 },
    animated: false,
  },
  replication: {
    description:
      "The target keeps a copy of the source; it carries no request load.",
    label: "Replication",
    style: {
      stroke: "var(--color-zinc-400)",
      strokeWidth: 1.5,
      strokeDasharray: "2 4",
    },
    animated: false,
  },
};
