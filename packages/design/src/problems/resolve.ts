import type { Fault, LoadScenarioInput } from "../evaluate/scenario";
import type { DesignGraph, DesignNode } from "../graph";
import type { Drill, DrillFault, NodeSelector } from "./schema";

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

const resolveFault = (graph: DesignGraph, fault: DrillFault): Fault[] =>
  selectNodes(graph, fault.select).map((node): Fault => {
    const { select: _select, ...rest } = fault;

    return { ...rest, nodeId: node.id };
  });

export const drillScenario = (
  drill: Drill,
  graph: DesignGraph,
): LoadScenarioInput => ({
  kind: "load",
  durationSeconds: drill.durationSeconds,
  traffic: drill.traffic,
  faults: drill.faults.flatMap((fault) => resolveFault(graph, fault)),
  slo: drill.slo,
});
