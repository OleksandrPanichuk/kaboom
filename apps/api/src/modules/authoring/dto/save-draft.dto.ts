import { t } from "elysia";

export const SaveDraftInput = t.Object({
  content: t.Unknown({
    description: "The whole problem as it stands; it need not be valid yet",
  }),
});
export type SaveDraftInput = typeof SaveDraftInput.static;
