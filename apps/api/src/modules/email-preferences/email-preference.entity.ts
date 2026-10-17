import type { EmailPreferencesModel } from "./email-preferences.model";

export interface EmailPreferencesEntity {
  comments: boolean;
  reminders: boolean;
}

export const DEFAULT_EMAIL_PREFERENCES: EmailPreferencesEntity = {
  comments: true,
  reminders: true,
};

export class EmailPreferencesEntity {
  public static normalize(
    entity: EmailPreferencesEntity,
  ): EmailPreferencesModel {
    return { comments: entity.comments, reminders: entity.reminders };
  }
}
