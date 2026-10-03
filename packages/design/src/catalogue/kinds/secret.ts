import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { choice } from "./shared";

export const secretKind = defineNodeKind({
  kind: "secret",
  track: "devops",
  label: "Secret",
  icon: "secret",
  stateful: false,
  replicable: false,
  carriesTraffic: false,
  distribution: "by-share",
  docs: {
    summary:
      "Credentials and keys mounted into pods, kept apart from the image and the rest of the config.",
    useWhen: "A pod needs a password, a token or a certificate to do its work.",
    pitfalls: [
      "A Kubernetes secret is only encoded, not encrypted, unless encryption at rest is turned on.",
      "Whoever can read secrets in a namespace can read all of them, so grant it narrowly.",
    ],
  },
  props: z.strictObject({
    source: choice(["kubernetes", "external-store"], "kubernetes", {
      title: "Source",
      description:
        "Kept in the cluster, or synced from a vault or a cloud secret manager",
    }),
  }),
});
