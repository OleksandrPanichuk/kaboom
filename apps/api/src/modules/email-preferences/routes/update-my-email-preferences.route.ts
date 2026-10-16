import { defineRoute } from "@/core/route";

import { UpdateEmailPreferencesInput } from "../dto";
import { EmailPreferencesEntity } from "../email-preference.entity";
import { EmailPreferencesModel } from "../email-preferences.model";
import type { EmailPreferencesActions } from "../email-preferences.routes";

export const updateMyEmailPreferencesRoute = ({
  updateMyEmailPreferences,
}: EmailPreferencesActions) =>
  defineRoute({
    body: UpdateEmailPreferencesInput,
    response: EmailPreferencesModel,
    summary: "Turn optional emails on or off",
    auth: true,

    action: ({ body, user }) =>
      updateMyEmailPreferences.execute({
        userId: user.id,
        comments: body.comments,
      }),
    postAction: ({ output }) => EmailPreferencesEntity.normalize(output),
  });
