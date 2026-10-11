import { randomUUID } from "node:crypto";

import { make, makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { FileStorage } from "@/platform/storage";

import { ProfilesRepository } from "../ports";
import {
  AVATAR_CONTENT_TYPES,
  avatarKey,
  sniffAvatar,
} from "../profile.avatar";
import type { ProfileEntity } from "../profile.entity";
import { AVATAR_MAX_BYTES } from "../profiles.constants";
import { AvatarInvalidError } from "../profiles.errors";
import { ProfilesService } from "../profiles.service";

export interface UploadAvatarUseCaseOptions {
  userId: string;
  file: Blob;
}

type Options = UploadAvatarUseCaseOptions;
type Result = ProfileEntity;

export class UploadAvatarUseCase extends UseCase<Options, Result> {
  private readonly profiles = makeService(ProfilesService);

  private readonly repo = makeRepository(ProfilesRepository);

  private readonly storage = make(FileStorage);

  public async execute({ userId, file }: Options): Promise<Result> {
    if (file.size > AVATAR_MAX_BYTES) {
      throw new AvatarInvalidError("An avatar may be at most 1 MB");
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = sniffAvatar(bytes);

    if (!type) {
      throw new AvatarInvalidError(
        "An avatar must be a PNG, JPEG or WebP image",
      );
    }

    const previous = await this.profiles.mine(userId);
    const key = avatarKey(`${randomUUID()}.${type}`);

    await this.storage.put(key, bytes, {
      contentType: AVATAR_CONTENT_TYPES[type],
    });

    const saved = (await this.repo.update(userId, { avatarKey: key }))!;

    if (previous.avatarKey) await this.forget(previous.avatarKey);

    return saved;
  }

  private async forget(key: string): Promise<void> {
    try {
      await this.storage.delete(key);
    } catch (error) {
      this.captureException(error, { extra: { key } });
    }
  }
}
