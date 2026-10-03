import type z from "zod";

import {
  alertKind,
  apiGatewayKind,
  artifactRegistryKind,
  cacheKind,
  cdnKind,
  clientKind,
  configMapKind,
  coordinationKind,
  dnsKind,
  externalApiKind,
  hpaKind,
  ingressKind,
  k8sDeploymentKind,
  k8sServiceKind,
  loadBalancerKind,
  monitoringKind,
  natGatewayKind,
  nosqlDatabaseKind,
  objectStorageKind,
  pipelineStageKind,
  queueKind,
  rateLimiterKind,
  schedulerKind,
  searchIndexKind,
  secretKind,
  securityGroupKind,
  serviceKind,
  sqlDatabaseKind,
  streamKind,
  workerKind,
} from "./kinds";

export const catalogue = {
  [clientKind.kind]: clientKind,
  [dnsKind.kind]: dnsKind,
  [cdnKind.kind]: cdnKind,
  [loadBalancerKind.kind]: loadBalancerKind,
  [monitoringKind.kind]: monitoringKind,
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
  [ingressKind.kind]: ingressKind,
  [k8sServiceKind.kind]: k8sServiceKind,
  [k8sDeploymentKind.kind]: k8sDeploymentKind,
  [hpaKind.kind]: hpaKind,
  [configMapKind.kind]: configMapKind,
  [secretKind.kind]: secretKind,
  [alertKind.kind]: alertKind,
  [pipelineStageKind.kind]: pipelineStageKind,
  [artifactRegistryKind.kind]: artifactRegistryKind,
  [securityGroupKind.kind]: securityGroupKind,
  [natGatewayKind.kind]: natGatewayKind,
} as const;

export type Catalogue = typeof catalogue;

export type NodeKind = keyof Catalogue;

export type NodeProps<Kind extends NodeKind> = z.output<
  Catalogue[Kind]["props"]
>;

export const NODE_KINDS = Object.keys(catalogue) as NodeKind[];

export const isNodeKind = (value: unknown): value is NodeKind =>
  typeof value === "string" && Object.hasOwn(catalogue, value);
