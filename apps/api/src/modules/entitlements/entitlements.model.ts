import { t } from "elysia";

export const EntitlementsModel = t.Object({
  plan: t.UnionEnum(["free", "pro"]),
  source: t.Nullable(t.UnionEnum(["subscription", "lifetime"])),
  interviews: t.Object({
    limit: t.Integer(),
    per: t.UnionEnum(["day", "week"]),
  }),
  fullReview: t.Boolean({
    description: "Whether reviews carry each item's rationale and citations",
  }),
  replay: t.Boolean({
    description: "Whether an ended interview can be played back",
  }),
});
export type EntitlementsModel = typeof EntitlementsModel.static;
