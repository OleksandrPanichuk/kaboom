import type z from "zod";

import type { Engine, EngineFamily } from "./engines";

export const TRACKS = ["system-design", "devops", "data-model"] as const;

export type Track = (typeof TRACKS)[number];

export const TRACK_LABELS: Readonly<Record<Track, string>> = {
  "system-design": "System design",
  devops: "DevOps",
  "data-model": "Data model",
};

export interface NodeKindDocs {
  summary: string;
  useWhen: string;
  pitfalls: readonly [string, ...string[]];
}

export interface NodeKindHome {
  family: EngineFamily;
  required: boolean;
  engine: Engine;
  label: string;
}

export interface NodeKindDefinition<
  Kind extends string = string,
  Props extends z.ZodObject = z.ZodObject,
> {
  kind: Kind;
  track: Track;
  label: string;
  icon: string;
  stateful: boolean;
  replicable: boolean;
  carriesTraffic: boolean;
  distribution: "by-share" | "evenly" | "broadcast" | "routed";
  props: Props;
  docs: NodeKindDocs;
  home?: NodeKindHome;
}

export const defineNodeKind = <
  const Kind extends string,
  Props extends z.ZodObject,
>(
  definition: NodeKindDefinition<Kind, Props>,
): NodeKindDefinition<Kind, Props> => definition;
