import type { Fault, LoadScenarioInput } from "../evaluate/scenario";
import type { DesignGraph, DesignNode } from "../graph";
import type { DrillFault, LoadDrill, NodeSelector } from "./schema";

const isReplica = (graph: DesignGraph, id: string): boolean =>
  graph.edges.some((edge) => edge.kind === "replication" && edge.to === id);

export const selectNodes = (
  graph: DesignGraph,
  selector: NodeSelector,
): DesignNode[] =>
  graph.nodes.filter(
    (node) =>
      node.kind === selector.nodeKind &&
      (selector.role === "any" || !isReplica(graph, node.id)),
  );

const regionOf = (graph: DesignGraph, node: DesignNode): string | null => {
  const seen = new Set<string>();
  let current = graph.groups.find((group) => group.id === node.groupId);

  while (current && !seen.has(current.id)) {
    if (current.kind === "region") return current.id;
    seen.add(current.id);
    current = graph.groups.find((group) => group.id === current!.parentId);
  }

  return null;
};

const resolveFault = (graph: DesignGraph, fault: DrillFault): Fault[] => {
  const selected = selectNodes(graph, fault.select);

  if (fault.kind === "region-down") {
    const { select: _select, kind: _kind, ...timing } = fault;
    const regions = new Set(
      selected.flatMap((node) => regionOf(graph, node) ?? []),
    );
    const homeless = selected.some((node) => regionOf(graph, node) === null)
      ? graph.nodes.filter(
          (node) => node.kind !== "client" && regionOf(graph, node) === null,
        )
      : [];

    return [
      ...[...regions].map((groupId): Fault => ({
        kind: "region-down",
        groupId,
        ...timing,
      })),
      ...homeless.map((node): Fault => ({
        kind: "node-down",
        nodeId: node.id,
        ...timing,
      })),
    ];
  }

  return selected.map((node): Fault => {
    const { select: _select, ...rest } = fault;

    return { ...rest, nodeId: node.id };
  });
};

export const drillScenario = (
  drill: LoadDrill,
  graph: DesignGraph,
): LoadScenarioInput => ({
  kind: "load",
  durationSeconds: drill.durationSeconds,
  traffic: drill.traffic,
  faults: drill.faults.flatMap((fault) => resolveFault(graph, fault)),
  slo: drill.slo,
});
