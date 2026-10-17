import { t } from "elysia";

import { SHARE_SUBJECTS } from "@/db";

export const ShareTokenParams = t.Object({
  token: t.String({
    minLength: 16,
    maxLength: 64,
    pattern: "^[A-Za-z0-9_-]+$",
  }),
});

export const MyShareQuery = t.Object({
  subject: t.UnionEnum(SHARE_SUBJECTS),
  subjectId: t.String({ format: "uuid" }),
});
