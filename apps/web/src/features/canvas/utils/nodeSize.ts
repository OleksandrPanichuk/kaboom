import type { DesignNode } from "@repo/design";

import { isWideKind } from "@/features/canvas/constants";
import {
  NODE_HEIGHT,
  NODE_WIDTH,
  TABLE_HEADER_HEIGHT,
  TABLE_ROW_HEIGHT,
  TABLE_WIDTH,
} from "@/features/canvas/constants";

import { documentRows } from "./documentRows";
import { dynamoRows } from "./dynamoRows";

export const nodeWidth = (node: DesignNode): number =>
  isWideKind(node.kind) ? TABLE_WIDTH : NODE_WIDTH;

export const nodeHeight = (node: DesignNode): number => {
  if (node.kind === "table") {
    return (
      TABLE_HEADER_HEIGHT +
      Math.max(1, node.props.columns.length) * TABLE_ROW_HEIGHT
    );
  }

  if (node.kind === "collection") {
    return (
      TABLE_HEADER_HEIGHT +
      (1 + documentRows(node.props.fields).length) * TABLE_ROW_HEIGHT
    );
  }

  if (node.kind === "dynamo-table") {
    return TABLE_HEADER_HEIGHT + dynamoRows(node).length * TABLE_ROW_HEIGHT;
  }

  return NODE_HEIGHT;
};
