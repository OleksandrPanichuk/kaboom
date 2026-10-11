import { t } from "elysia";

export const RejectReviewInput = t.Object({
  feedback: t.String({
    minLength: 10,
    maxLength: 2_000,
    pattern: "\\S",
    description: "What the author should change; they read it on the draft",
  }),
});
export type RejectReviewInput = typeof RejectReviewInput.static;
