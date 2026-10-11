import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import type { ProfileEntity } from "../profile.entity";
import { ProfilesService } from "../profiles.service";

export interface GetMyProfileUseCaseOptions {
  userId: string;
}

type Options = GetMyProfileUseCaseOptions;
type Result = ProfileEntity;

export class GetMyProfileUseCase extends UseCase<Options, Result> {
  private readonly profiles = makeService(ProfilesService);

  public execute({ userId }: Options): Promise<Result> {
    return this.profiles.mine(userId);
  }
}
