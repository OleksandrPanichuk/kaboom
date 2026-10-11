import { make, makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { FileStorage } from "@/platform/storage";

import { ProfilesRepository } from "../ports";
import type { ProfileEntity } from "../profile.entity";
import { ProfilesService } from "../profiles.service";

export interface RemoveAvatarUseCaseOptions {
  userId: string;
}

type Options = RemoveAvatarUseCaseOptions;
type Result = ProfileEntity;

export class RemoveAvatarUseCase extends UseCase<Options, Result> {
  private readonly profiles = makeService(ProfilesService);

  private readonly repo = makeRepository(ProfilesRepository);

  private readonly storage = make(FileStorage);

  public async execute({ userId }: Options): Promise<Result> {
    const previous = await this.profiles.mine(userId);

    if (!previous.avatarKey) return previous;

    const saved = (await this.repo.update(userId, { avatarKey: null }))!;

    try {
      await this.storage.delete(previous.avatarKey);
    } catch (error) {
      this.captureException(error, { extra: { key: previous.avatarKey } });
    }

    return saved;
  }
}
