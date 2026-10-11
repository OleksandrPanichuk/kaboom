import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import { ProfilesRepository } from "../ports";
import type { ProfileEntity } from "../profile.entity";
import { HandleTakenError } from "../profiles.errors";
import { ProfilesService } from "../profiles.service";

export interface UpdateMyProfileUseCaseOptions {
  userId: string;
  handle?: string;
  displayName?: string;
  bio?: string;
  links?: string[];
  visible?: boolean;
}

type Options = UpdateMyProfileUseCaseOptions;
type Result = ProfileEntity;

export class UpdateMyProfileUseCase extends UseCase<Options, Result> {
  private readonly profiles = makeService(ProfilesService);

  private readonly repo = makeRepository(ProfilesRepository);

  public async execute({
    userId,
    handle,
    displayName,
    bio,
    links,
    visible,
  }: Options): Promise<Result> {
    await this.profiles.mine(userId);

    const saved = await this.repo.update(userId, {
      ...(handle !== undefined ? { handle: handle.toLowerCase() } : {}),
      ...(displayName !== undefined ? { displayName: displayName.trim() } : {}),
      ...(bio !== undefined ? { bio: bio.trim() } : {}),
      ...(links !== undefined ? { links } : {}),
      ...(visible !== undefined ? { visible } : {}),
    });

    if (!saved) throw new HandleTakenError("That handle is taken");

    return saved;
  }
}
