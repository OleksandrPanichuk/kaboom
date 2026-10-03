import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { prop } from "../prop-meta";
import { count } from "./shared";

export const hpaKind = defineNodeKind({
  kind: "hpa",
  track: "devops",
  label: "Pod autoscaler",
  icon: "hpa",
  stateful: false,
  replicable: false,
  carriesTraffic: false,
  distribution: "by-share",
  docs: {
    summary:
      "A horizontal pod autoscaler: adds pods to a deployment while its pods stay busier than a target.",
    useWhen:
      "Traffic to a deployment changes faster or further than anyone wants to resize it by hand.",
    pitfalls: [
      "It reacts after pods are already busy, so a sudden spike still saturates them for a while.",
      "Its minimum is the floor during a rollout too; a minimum of one leaves a single pod to replace.",
    ],
  },
  props: z.strictObject({
    min: count(2, {
      title: "Minimum pods",
      description: "Never fewer, whatever the load",
    }),
    max: count(10, {
      title: "Maximum pods",
      description: "Never more, whatever the load",
    }),
    targetUtilisation: prop(z.number().min(0.1).max(1).default(0.7), {
      title: "Target utilisation",
      description: "Adds pods once busier than this for two steps in a row",
      unit: "ratio",
    }),
  }),
});
