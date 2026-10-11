import { fieldAt } from "../../catalogue";
import type { DesignEdge, DesignGraph, DesignNode } from "../../graph";
import { reject } from "../rejection";

export const assertReference = (
  graph: DesignGraph,
  edge: DesignEdge,
  from: DesignNode,
  to: DesignNode,
): void => {
  if (from.kind !== "collection" || to.kind !== "collection") {
    return reject(
      "invalid-edge",
      `A reference joins two collections, and ${from.kind === "collection" ? to.label || to.id : from.label || from.id} is a ${from.kind === "collection" ? to.kind : from.kind}`,
    );
  }

  const reference =
    edge.reference ??
    reject(
      "invalid-edge",
      `Reference ${edge.id} names no field; it starts at the field that holds the other document's _id`,
    );
  const field =
    fieldAt(from.props.fields, reference.fromField) ??
    reject(
      "invalid-edge",
      `Reference ${edge.id} starts at ${reference.fromField.join(".")}, which ${from.label || from.id} does not have`,
    );
  const holdsIds =
    field.type === "objectId" ||
    (field.type === "array" && field.of === "objectId");

  if (!holdsIds) {
    reject(
      "invalid-edge",
      `${from.label || from.id}.${field.name} is a ${field.type === "array" ? `array of ${field.of}` : field.type}; a reference holds an objectId, or an array of them`,
    );
  }

  const path = reference.fromField.join("/");
  const taken = graph.edges.some(
    (other) =>
      other.id !== edge.id &&
      other.kind === "reference" &&
      other.from === edge.from &&
      other.reference?.fromField.join("/") === path,
  );

  if (taken) {
    reject(
      "invalid-edge",
      `${from.label || from.id}.${field.name} already references a collection`,
    );
  }
};
