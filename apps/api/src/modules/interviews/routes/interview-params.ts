import { t } from "elysia";

export const InterviewParams = t.Object({
  id: t.String({ format: "uuid" }),
});
