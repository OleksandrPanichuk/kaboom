import { t } from "elysia";

import { SHARE_SUBJECTS } from "@/db";

export const CreateShareInput = t.Object({
  subject: t.UnionEnum(SHARE_SUBJECTS),
  subjectId: t.String({ format: "uuid" }),
});
export type CreateShareInput = typeof CreateShareInput.static;
