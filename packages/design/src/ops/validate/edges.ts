import { carriesLoad, catalogue, opensConnections } from "../../catalogue";
import type { DesignEdge, DesignGraph, DesignNode } from "../../graph";
import { reject } from "../rejection";
import { findNode } from "./lookup";
import { assertReference } from "./references";
import { assertRelation } from "./relations";

export const reaches = (
  graph: DesignGraph,
  from: string,
  target: string,
  ignoring: string,
): boolean => {
  const seen = new Set<string>();
  const stack = [from];

  while (stack.length > 0) {
    const current = stack.pop()!;

    if (current === target) return true;
    if (seen.has(current)) continue;

    seen.add(current);

    for (const edge of graph.edges) {
      if (
        edge.id !== ignoring &&
        edge.from === current &&
        carriesLoad(edge.kind)
      ) {
        stack.push(edge.to);
      }
    }
  }

  return false;
};

export const assertValidEdge = (graph: DesignGraph, edge: DesignEdge): void => {
  const from = findNode(graph, edge.from);
  const to = findNode(graph, edge.to);

  if (from.id === to.id && edge.kind !== "relation") {
    reject("invalid-edge", `Edge ${edge.id} connects ${from.id} to itself`);
  }

  if (edge.kind !== "reference" && edge.reference !== undefined) {
    reject(
      "invalid-edge",
      `Edge ${edge.id} is a ${edge.kind}; only a reference starts at a field`,
    );
  }

  if (edge.connection !== undefined && !opensConnections(edge.kind, to.kind)) {
    reject(
      "invalid-edge",
      `Edge ${edge.id} is a ${edge.kind} to ${to.label || to.id}, a ${to.kind}; only a call, read or write into a SQL database or a connection pooler holds a pool of connections`,
    );
  }

  if (edge.kind !== "relation" && edge.relation !== undefined) {
    reject(
      "invalid-edge",
      `Edge ${edge.id} is a ${edge.kind}; only a relation joins columns`,
    );
  }

  if (to.kind === "client" || to.kind === "scheduler") {
    reject(
      "invalid-edge",
      `Edge ${edge.id} ends at ${to.id}, a ${to.kind}; it starts work and nothing calls it`,
    );
  }

  if ((edge.kind === "lock") !== (to.kind === "coordination")) {
    reject(
      "invalid-edge",
      edge.kind === "lock"
        ? `Edge ${edge.id} takes a lock on ${to.id}, a ${to.kind}; locks are taken on a coordination service`
        : `Edge ${edge.id} ends at ${to.id}, a coordination service; it only hands out locks`,
    );
  }

  if (
    edge.kind === "change-feed" &&
    from.kind !== "sql-database" &&
    from.kind !== "nosql-database"
  ) {
    reject(
      "invalid-edge",
      `Edge ${edge.id} is a change feed from ${from.id}, a ${from.kind}; only a database publishes one`,
    );
  }

  if (edge.kind === "replication") {
    if (from.kind !== to.kind || !catalogue[from.kind].replicable) {
      reject(
        "invalid-edge",
        `Edge ${edge.id} replicates ${from.kind} to ${to.kind}; replication joins two stores of one replicable kind`,
      );
    }
  }

  assertControlEdge(graph, edge, from, to);

  const duplicate =
    edge.kind !== "relation" &&
    graph.edges.some(
      (other) =>
        other.id !== edge.id &&
        other.from === edge.from &&
        other.to === edge.to &&
        other.kind === edge.kind,
    );

  if (duplicate) {
    reject(
      "invalid-edge",
      `A ${edge.kind} edge from ${edge.from} to ${edge.to} already exists`,
    );
  }

  if (carriesLoad(edge.kind) && reaches(graph, edge.to, edge.from, edge.id)) {
    reject(
      "load-cycle",
      `Edge ${edge.id} closes a cycle: ${edge.to} already reaches ${edge.from}`,
    );
  }
};

export const stagesAfter = (
  graph: DesignGraph,
  from: string,
  ignoring: string,
): Set<string> => {
  const seen = new Set<string>();
  const stack = [from];

  while (stack.length > 0) {
    const current = stack.pop()!;

    if (seen.has(current)) continue;

    seen.add(current);

    for (const edge of graph.edges) {
      if (
        edge.id !== ignoring &&
        edge.kind === "pipeline-next" &&
        edge.from === current
      ) {
        stack.push(edge.to);
      }
    }
  }

  return seen;
};

export const assertControlEdge = (
  graph: DesignGraph,
  edge: DesignEdge,
  from: DesignNode,
  to: DesignNode,
): void => {
  switch (edge.kind) {
    case "mounts":
      if (
        from.kind !== "k8s-deployment" ||
        (to.kind !== "config-map" && to.kind !== "secret")
      ) {
        reject(
          "invalid-edge",
          `Edge ${edge.id} mounts ${to.id}, a ${to.kind}, into ${from.id}, a ${from.kind}; a deployment mounts config maps and secrets`,
        );
      }
      return;
    case "scales":
      if (from.kind !== "hpa" || to.kind !== "k8s-deployment") {
        reject(
          "invalid-edge",
          `Edge ${edge.id} scales ${to.id}, a ${to.kind}, from ${from.id}, a ${from.kind}; a pod autoscaler scales a deployment`,
        );
      }
      if (
        graph.edges.some(
          (other) =>
            other.id !== edge.id &&
            other.kind === "scales" &&
            other.to === edge.to,
        )
      ) {
        reject(
          "invalid-edge",
          `${to.id} already has a pod autoscaler; two would fight over its replicas`,
        );
      }
      return;
    case "watches":
      if (from.kind !== "alert" || !catalogue[to.kind].carriesTraffic) {
        reject(
          "invalid-edge",
          `Edge ${edge.id} watches ${to.id}, a ${to.kind}, from ${from.id}, a ${from.kind}; an alert watches a node that serves traffic`,
        );
      }
      return;
    case "scrapes":
      if (from.kind !== "monitoring" || !catalogue[to.kind].carriesTraffic) {
        reject(
          "invalid-edge",
          `Edge ${edge.id} scrapes ${to.id}, a ${to.kind}, from ${from.id}, a ${from.kind}; monitoring scrapes a node that serves traffic`,
        );
      }
      return;
    case "pipeline-next":
      if (from.kind !== "pipeline-stage" || to.kind !== "pipeline-stage") {
        reject(
          "invalid-edge",
          `Edge ${edge.id} runs ${to.id}, a ${to.kind}, after ${from.id}, a ${from.kind}; a pipeline joins its stages`,
        );
      }
      if (stagesAfter(graph, edge.to, edge.id).has(edge.from)) {
        reject(
          "invalid-edge",
          `Edge ${edge.id} closes a loop in the pipeline: ${to.id} already runs before ${from.id}`,
        );
      }
      return;
    case "publishes":
      if (from.kind !== "pipeline-stage" || to.kind !== "artifact-registry") {
        reject(
          "invalid-edge",
          `Edge ${edge.id} publishes from ${from.id}, a ${from.kind}, to ${to.id}, a ${to.kind}; a pipeline stage publishes to an artifact registry`,
        );
      }
      return;
    case "protects":
      if (
        from.kind !== "security-group" ||
        !catalogue[to.kind].carriesTraffic
      ) {
        reject(
          "invalid-edge",
          `Edge ${edge.id} protects ${to.id}, a ${to.kind}, with ${from.id}, a ${from.kind}; a security group protects a node that serves traffic`,
        );
      }
      if (
        graph.edges.some(
          (other) =>
            other.id !== edge.id &&
            other.kind === "protects" &&
            other.to === edge.to,
        )
      ) {
        reject(
          "invalid-edge",
          `${to.id} already has a security group; give it one that admits everything it needs`,
        );
      }
      return;
    case "admits":
      if (
        from.kind !== "security-group" ||
        (to.kind !== "security-group" && !catalogue[to.kind].carriesTraffic)
      ) {
        reject(
          "invalid-edge",
          `Edge ${edge.id} admits ${to.id}, a ${to.kind}, into ${from.id}, a ${from.kind}; a security group admits a node or the members of another security group`,
        );
      }
      return;
    case "relation":
      assertRelation(graph, edge, from, to);
      return;
    case "reference":
      assertReference(graph, edge, from, to);
      return;
    default:
      if (
        !catalogue[from.kind].carriesTraffic ||
        !catalogue[to.kind].carriesTraffic
      ) {
        const idle = catalogue[from.kind].carriesTraffic ? to : from;

        reject(
          "invalid-edge",
          `Edge ${edge.id} sends ${edge.kind} traffic through ${idle.id}, a ${idle.kind}; it serves no requests`,
        );
      }
  }
};
