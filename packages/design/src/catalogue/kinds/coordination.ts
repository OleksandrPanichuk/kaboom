import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { baseLatency, count } from "./shared";

export const coordinationKind = defineNodeKind({
  kind: "coordination",
  track: "system-design",
  label: "Coordination",
  icon: "coordination",
  stateful: true,
  replicable: false,
  carriesTraffic: true,
  distribution: "by-share",
  docs: {
    summary:
      "A small, strongly consistent store such as ZooKeeper or etcd that hands out locks and elects leaders.",
    useWhen:
      "Only one copy of something may act at a time: a scheduler, a leader, a job that must not run twice.",
    pitfalls: [
      "It needs a majority of its members up: with one or two, losing one stops every lock.",
      "When it is down nobody can take a lock, so work that needs one stops rather than runs twice.",
    ],
  },
  props: z.strictObject({
    members: count(3, {
      title: "Members",
      description: "Servers in the ensemble; a majority must be up",
    }),
    baseLatencyMs: baseLatency(5),
  }),
});
