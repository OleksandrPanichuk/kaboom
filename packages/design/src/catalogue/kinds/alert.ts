import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { choice, seconds } from "./shared";

export const alertKind = defineNodeKind({
  kind: "alert",
  track: "devops",
  label: "Alert",
  icon: "alert",
  stateful: false,
  replicable: false,
  carriesTraffic: false,
  distribution: "by-share",
  docs: {
    summary:
      "Pages someone when a signal from what it watches stays past its threshold.",
    useWhen:
      "A failure has to reach a person before users report it, or when nothing fails loudly on its own.",
    pitfalls: [
      "An alert on a cause rather than on what users feel pages people for problems nobody notices.",
      "A stuck rollout fails quietly: the old pods keep serving, so only an alert on its progress catches it.",
    ],
  },
  props: z.strictObject({
    signal: choice(
      ["error-rate", "latency", "saturation", "rollout-progress"],
      "error-rate",
      {
        title: "Signal",
        description: "What it watches on the nodes it points at",
      },
    ),
    forSeconds: seconds(300, {
      title: "For",
      description: "How long the signal must stay bad before it pages",
    }),
  }),
});
