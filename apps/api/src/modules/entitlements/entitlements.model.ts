import { t } from "elysia";

export const EntitlementsModel = t.Object({
  plan: t.UnionEnum(["free", "pro"]),
  source: t.Nullable(t.UnionEnum(["subscription", "lifetime"])),
  interviews: t.Object({
    limit: t.Integer(),
    per: t.UnionEnum(["day", "week"]),
  }),
  sandboxDesigns: t.Nullable(t.Integer(), {
    description:
      "How many designs of their own the plan keeps; null is no limit",
  }),
  fullReview: t.Boolean({
    description: "Whether reviews carry each item's rationale and citations",
  }),
  replay: t.Boolean({
    description: "Whether an ended interview can be played back",
  }),
  voice: t.Boolean({
    description: "Whether an interview can be spoken instead of typed",
  }),
  priorityTests: t.Boolean({
    description:
      "Whether the plan's design tests go ahead of the queue when the testers are busy",
  }),
});
export type EntitlementsModel = typeof EntitlementsModel.static;
