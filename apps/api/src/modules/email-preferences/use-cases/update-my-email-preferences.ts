import { makeRepository } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import type { EmailPreferencesEntity } from "../email-preference.entity";
import { EmailPreferencesRepository } from "../email-preferences.repository";

export interface UpdateMyEmailPreferencesUseCaseOptions {
  userId: string;
  comments?: boolean;
  reminders?: boolean;
}

type Options = UpdateMyEmailPreferencesUseCaseOptions;
type Result = EmailPreferencesEntity;

export class UpdateMyEmailPreferencesUseCase extends UseCase<Options, Result> {
  private readonly preferences = makeRepository(EmailPreferencesRepository);

  public execute({ userId, ...patch }: Options): Promise<Result> {
    return this.preferences.save(
      userId,
      Object.fromEntries(
        Object.entries(patch).filter(([, value]) => value !== undefined),
      ),
    );
  }
}
