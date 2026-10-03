import type z from "zod";

import { catalogue, type NodeKind, type NodeProps } from "./catalogue";
import type { TechnologyDefinition } from "./define-technology";
import { propControl } from "./prop-meta";
import * as all from "./technologies/index";

type AnyTechnology = TechnologyDefinition<string, NodeKind>;

export const technologies: Readonly<Record<string, AnyTechnology>> =
  Object.fromEntries(
    Object.values(all).map((technology) => [
      technology.id,
      technology as unknown as AnyTechnology,
    ]),
  );

export const findTechnology = (
  id: string,
  kind: NodeKind,
): AnyTechnology | undefined => {
  const technology = Object.hasOwn(technologies, id)
    ? technologies[id]
    : undefined;

  return technology?.kind === kind ? technology : undefined;
};

export const technologiesFor = (kind: NodeKind): AnyTechnology[] =>
  Object.values(technologies).filter((technology) => technology.kind === kind);

export const derivedProps = (
  kind: NodeKind,
  technology: { id: string; props: Record<string, unknown> } | null,
): Partial<NodeProps<NodeKind>> => {
  if (technology === null) return {};

  const definition = findTechnology(technology.id, kind);

  if (!definition) return {};

  const parsed = definition.props.safeParse(technology.props);

  if (!parsed.success) return {};

  const shape = catalogue[kind].props.shape as Record<string, z.ZodType>;

  return Object.fromEntries(
    Object.entries(definition.derive(parsed.data)).map(([key, value]) => {
      const control = shape[key] ? propControl(shape[key]) : null;

      if (typeof value !== "number" || control?.type !== "number") {
        return [key, value];
      }

      return [
        key,
        Math.min(
          control.max ?? Number.POSITIVE_INFINITY,
          Math.max(control.min ?? Number.NEGATIVE_INFINITY, value),
        ),
      ];
    }),
  );
};
