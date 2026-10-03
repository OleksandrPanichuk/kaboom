import type { NodeKind, NodeProps } from "./catalogue";
import type { TechnologyDefinition } from "./define-technology";
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

  return parsed.success ? definition.derive(parsed.data) : {};
};
