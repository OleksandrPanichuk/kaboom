import type { DesignNode } from "@repo/design";

import {
  NODE_HEIGHT,
  NODE_WIDTH,
  TABLE_HEADER_HEIGHT,
  TABLE_ROW_HEIGHT,
  TABLE_WIDTH,
} from "@/features/canvas/constants";

import { documentRows } from "./documentRows";

export const nodeWidth = (node: DesignNode): number =>
  node.kind === "table" || node.kind === "collection"
    ? TABLE_WIDTH
    : NODE_WIDTH;

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

  return NODE_HEIGHT;
};
