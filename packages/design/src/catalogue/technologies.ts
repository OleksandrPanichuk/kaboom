import type { NodeKind } from "./catalogue";
import type { TechnologyDefinition } from "./define-technology";

type AnyTechnology = TechnologyDefinition<string, NodeKind>;

export const technologies: Readonly<Record<string, AnyTechnology>> = {};

export const findTechnology = (
  id: string,
  kind: NodeKind,
): AnyTechnology | undefined => {
  const technology = Object.hasOwn(technologies, id)
    ? technologies[id]
    : undefined;

  return technology?.kind === kind ? technology : undefined;
};
