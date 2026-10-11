import { defineRoute } from "@/core/route";

import { ProfileEntity } from "../profile.entity";
import { MyProfileModel } from "../profile.model";
import type { ProfilesActions } from "../profiles.routes";

export const removeAvatarRoute = ({ removeAvatar }: ProfilesActions) =>
  defineRoute({
    response: MyProfileModel,
    summary: "Remove the caller's avatar",
    auth: true,

    action: ({ user }) => removeAvatar.execute({ userId: user.id }),
    postAction: ({ output }) => ProfileEntity.normalizeMine(output),
  });
