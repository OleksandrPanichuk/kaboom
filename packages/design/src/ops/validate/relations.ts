import { isKeyExactly, relationPairs } from "../../data-model/tables";
import type { DesignEdge, DesignGraph, DesignNode } from "../../graph";
import { reject } from "../rejection";
import { findNode } from "./lookup";
import { assertReference } from "./references";

export const assertRelation = (
  graph: DesignGraph,
  edge: DesignEdge,
  from: DesignNode,
  to: DesignNode,
): void => {
  if (from.kind !== "table" || to.kind !== "table") {
    return reject(
      "invalid-edge",
      `A relation joins two tables, and ${from.kind === "table" ? to.label || to.id : from.label || from.id} is a ${from.kind === "table" ? to.kind : from.kind}`,
    );
  }

  const relation =
    edge.relation ??
    reject(
      "invalid-edge",
      `Relation ${edge.id} names no columns; it joins a foreign key to the column it references`,
    );

  const pairs = relationPairs(relation).map((pair) => ({
    from:
      from.props.columns.find((column) => column.id === pair.fromColumn) ??
      reject(
        "invalid-edge",
        `Relation ${edge.id} starts at column ${pair.fromColumn}, which ${from.label || from.id} does not have`,
      ),
    to:
      to.props.columns.find((column) => column.id === pair.toColumn) ??
      reject(
        "invalid-edge",
        `Relation ${edge.id} references column ${pair.toColumn}, which ${to.label || to.id} does not have`,
      ),
  }));
  const foreignKeys = pairs.map((pair) => pair.from);
  const referenced = pairs.map((pair) => pair.to);
  const fromName = from.label || from.id;
  const toName = to.label || to.id;
  const listed = (columns: typeof foreignKeys) =>
    columns.length === 1
      ? columns[0]!.name
      : `(${columns.map((column) => column.name).join(", ")})`;

  if (
    new Set(foreignKeys.map((column) => column.id)).size !== pairs.length ||
    new Set(referenced.map((column) => column.id)).size !== pairs.length
  ) {
    reject(
      "invalid-edge",
      `Relation ${edge.id} names a column twice; each column of a composite key appears once`,
    );
  }

  if (
    !isKeyExactly(
      to,
      referenced.map((column) => column.id),
    )
  ) {
    reject(
      "invalid-edge",
      pairs.length === 1
        ? `${toName}.${referenced[0]!.name} is neither the primary key of ${toName} nor unique, so a foreign key cannot reference it`
        : `${toName}.${listed(referenced)} is neither the primary key of ${toName} nor a unique key, so a foreign key cannot reference it`,
    );
  }

  if (from.id === to.id && pairs.every((pair) => pair.from.id === pair.to.id)) {
    reject(
      "invalid-edge",
      `${fromName}.${listed(foreignKeys)} cannot reference itself`,
    );
  }

  const ids = new Set(foreignKeys.map((column) => column.id));
  const taken = graph.edges.some((other) => {
    if (
      other.id === edge.id ||
      other.kind !== "relation" ||
      other.from !== edge.from ||
      !other.relation
    ) {
      return false;
    }

    const theirs = relationPairs(other.relation).map((pair) => pair.fromColumn);

    return theirs.length === ids.size && theirs.every((id) => ids.has(id));
  });

  if (taken) {
    reject(
      "invalid-edge",
      pairs.length === 1
        ? `${fromName}.${foreignKeys[0]!.name} already references a table; a column is one foreign key`
        : `${fromName}.${listed(foreignKeys)} already references a table`,
    );
  }
};

export const assertRelationsOf = (graph: DesignGraph, nodeId: string): void => {
  for (const edge of graph.edges) {
    if (
      edge.kind === "reference" &&
      (edge.from === nodeId || edge.to === nodeId)
    ) {
      assertReference(
        graph,
        edge,
        findNode(graph, edge.from),
        findNode(graph, edge.to),
      );
    }

    if (
      edge.kind === "relation" &&
      (edge.from === nodeId || edge.to === nodeId)
    ) {
      assertRelation(
        graph,
        edge,
        findNode(graph, edge.from),
        findNode(graph, edge.to),
      );
    }
  }
};
