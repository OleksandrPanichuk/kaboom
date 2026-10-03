import type z from "zod";

import type { NodeKind, NodeProps } from "./catalogue";

export const PROVIDERS = ["self-hosted", "aws", "gcp", "azure"] as const;

export const PROVIDER_LABELS: Record<Provider, string> = {
  "self-hosted": "Self-hosted",
  aws: "AWS",
  gcp: "Google Cloud",
  azure: "Azure",
};

export type Provider = (typeof PROVIDERS)[number];

export interface TechnologyDefinition<
  Id extends string = string,
  Kind extends NodeKind = NodeKind,
  Props extends z.ZodObject = z.ZodObject,
> {
  id: Id;
  kind: Kind;
  provider: Provider;
  label: string;
  icon: string;
  summary: string;
  props: Props;
  derive: (props: z.output<Props>) => Partial<NodeProps<Kind>>;
}

export const defineTechnology = <
  const Id extends string,
  const Kind extends NodeKind,
  Props extends z.ZodObject,
>(
  definition: TechnologyDefinition<Id, Kind, Props>,
): TechnologyDefinition<Id, Kind, Props> => definition;
