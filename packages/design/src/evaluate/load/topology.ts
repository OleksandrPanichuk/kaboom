import { carriesLoad } from "../../catalogue";
import type { DesignEdge, DesignGraph, DesignNode } from "../../graph";

export interface Topology {
  order: DesignNode[];
  byId: Map<string, DesignNode>;
  inbound: Map<string, DesignEdge[]>;
  outbound: Map<string, DesignEdge[]>;
  replicasOf: Map<string, string[]>;
  primaryOf: Map<string, string>;
  locksOf: Map<string, string[]>;
  groupsOf: Map<string, string[]>;
  regionOf: Map<string, string | null>;
}

export const topology = (graph: DesignGraph): Topology => {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const inbound = new Map<string, DesignEdge[]>();
  const outbound = new Map<string, DesignEdge[]>();
  const replicasOf = new Map<string, string[]>();
  const primaryOf = new Map<string, string>();
  const locksOf = new Map<string, string[]>();

  for (const node of graph.nodes) {
    inbound.set(node.id, []);
    outbound.set(node.id, []);
  }

  for (const edge of graph.edges) {
    if (edge.kind === "replication") {
      replicasOf.set(edge.from, [
        ...(replicasOf.get(edge.from) ?? []),
        edge.to,
      ]);
      primaryOf.set(edge.to, edge.from);
    } else if (edge.kind === "lock") {
      locksOf.set(edge.from, [...(locksOf.get(edge.from) ?? []), edge.to]);
    } else if (carriesLoad(edge.kind)) {
      inbound.get(edge.to)?.push(edge);
      outbound.get(edge.from)?.push(edge);
    }
  }

  const groups = new Map(graph.groups.map((group) => [group.id, group]));
  const groupsOf = new Map<string, string[]>();
  const regionOf = new Map<string, string | null>();

  for (const node of graph.nodes) {
    const chain: string[] = [];
    let region: string | null = null;
    let current = node.groupId ? groups.get(node.groupId) : undefined;

    while (current && !chain.includes(current.id)) {
      chain.push(current.id);
      if (region === null && current.kind === "region") region = current.id;
      current = current.parentId ? groups.get(current.parentId) : undefined;
    }

    groupsOf.set(node.id, chain);
    regionOf.set(node.id, region);
  }

  const remaining = new Map(
    graph.nodes.map((node) => [node.id, inbound.get(node.id)?.length ?? 0]),
  );
  const ready = graph.nodes.filter((node) => remaining.get(node.id) === 0);
  const order: DesignNode[] = [];

  while (ready.length > 0) {
    const node = ready.shift()!;

    order.push(node);

    for (const edge of outbound.get(node.id) ?? []) {
      const left = (remaining.get(edge.to) ?? 0) - 1;

      remaining.set(edge.to, left);

      if (left === 0) ready.push(byId.get(edge.to)!);
    }
  }

  return {
    order,
    byId,
    inbound,
    outbound,
    replicasOf,
    primaryOf,
    locksOf,
    groupsOf,
    regionOf,
  };
};
