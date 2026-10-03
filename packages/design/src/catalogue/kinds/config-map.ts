import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { toggle } from "./shared";

export const configMapKind = defineNodeKind({
  kind: "config-map",
  track: "devops",
  label: "Config map",
  icon: "config-map",
  stateful: false,
  replicable: false,
  carriesTraffic: false,
  distribution: "by-share",
  docs: {
    summary:
      "Settings kept outside the image and mounted into pods, so one image runs in every environment.",
    useWhen:
      "A value differs between environments or changes more often than the code.",
    pitfalls: [
      "Changing it does not restart anything; pods keep the old values until they are replaced or reload.",
      "Secrets do not belong here: a config map is stored and shown in plain text.",
    ],
  },
  props: z.strictObject({
    reloadOnChange: toggle(false, {
      title: "Reload on change",
      description: "Pods pick up a change without being restarted",
    }),
  }),
});
