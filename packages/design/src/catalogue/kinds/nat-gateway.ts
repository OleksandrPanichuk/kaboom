import z from "zod";

import { defineNodeKind } from "../define-node-kind";

export const natGatewayKind = defineNodeKind({
  kind: "nat-gateway",
  track: "devops",
  label: "NAT gateway",
  icon: "nat-gateway",
  stateful: false,
  replicable: false,
  carriesTraffic: false,
  distribution: "by-share",
  docs: {
    summary:
      "Lets nodes in private subnets call out to the internet without the internet being able to call in.",
    useWhen:
      "Something in a private subnet calls a third party, fetches updates or reaches a cloud API.",
    pitfalls: [
      "It works only from a public subnet; one placed in a private subnet has no way out itself.",
      "It is one way: it never lets the internet reach what sits behind it.",
    ],
  },
  props: z.strictObject({}),
});
