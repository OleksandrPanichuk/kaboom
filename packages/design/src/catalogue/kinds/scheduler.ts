import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { prop } from "../prop-meta";
import { count, rate } from "./shared";

const seconds = (fallback: number, title: string, description: string) =>
  prop(z.number().int().min(1).max(86_400).default(fallback), {
    title,
    description,
    unit: "s",
  });

export const schedulerKind = defineNodeKind({
  kind: "scheduler",
  track: "system-design",
  label: "Scheduler",
  icon: "scheduler",
  stateful: false,
  replicable: false,
  carriesTraffic: true,
  distribution: "by-share",
  docs: {
    summary:
      "Starts work on a clock, like cron: every few minutes it sends a burst of jobs into the system.",
    useWhen:
      "Digests, reports, cleanups and anything else that runs on a timetable rather than on a request.",
    pitfalls: [
      "Every replica fires the schedule, so two replicas run every job twice unless they take a lock first.",
      "All the jobs of a run arrive at once; put a queue behind it so workers take them at their own pace.",
    ],
  },
  props: z.strictObject({
    everySeconds: seconds(300, "Every", "Time between two runs"),
    burstSeconds: seconds(
      30,
      "Burst length",
      "How long each run keeps sending jobs",
    ),
    jobsPerSecond: rate(1_000, {
      title: "Jobs per second",
      description: "Jobs one run sends a second while it lasts",
      unit: "msg/s",
    }),
    replicas: count(1, {
      title: "Replicas",
      description:
        "Copies of the scheduler; each fires unless they share a lock",
    }),
  }),
});
