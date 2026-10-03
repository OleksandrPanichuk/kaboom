import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { choice } from "./shared";

export const k8sServiceKind = defineNodeKind({
  kind: "k8s-service",
  track: "devops",
  label: "Kubernetes service",
  icon: "k8s-service",
  stateful: false,
  replicable: false,
  carriesTraffic: true,
  distribution: "evenly",
  docs: {
    summary:
      "A stable name in front of a set of pods that spreads requests over the ones that are ready.",
    useWhen:
      "Anything has to call pods whose addresses change as they are replaced.",
    pitfalls: [
      "It sends traffic to every pod it counts as ready, so a pod without a readiness probe gets requests before it can answer them.",
      "It balances connections, not requests, so long-lived connections can pile onto a few pods.",
    ],
  },
  props: z.strictObject({
    type: choice(["cluster-ip", "node-port", "load-balancer"], "cluster-ip", {
      title: "Type",
      description:
        "Cluster IP is reachable inside the cluster only; the others expose it outside",
    }),
  }),
});
