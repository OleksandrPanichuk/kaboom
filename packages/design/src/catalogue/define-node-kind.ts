import type z from "zod";

export type Track = "system-design";

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
  distribution: "by-share" | "evenly";
  props: Props;
}

export const defineNodeKind = <
  const Kind extends string,
  Props extends z.ZodObject,
>(
  definition: NodeKindDefinition<Kind, Props>,
): NodeKindDefinition<Kind, Props> => definition;
