import type z from "zod";

import {
  apiGatewayKind,
  cacheKind,
  cdnKind,
  clientKind,
  coordinationKind,
  externalApiKind,
  loadBalancerKind,
  nosqlDatabaseKind,
  objectStorageKind,
  queueKind,
  rateLimiterKind,
  schedulerKind,
  searchIndexKind,
  serviceKind,
  sqlDatabaseKind,
  streamKind,
  workerKind,
} from "./kinds";

export const catalogue = {
  [clientKind.kind]: clientKind,
  [cdnKind.kind]: cdnKind,
  [loadBalancerKind.kind]: loadBalancerKind,
  [apiGatewayKind.kind]: apiGatewayKind,
  [rateLimiterKind.kind]: rateLimiterKind,
  [serviceKind.kind]: serviceKind,
  [cacheKind.kind]: cacheKind,
  [sqlDatabaseKind.kind]: sqlDatabaseKind,
  [nosqlDatabaseKind.kind]: nosqlDatabaseKind,
  [queueKind.kind]: queueKind,
  [streamKind.kind]: streamKind,
  [workerKind.kind]: workerKind,
  [schedulerKind.kind]: schedulerKind,
  [objectStorageKind.kind]: objectStorageKind,
  [searchIndexKind.kind]: searchIndexKind,
  [coordinationKind.kind]: coordinationKind,
  [externalApiKind.kind]: externalApiKind,
} as const;

export type Catalogue = typeof catalogue;

export type NodeKind = keyof Catalogue;

export type NodeProps<Kind extends NodeKind> = z.output<
  Catalogue[Kind]["props"]
>;

export const NODE_KINDS = Object.keys(catalogue) as NodeKind[];

export const isNodeKind = (value: unknown): value is NodeKind =>
  typeof value === "string" && Object.hasOwn(catalogue, value);
