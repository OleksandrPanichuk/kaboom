import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import {
  baseLatency,
  choice,
  count,
  pods,
  rate,
  seconds,
  toggle,
} from "./shared";

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
      "Without a readiness probe a new pod gets traffic as soon as it starts, whether or not it can answer.",
      "A rollout that cannot finish just stops; nothing rolls it back or tells anyone unless something watches it.",
      "A pod that hangs still passes a shallow readiness check, so without a liveness probe it stays in rotation and fails everything it is sent.",
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
    strategy: choice(
      ["rolling", "recreate", "blue-green", "canary"],
      "rolling",
      {
        title: "Rollout strategy",
        description:
          "Rolling replaces pods a few at a time, recreate all at once, blue-green switches to a full new set, canary tries one pod first",
      },
    ),
    maxSurge: pods(1, {
      title: "Max surge",
      description:
        "Extra pods a rolling update may start above the replica count",
    }),
    maxUnavailable: pods(1, {
      title: "Max unavailable",
      description:
        "Pods a rolling update may take away before new ones are ready",
    }),
    readinessProbe: toggle(false, {
      title: "Readiness probe",
      description: "A new pod gets traffic only once it answers its check",
    }),
    livenessProbe: toggle(false, {
      title: "Liveness probe",
      description:
        "A pod that stops answering its check is restarted instead of kept in rotation",
    }),
    secretDelivery: choice(["env", "volume"], "env", {
      title: "Secrets as",
      description:
        "Environment variables are read once at start; a mounted volume is refreshed within about a minute of a change",
      advanced: true,
    }),
    restartOnSecretChange: toggle(false, {
      title: "Restart on secret change",
      description:
        "A change to a mounted secret rolls the pods, so new ones start with the new value",
      advanced: true,
    }),
    schemaChanges: choice(["breaking", "backward-compatible"], "breaking", {
      title: "Schema changes",
      description:
        "Whether a release's migration still works with the previous version, as expand and contract does",
      advanced: true,
    }),
    startupSeconds: seconds(30, {
      title: "Startup time",
      description: "From a pod being created to it being ready",
      advanced: true,
    }),
    progressDeadlineSeconds: seconds(600, {
      title: "Progress deadline",
      description:
        "How long a rollout may go without finishing before it is reported stuck",
      advanced: true,
    }),
    canarySeconds: seconds(120, {
      title: "Canary analysis",
      description:
        "How long the canary must serve cleanly before the rest follows",
      advanced: true,
    }),
  }),
});
