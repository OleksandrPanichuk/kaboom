import { defineModule } from "@/core/module";
import { bind, makeUseCase } from "@/core/registry";
import { registerUserLifecycleListener } from "@/modules/users";

import { ProfilesRepository } from "./ports";
import { ProfileUserLifecycle } from "./profile-user-lifecycle";
import { profilesRoutes } from "./profiles.routes";
import { PostgresProfilesRepository } from "./repositories";
import {
  GetAvatarUseCase,
  GetMyProfileUseCase,
  GetProfileUseCase,
  RemoveAvatarUseCase,
  UpdateMyProfileUseCase,
  UploadAvatarUseCase,
} from "./use-cases";

export const profilesModule = defineModule({
  name: "profiles",

  register: () => {
    bind(ProfilesRepository, () => new PostgresProfilesRepository());
    registerUserLifecycleListener(ProfileUserLifecycle);

    return {};
  },

  routes: () =>
    profilesRoutes({
      getMyProfile: makeUseCase(GetMyProfileUseCase),
      updateMyProfile: makeUseCase(UpdateMyProfileUseCase),
      uploadAvatar: makeUseCase(UploadAvatarUseCase),
      removeAvatar: makeUseCase(RemoveAvatarUseCase),
      getProfile: makeUseCase(GetProfileUseCase),
      getAvatar: makeUseCase(GetAvatarUseCase),
    }),
});
