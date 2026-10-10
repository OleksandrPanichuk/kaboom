import type { DesignNode } from "@repo/design";

import {
  NODE_HEIGHT,
  NODE_WIDTH,
  TABLE_HEADER_HEIGHT,
  TABLE_ROW_HEIGHT,
  TABLE_WIDTH,
} from "@/features/canvas/constants";

export const nodeWidth = (node: DesignNode): number =>
  node.kind === "table" ? TABLE_WIDTH : NODE_WIDTH;

export const nodeHeight = (node: DesignNode): number =>
  node.kind === "table"
    ? TABLE_HEADER_HEIGHT +
      Math.max(1, node.props.columns.length) * TABLE_ROW_HEIGHT
    : NODE_HEIGHT;
