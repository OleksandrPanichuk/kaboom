import { catalogue, EdgePropsSchema, findTechnology } from "../../catalogue";
import type { DesignEdge, DesignNode } from "../../graph";
import { reject } from "../rejection";

export const parseNodeProps = (
  node: DesignNode,
  props: unknown,
): DesignNode["props"] => {
  const result = catalogue[node.kind].props.safeParse(props);

  if (!result.success) {
    reject(
      "invalid-props",
      `Props of ${node.id}: ${result.error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`).join("; ")}`,
    );
  }

  return result.data!;
};

export const parseTechnology = (
  node: DesignNode,
  technology: DesignNode["technology"],
): DesignNode["technology"] => {
  if (technology === null) return null;

  const definition = findTechnology(technology.id, node.kind);

  if (!definition) {
    return reject(
      "unknown-technology",
      `No technology ${technology.id} for a ${node.kind}`,
    );
  }

  const result = definition.props.safeParse(technology.props);

  if (!result.success) {
    return reject(
      "invalid-props",
      `Technology props of ${node.id}: ${result.error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`).join("; ")}`,
    );
  }

  return { id: technology.id, props: result.data };
};

export const parseEdgeProps = (
  edge: DesignEdge,
  props: unknown,
): DesignEdge["props"] => {
  const result = EdgePropsSchema.safeParse(props);

  if (!result.success) {
    reject("invalid-props", `Props of edge ${edge.id} are invalid`);
  }

  return result.data!;
};
