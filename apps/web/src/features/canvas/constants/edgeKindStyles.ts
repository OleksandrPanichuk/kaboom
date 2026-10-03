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
  "change-feed": {
    description:
      "Every change the database commits, streamed to the target without the writer waiting.",
    label: "Change feed",
    style: {
      stroke: "var(--color-teal-600)",
      strokeWidth: 1.5,
      strokeDasharray: "6 4",
    },
    animated: true,
  },
  lock: {
    description:
      "The source takes a lock or a leadership lease here before it acts; it carries no request load.",
    label: "Lock",
    style: {
      stroke: "var(--color-violet-500)",
      strokeWidth: 1.5,
      strokeDasharray: "1 4",
      strokeLinecap: "round",
    },
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
  mounts: {
    description:
      "The source's pods read this config or secret when they start; it carries no request load.",
    label: "Mounts",
    style: {
      stroke: "var(--color-emerald-600)",
      strokeWidth: 1.5,
      strokeDasharray: "2 4",
    },
    animated: false,
  },
  scales: {
    description:
      "The source adds pods to the target as it gets busy; it carries no request load.",
    label: "Scales",
    style: {
      stroke: "var(--color-violet-500)",
      strokeWidth: 1.5,
      strokeDasharray: "2 4",
    },
    animated: false,
  },
  watches: {
    description:
      "The source pages someone when the target misbehaves; it carries no request load.",
    label: "Watches",
    style: {
      stroke: "var(--color-rose-500)",
      strokeWidth: 1.5,
      strokeDasharray: "1 4",
      strokeLinecap: "round",
    },
    animated: false,
  },
  scrapes: {
    description:
      "The source collects the target's metrics, so alerts on the target can fire; it carries no request load.",
    label: "Scrapes",
    style: {
      stroke: "var(--color-amber-500)",
      strokeWidth: 1.5,
      strokeDasharray: "1 4",
      strokeLinecap: "round",
    },
    animated: false,
  },
  "pipeline-next": {
    description:
      "The target stage starts once the source stage has finished; it carries no request load.",
    label: "Then",
    style: { stroke: "var(--color-sky-600)", strokeWidth: 1.5 },
    animated: false,
  },
  publishes: {
    description:
      "The stage pushes what it built to this registry; it carries no request load.",
    label: "Publishes",
    style: {
      stroke: "var(--color-emerald-600)",
      strokeWidth: 1.5,
      strokeDasharray: "6 4",
    },
    animated: false,
  },
  protects: {
    description:
      "The security group decides who may connect to the target; it carries no request load.",
    label: "Protects",
    style: {
      stroke: "var(--color-amber-600)",
      strokeWidth: 1.5,
      strokeDasharray: "2 4",
    },
    animated: false,
  },
  admits: {
    description:
      "The security group lets the target, or the members of the target group, connect; it carries no request load.",
    label: "Admits",
    style: {
      stroke: "var(--color-amber-600)",
      strokeWidth: 1.5,
      strokeDasharray: "1 4",
      strokeLinecap: "round",
    },
    animated: false,
  },
};
