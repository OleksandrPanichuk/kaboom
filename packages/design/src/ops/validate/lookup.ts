import type {
  DesignEdge,
  DesignGraph,
  DesignGroup,
  DesignNode,
} from "../../graph";
import { reject } from "../rejection";

export const idTaken = (graph: DesignGraph, id: string): boolean =>
  graph.nodes.some((node) => node.id === id) ||
  graph.edges.some((edge) => edge.id === id) ||
  graph.groups.some((group) => group.id === id);

export const assertFreeId = (graph: DesignGraph, id: string): void => {
  if (idTaken(graph, id)) reject("duplicate-id", `Id ${id} is already in use`);
};

export const findNode = (graph: DesignGraph, id: string): DesignNode =>
  graph.nodes.find((node) => node.id === id) ??
  reject("unknown-node", `No node ${id}`);

export const findEdge = (graph: DesignGraph, id: string): DesignEdge =>
  graph.edges.find((edge) => edge.id === id) ??
  reject("unknown-edge", `No edge ${id}`);

export const findGroup = (graph: DesignGraph, id: string): DesignGroup =>
  graph.groups.find((group) => group.id === id) ??
  reject("unknown-group", `No group ${id}`);

export const assertGroup = (
  graph: DesignGraph,
  groupId: string | null,
): void => {
  if (groupId !== null) findGroup(graph, groupId);
};
