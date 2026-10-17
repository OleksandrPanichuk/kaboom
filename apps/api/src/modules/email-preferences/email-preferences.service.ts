import { makeRepository } from "@/core/registry";
import { Service } from "@/core/service";

import {
  DEFAULT_EMAIL_PREFERENCES,
  type EmailPreferencesEntity,
} from "./email-preference.entity";
import { EmailPreferencesRepository } from "./email-preferences.repository";

export class EmailPreferencesService extends Service {
  private readonly preferences = makeRepository(EmailPreferencesRepository);

  public async of(userId: string): Promise<EmailPreferencesEntity> {
    return (await this.preferences.find(userId)) ?? DEFAULT_EMAIL_PREFERENCES;
  }

  public async wants(
    userId: string,
    kind: keyof EmailPreferencesEntity,
  ): Promise<boolean> {
    return (await this.of(userId))[kind];
  }
}
