import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { prop } from "../prop-meta";
import { choice, count, minutes, pods, toggle } from "./shared";

export const pipelineStageKind = defineNodeKind({
  kind: "pipeline-stage",
  track: "devops",
  label: "Pipeline stage",
  icon: "pipeline-stage",
  stateful: false,
  replicable: false,
  carriesTraffic: false,
  distribution: "by-share",
  docs: {
    summary:
      "One step of a CI/CD pipeline: build, test, scan, deploy, or wait for someone to approve.",
    useWhen:
      "A change has to be built, checked and shipped the same way every time.",
    pitfalls: [
      "Stages in a line add up; stages that do not depend on each other can run side by side.",
      "Retrying a flaky stage turns it green without fixing it, and every retry costs another run.",
      "A deploy that no test stage comes before ships whatever was merged.",
    ],
  },
  props: z.strictObject({
    stage: choice(["build", "test", "scan", "deploy", "approve"], "build", {
      title: "Stage",
      description: "What it does with the change",
    }),
    durationMinutes: minutes(10, {
      title: "Duration",
      description:
        "How long it takes on one runner for the whole repository, or how long an approval waits",
    }),
    parallelism: count(1, {
      title: "Parallel runners",
      description: "Runners that split the work between them",
    }),
    affectedOnly: toggle(false, {
      title: "Affected only",
      description: "Works only on the packages a change touches",
    }),
    flakiness: prop(z.number().min(0).max(1).default(0), {
      title: "Flakiness",
      description: "Chance that one run fails for no reason in the change",
      unit: "ratio",
    }),
    retries: pods(0, {
      title: "Retries",
      description: "Times a failed run is tried again before the stage fails",
      advanced: true,
    }),
  }),
});
