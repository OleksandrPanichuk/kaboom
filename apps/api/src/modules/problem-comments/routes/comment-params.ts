import { t } from "elysia";

import { ProblemParams } from "@/modules/problems";

export const CommentParams = t.Object({
  ...ProblemParams.properties,
  id: t.String({ format: "uuid" }),
});
