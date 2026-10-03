import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { baseLatency, count, rate } from "./shared";

export const k8sDeploymentKind = defineNodeKind({
  kind: "k8s-deployment",
  track: "devops",
  label: "Deployment",
  icon: "k8s-deployment",
  stateful: false,
  replicable: false,
  carriesTraffic: true,
  distribution: "by-share",
  docs: {
    summary:
      "A set of identical pods running one version of an app, replaced by a rollout when the version changes.",
    useWhen:
      "A stateless app runs on Kubernetes and has to keep running while it is updated.",
    pitfalls: [
      "One replica is a single point of failure, and every rollout of it is an outage.",
      "Without a horizontal pod autoscaler the replica count is fixed, whatever the traffic does.",
    ],
  },
  props: z.strictObject({
    replicas: count(3, {
      title: "Replicas",
      description: "Pods kept running",
    }),
    capacityRpsPerReplica: rate(500, {
      title: "Capacity per pod",
      description: "Requests one pod handles before it saturates",
    }),
    baseLatencyMs: baseLatency(20),
  }),
});
