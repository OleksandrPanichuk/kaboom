import {
  catalogue,
  ENGINE_FAMILIES,
  ENGINE_LABELS,
  type EngineFamily,
} from "../../catalogue";
import type { DesignGraph, DesignGroup, DesignNode } from "../../graph";
import { reject } from "../rejection";
import { findGroup } from "./lookup";

export const SUBNETS = new Set<DesignGroup["kind"]>([
  "public-subnet",
  "private-subnet",
]);

export const assertNesting = (graph: DesignGraph, group: DesignGroup): void => {
  const parent =
    group.parentId === null ? null : findGroup(graph, group.parentId);

  if (SUBNETS.has(group.kind) && parent?.kind !== "vpc") {
    reject(
      "invalid-op",
      `Group ${group.id} is a subnet; a subnet sits inside a VPC`,
    );
  }

  if (group.kind === "vpc" && parent !== null && parent.kind !== "region") {
    reject(
      "invalid-op",
      `Group ${group.id} is a VPC; a VPC sits in a region or on its own`,
    );
  }

  if (group.kind === "region" && parent !== null) {
    reject(
      "invalid-op",
      `Group ${group.id} is a region; nothing holds a region`,
    );
  }

  if (
    group.kind === "database" &&
    parent !== null &&
    parent.kind !== "region"
  ) {
    reject(
      "invalid-op",
      `Group ${group.id} is a database; a database sits in a region or on its own`,
    );
  }

  if ((group.kind === "database") !== (group.engine !== undefined)) {
    reject(
      "invalid-op",
      group.kind === "database"
        ? `Database ${group.id} names no engine`
        : `Group ${group.id} is a ${group.kind}; only a database has an engine`,
    );
  }
};

export const homeOf = (kind: DesignNode["kind"]) => catalogue[kind].home;

export const FAMILY_HOLDS: Readonly<Record<EngineFamily, string>> = {
  sql: "tables",
  document: "collections",
  "key-value": "DynamoDB tables",
};

export const assertPlacement = (graph: DesignGraph, node: DesignNode): void => {
  const home = homeOf(node.kind);

  if (home?.required) {
    const group = graph.groups.find((item) => item.id === node.groupId);

    if (!group?.engine || ENGINE_FAMILIES[group.engine] !== home.family) {
      reject(
        "invalid-op",
        `${node.label || node.id} is a ${node.kind}; it lives in a ${ENGINE_LABELS[home.engine]} database`,
      );
    }
  }

  if (node.groupId === null) return;

  const group = findGroup(graph, node.groupId);

  if (group.kind !== "database" || group.engine === undefined) return;

  const family = ENGINE_FAMILIES[group.engine];

  if (homeOf(node.kind)?.family !== family) {
    reject(
      "invalid-op",
      `${node.label || node.id} is a ${node.kind}; a ${ENGINE_LABELS[group.engine]} database holds ${FAMILY_HOLDS[family]}`,
    );
  }
};

export const STORES: Readonly<Record<EngineFamily, DesignNode["kind"]>> = {
  sql: "sql-database",
  document: "nosql-database",
  "key-value": "nosql-database",
};

export const assertStoredOn = (
  graph: DesignGraph,
  group: DesignGroup,
): void => {
  if (group.storedOn === undefined) return;

  const engine =
    group.kind === "database" && group.engine !== undefined
      ? group.engine
      : reject(
          "invalid-op",
          `Group ${group.id} is a ${group.kind}; only a database is stored on a node`,
        );

  const node =
    graph.nodes.find((candidate) => candidate.id === group.storedOn) ??
    reject(
      "invalid-op",
      `${group.label || group.id} is stored on ${group.storedOn}, which the design does not have`,
    );
  const kind = STORES[ENGINE_FAMILIES[engine]];

  if (node.kind !== kind) {
    reject(
      "invalid-op",
      `${group.label || group.id} is a ${ENGINE_LABELS[engine]} database, so it lives on a ${catalogue[kind].label.toLowerCase()}, and ${node.label || node.id} is a ${catalogue[node.kind].label.toLowerCase()}`,
    );
  }
};
