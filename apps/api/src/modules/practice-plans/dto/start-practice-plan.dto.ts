import { TRACKS } from "@repo/design";
import { t } from "elysia";

export const StartPracticePlanInput = t.Object({
  track: t.Union(TRACKS.map((track) => t.Literal(track))),
});
export type StartPracticePlanInput = typeof StartPracticePlanInput.static;
