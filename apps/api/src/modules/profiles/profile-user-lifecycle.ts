import { captureException } from "@/core/error-reporting";
import { make, makeRepository, makeService } from "@/core/registry";
import { type UserEntity, UserLifecycle } from "@/modules/users";
import { FileStorage } from "@/platform/storage";

import { ProfilesRepository } from "./ports";
import { ProfilesService } from "./profiles.service";

export class ProfileUserLifecycle extends UserLifecycle {
  public async created(user: UserEntity): Promise<void> {
    await makeService(ProfilesService).provision(user);
  }

  public async deleting(user: UserEntity): Promise<void> {
    const profile = await makeRepository(ProfilesRepository).findByUserId(
      user.id,
    );

    if (!profile?.avatarKey) return;

    try {
      await make(FileStorage).delete(profile.avatarKey);
    } catch (error) {
      captureException(error, {
        source: "ProfileUserLifecycle",
        extra: { key: profile.avatarKey },
      });
    }
  }
}
