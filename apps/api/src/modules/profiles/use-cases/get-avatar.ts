import { make } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { FileStorage } from "@/platform/storage";

import { avatarKey } from "../profile.avatar";
import { AvatarNotFoundError } from "../profiles.errors";

export interface GetAvatarUseCaseOptions {
  file: string;
}

type Options = GetAvatarUseCaseOptions;
type Result = Blob;

export class GetAvatarUseCase extends UseCase<Options, Result> {
  private readonly storage = make(FileStorage);

  public async execute({ file }: Options): Promise<Result> {
    const blob = await this.storage.get(avatarKey(file));

    if (!blob) throw new AvatarNotFoundError("No such avatar");

    return blob;
  }
}
