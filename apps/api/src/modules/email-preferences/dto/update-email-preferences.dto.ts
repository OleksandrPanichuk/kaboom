import { t } from "elysia";

export const UpdateEmailPreferencesInput = t.Object(
  {
    comments: t.Optional(t.Boolean()),
    reminders: t.Optional(t.Boolean()),
  },
  { minProperties: 1 },
);
export type UpdateEmailPreferencesInput =
  typeof UpdateEmailPreferencesInput.static;
