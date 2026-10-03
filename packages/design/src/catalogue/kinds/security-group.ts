import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { toggle } from "./shared";

export const securityGroupKind = defineNodeKind({
  kind: "security-group",
  track: "devops",
  label: "Security group",
  icon: "security-group",
  stateful: false,
  replicable: false,
  carriesTraffic: false,
  distribution: "by-share",
  docs: {
    summary:
      "A firewall around the nodes it protects: it names who may open a connection to them.",
    useWhen:
      "A node should accept connections only from the callers that need it.",
    pitfalls: [
      "Admitting the whole VPC lets anything that is broken into reach the database too.",
      "A node no security group protects accepts any connection that can route to it.",
    ],
  },
  props: z.strictObject({
    fromInternet: toggle(false, {
      title: "From the internet",
      description: "Accepts connections from outside the VPC",
    }),
    fromVpc: toggle(false, {
      title: "From the whole VPC",
      description: "Accepts connections from anything inside the VPC",
    }),
  }),
});
