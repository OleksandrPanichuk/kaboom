import { defineRoute } from "@/core/route";

import { EmailPreferencesEntity } from "../email-preference.entity";
import { EmailPreferencesModel } from "../email-preferences.model";
import type { EmailPreferencesActions } from "../email-preferences.routes";

export const getMyEmailPreferencesRoute = ({
  getMyEmailPreferences,
}: EmailPreferencesActions) =>
  defineRoute({
    response: EmailPreferencesModel,
    summary: "Which optional emails the caller gets",
    description:
      "Emails about security, sign-in, billing and reviews always go out; these are the ones that may be turned off.",
    auth: true,

    action: ({ user }) => getMyEmailPreferences.execute({ userId: user.id }),
    postAction: ({ output }) => EmailPreferencesEntity.normalize(output),
  });
