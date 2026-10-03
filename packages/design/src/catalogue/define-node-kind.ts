import type z from "zod";

export const TRACKS = ["system-design", "devops"] as const;

export type Track = (typeof TRACKS)[number];

export interface NodeKindDocs {
  summary: string;
  useWhen: string;
  pitfalls: readonly [string, ...string[]];
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
}

export const defineNodeKind = <
  const Kind extends string,
  Props extends z.ZodObject,
>(
  definition: NodeKindDefinition<Kind, Props>,
): NodeKindDefinition<Kind, Props> => definition;
