import { Repository } from "@/core/repository";

import type { EmailPreferencesEntity } from "./email-preference.entity";

export abstract class EmailPreferencesRepository extends Repository {
  public abstract find(userId: string): Promise<EmailPreferencesEntity | null>;

  public abstract save(
    userId: string,
    patch: Partial<EmailPreferencesEntity>,
  ): Promise<EmailPreferencesEntity>;
}
