import { t } from "elysia";

export const StartInterviewInput = t.Object({
  slug: t.String({ minLength: 3, maxLength: 64 }),
});
export type StartInterviewInput = typeof StartInterviewInput.static;
