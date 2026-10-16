import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import type { EmailPreferencesEntity } from "../email-preference.entity";
import { EmailPreferencesService } from "../email-preferences.service";

export interface GetMyEmailPreferencesUseCaseOptions {
  userId: string;
}

type Options = GetMyEmailPreferencesUseCaseOptions;
type Result = EmailPreferencesEntity;

export class GetMyEmailPreferencesUseCase extends UseCase<Options, Result> {
  private readonly service = makeService(EmailPreferencesService);

  public execute({ userId }: Options): Promise<Result> {
    return this.service.of(userId);
  }
}
