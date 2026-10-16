import { t } from "elysia";

export const EmailPreferencesModel = t.Object({
  comments: t.Boolean({
    description:
      "Emails about new comments on problems you wrote and replies to your comments",
  }),
});
export type EmailPreferencesModel = typeof EmailPreferencesModel.static;
