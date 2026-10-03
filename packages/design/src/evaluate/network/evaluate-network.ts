import { carriesLoad, catalogue } from "../../catalogue";
import type { DesignEdge, DesignGraph, DesignNode } from "../../graph";
import type { ConnectionCheck, Finding, NetworkResult } from "../result";

type Zone = "internet" | "public" | "private";

interface Placement {
  vpc: string | null;
  zone: Zone;
}

type SecurityGroup = Extract<DesignNode, { kind: "security-group" }>;

const ENTRY_KINDS = new Set<DesignNode["kind"]>([
  "client",
  "dns",
  "cdn",
  "load-balancer",
  "api-gateway",
  "rate-limiter",
  "ingress",
]);

const labelOf = (node: DesignNode) => node.label || node.id;

export const evaluateNetwork = (graph: DesignGraph): NetworkResult => {
  const groups = new Map(graph.groups.map((group) => [group.id, group]));
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));

  const placementOf = (node: DesignNode): Placement => {
    let subnet: Zone | null = null;
    let current = node.groupId ? groups.get(node.groupId) : undefined;
    const seen = new Set<string>();

    while (current && !seen.has(current.id)) {
      seen.add(current.id);

      if (subnet === null && current.kind === "public-subnet")
        subnet = "public";
      if (subnet === null && current.kind === "private-subnet")
        subnet = "private";
      if (current.kind === "vpc") {
        return { vpc: current.id, zone: subnet ?? "private" };
      }

      current = current.parentId ? groups.get(current.parentId) : undefined;
    }

    return { vpc: null, zone: "internet" };
  };

  const guardOf = (id: string): SecurityGroup | null => {
    const edge = graph.edges.find(
      (candidate) => candidate.kind === "protects" && candidate.to === id,
    );
    const guard = edge ? byId.get(edge.from) : undefined;

    return guard?.kind === "security-group" ? guard : null;
  };

  const admits = (guard: SecurityGroup, source: DesignNode): boolean => {
    const sourceGuard = guardOf(source.id);

    return graph.edges.some(
      (edge) =>
        edge.kind === "admits" &&
        edge.from === guard.id &&
        (edge.to === source.id || edge.to === sourceGuard?.id),
    );
  };

  const egressFrom = (vpc: string): boolean =>
    graph.nodes.some((node) => {
      const placed = placementOf(node);

      return (
        node.kind === "nat-gateway" &&
        placed.vpc === vpc &&
        placed.zone === "public"
      );
    });

  const reachableFromInternet = (node: DesignNode): boolean => {
    const placed = placementOf(node);
    const guard = guardOf(node.id);

    if (placed.zone === "private") return false;

    return (
      placed.zone === "internet" || guard === null || guard.props.fromInternet
    );
  };

  const check = (edge: DesignEdge): ConnectionCheck => {
    const from = byId.get(edge.from)!;
    const to = byId.get(edge.to)!;
    const source = placementOf(from);
    const target = placementOf(to);
    const refuse = (reason: string): ConnectionCheck => ({
      edgeId: edge.id,
      allowed: false,
      reason,
    });

    if (target.zone === "internet") {
      if (source.zone === "private" && !egressFrom(source.vpc!)) {
        return refuse(
          `${labelOf(from)} sits in a private subnet with no NAT gateway, so it cannot call ${labelOf(to)} outside the VPC.`,
        );
      }

      return { edgeId: edge.id, allowed: true, reason: null };
    }

    if (source.vpc !== target.vpc) {
      if (target.zone === "private") {
        return refuse(
          `${labelOf(to)} sits in a private subnet, so ${labelOf(from)} cannot reach it from outside its VPC.`,
        );
      }
    }

    const guard = guardOf(to.id);

    if (guard) {
      const outside = source.vpc !== target.vpc;
      const allowed = outside
        ? guard.props.fromInternet
        : guard.props.fromVpc || admits(guard, from);

      if (!allowed) {
        return refuse(
          `${labelOf(guard)} does not admit ${labelOf(from)}, so it cannot connect to ${labelOf(to)}.`,
        );
      }
    }

    return { edgeId: edge.id, allowed: true, reason: null };
  };

  const connections = graph.edges
    .filter((edge) => carriesLoad(edge.kind))
    .map(check);
  const findings: Finding[] = [];

  for (const connection of connections) {
    if (connection.allowed) continue;

    findings.push({
      target: { type: "edge", id: connection.edgeId },
      kind: "blocked-path",
      atStep: 0,
      message: connection.reason!,
      data: {},
    });
  }

  const exposed = graph.nodes
    .filter(
      (node) =>
        catalogue[node.kind].carriesTraffic &&
        node.kind !== "client" &&
        node.kind !== "external-api" &&
        reachableFromInternet(node),
    )
    .map((node) => node.id);

  for (const id of exposed) {
    const node = byId.get(id)!;

    if (ENTRY_KINDS.has(node.kind)) continue;

    if (catalogue[node.kind].stateful) {
      findings.push({
        target: { type: "node", id },
        kind: "exposed-store",
        atStep: 0,
        message: `${labelOf(node)} can be reached from the internet, so anyone who finds it can try its data.`,
        data: {},
      });
    } else {
      findings.push({
        target: { type: "node", id },
        kind: "exposed-service",
        atStep: 0,
        message: `${labelOf(node)} can be reached from the internet directly, around the entry point in front of it.`,
        data: {},
      });
    }
  }

  for (const node of graph.nodes) {
    const placed = placementOf(node);

    if (!catalogue[node.kind].stateful || placed.vpc === null) continue;

    const guard = guardOf(node.id);

    if (guard === null || guard.props.fromVpc) {
      findings.push({
        target: { type: "node", id: node.id },
        kind: "open-store",
        atStep: 0,
        message:
          guard === null
            ? `${labelOf(node)} has no security group, so anything in the VPC can connect to it.`
            : `${labelOf(guard)} admits the whole VPC to ${labelOf(node)}, not only what needs it.`,
        data: {},
      });
    }
  }

  return { connections, exposed, findings };
};
