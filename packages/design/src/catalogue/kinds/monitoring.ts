import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { count, seconds } from "./shared";

export const monitoringKind = defineNodeKind({
  kind: "monitoring",
  track: "devops",
  label: "Monitoring",
  icon: "monitoring",
  stateful: true,
  replicable: false,
  carriesTraffic: false,
  distribution: "by-share",
  docs: {
    summary:
      "Scrapes metrics from what it points at and evaluates the alerts on them, like Prometheus.",
    useWhen:
      "Anything has to be alerted on: an alert only sees what a monitoring system scrapes.",
    pitfalls: [
      "An alert on a node nothing scrapes can never fire, however bad that node gets.",
      "A long scrape interval adds itself to every alert's delay, on top of how long the alert waits.",
    ],
  },
  props: z.strictObject({
    scrapeIntervalSeconds: seconds(15, {
      title: "Scrape interval",
      description: "How often it collects the metrics of what it scrapes",
    }),
    retentionDays: count(15, {
      title: "Retention",
      description: "Days of metrics it keeps",
      advanced: true,
    }),
  }),
});
