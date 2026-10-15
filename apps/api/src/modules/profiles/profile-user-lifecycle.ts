import { captureException } from "@/core/error-reporting";
import { make, makeRepository, makeService } from "@/core/registry";
import type { UserEntity, UserLifecycleListener } from "@/modules/users";
import { FileStorage } from "@/platform/storage";

import { ProfilesRepository } from "./ports";
import { ProfilesService } from "./profiles.service";

export class ProfileUserLifecycle implements UserLifecycleListener {
  private readonly profilesService = makeService(ProfilesService);

  private readonly profiles = makeRepository(ProfilesRepository);

  private readonly storage = make(FileStorage);

  public async created(user: UserEntity): Promise<void> {
    await this.profilesService.provision(user);
  }

  public async deleting(user: UserEntity): Promise<void> {
    const profile = await this.profiles.findByUserId(user.id);

    if (!profile?.avatarKey) return;

    try {
      await this.storage.delete(profile.avatarKey);
    } catch (error) {
      captureException(error, {
        source: "ProfileUserLifecycle",
        extra: { key: profile.avatarKey },
      });
    }
  }
}
