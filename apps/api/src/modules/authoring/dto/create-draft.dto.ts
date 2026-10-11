import { t } from "elysia";

export const CreateDraftInput = t.Object({
  forkOf: t.Optional(
    t.String({
      maxLength: 64,
      description: "The slug of a published problem to start from",
    }),
  ),
});
export type CreateDraftInput = typeof CreateDraftInput.static;
