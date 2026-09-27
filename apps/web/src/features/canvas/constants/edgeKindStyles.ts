import type { EdgeKind } from "@repo/design";
import type { CSSProperties } from "react";

export interface EdgeKindStyle {
  label: string;
  style: CSSProperties;
  animated: boolean;
}

export const EDGE_KIND_STYLES: Readonly<Record<EdgeKind, EdgeKindStyle>> = {
  "sync-call": {
    label: "Sync call",
    style: { stroke: "var(--color-zinc-500)", strokeWidth: 1.5 },
    animated: false,
  },
  "async-message": {
    label: "Async message",
    style: {
      stroke: "var(--color-indigo-500)",
      strokeWidth: 1.5,
      strokeDasharray: "6 4",
    },
    animated: true,
  },
  read: {
    label: "Read",
    style: { stroke: "var(--color-sky-600)", strokeWidth: 1.5 },
    animated: false,
  },
  write: {
    label: "Write",
    style: { stroke: "var(--color-amber-600)", strokeWidth: 1.5 },
    animated: false,
  },
  replication: {
    label: "Replication",
    style: {
      stroke: "var(--color-zinc-400)",
      strokeWidth: 1.5,
      strokeDasharray: "2 4",
    },
    animated: false,
  },
};
