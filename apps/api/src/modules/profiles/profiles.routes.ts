import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import {
  getAvatarRoute,
  getMyProfileRoute,
  getProfileRoute,
  removeAvatarRoute,
  updateMyProfileRoute,
  uploadAvatarRoute,
} from "./routes";
import type {
  GetAvatarUseCase,
  GetMyProfileUseCase,
  GetProfileUseCase,
  RemoveAvatarUseCase,
  UpdateMyProfileUseCase,
  UploadAvatarUseCase,
} from "./use-cases";

export interface ProfilesActions {
  getMyProfile: Executable<GetMyProfileUseCase>;
  updateMyProfile: Executable<UpdateMyProfileUseCase>;
  uploadAvatar: Executable<UploadAvatarUseCase>;
  removeAvatar: Executable<RemoveAvatarUseCase>;
  getProfile: Executable<GetProfileUseCase>;
  getAvatar: Executable<GetAvatarUseCase>;
}

export const profilesRoutes = (actions: ProfilesActions) =>
  new Elysia({ name: "profiles", prefix: "/profiles" })
    .get("/me", ...getMyProfileRoute(actions))
    .patch("/me", ...updateMyProfileRoute(actions))
    .put("/me/avatar", ...uploadAvatarRoute(actions))
    .delete("/me/avatar", ...removeAvatarRoute(actions))
    .get("/avatars/:file", ...getAvatarRoute(actions))
    .get("/:handle", ...getProfileRoute(actions));
