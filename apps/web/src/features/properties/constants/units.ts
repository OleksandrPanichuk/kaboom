import type { PropUnit } from "@repo/design";

export const UNIT_SUFFIXES: Readonly<Record<PropUnit, string | null>> = {
  "req/s": "req/s",
  "msg/s": "msg/s",
  ms: "ms",
  s: "s",
  h: "h",
  GB: "GB",
  KB: "KB",
  ratio: "%",
  count: null,
};
