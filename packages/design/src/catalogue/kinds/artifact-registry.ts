import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { toggle } from "./shared";

export const artifactRegistryKind = defineNodeKind({
  kind: "artifact-registry",
  track: "devops",
  label: "Artifact registry",
  icon: "artifact-registry",
  stateful: true,
  replicable: false,
  carriesTraffic: false,
  distribution: "by-share",
  docs: {
    summary:
      "Where a pipeline keeps the images it builds, so a deploy ships exactly what was tested.",
    useWhen:
      "A build is used again later: by a deploy, by another environment, or by a rollback.",
    pitfalls: [
      "A tag that can be overwritten means two deploys of one tag may run different code.",
      "A deploy that builds again instead of pulling ships something no test has seen.",
    ],
  },
  props: z.strictObject({
    immutableTags: toggle(false, {
      title: "Immutable tags",
      description: "A tag, once pushed, always names the same image",
    }),
  }),
});
