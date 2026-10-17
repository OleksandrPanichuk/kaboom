import { t } from "elysia";

export const EmailPreferencesModel = t.Object({
  comments: t.Boolean({
    description:
      "Emails about new comments on problems you wrote and replies to your comments",
  }),
  reminders: t.Boolean({
    description:
      "A reminder in the middle of the week about your practice plan",
  }),
});
export type EmailPreferencesModel = typeof EmailPreferencesModel.static;
