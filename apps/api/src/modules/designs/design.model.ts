import { MAX_GROUPS, MAX_NODES } from "@repo/design";
import { t } from "elysia";

const COORDINATE = { minimum: -1_000_000, maximum: 1_000_000 };

export const DesignLayoutModel = t.Record(
  t.String({ minLength: 1, maxLength: 64 }),
  t.Object({ x: t.Number(COORDINATE), y: t.Number(COORDINATE) }),
  { maxProperties: MAX_NODES + MAX_GROUPS },
);
export type DesignLayoutModel = typeof DesignLayoutModel.static;

export const DesignModel = t.Object({
  id: t.String({ format: "uuid" }),
  name: t.String(),
  graph: t.Unknown(),
  layout: DesignLayoutModel,
  revision: t.Integer(),
  graphHash: t.String(),
  createdAt: t.String({ format: "date-time" }),
  updatedAt: t.String({ format: "date-time" }),
});
export type DesignModel = typeof DesignModel.static;

export const DesignSummaryModel = t.Object({
  id: t.String({ format: "uuid" }),
  name: t.String(),
  revision: t.Integer(),
  createdAt: t.String({ format: "date-time" }),
  updatedAt: t.String({ format: "date-time" }),
});
export type DesignSummaryModel = typeof DesignSummaryModel.static;

export const AppliedDesignOpsModel = t.Object({
  revision: t.Integer(),
  graph: t.Unknown(),
  graphHash: t.String(),
});
export type AppliedDesignOpsModel = typeof AppliedDesignOpsModel.static;

export const DesignMessageModel = t.Object({
  message: t.String(),
});
export type DesignMessageModel = typeof DesignMessageModel.static;
