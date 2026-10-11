import { defineRoute } from "@/core/route";

import { ProfileEntity } from "../profile.entity";
import { MyProfileModel } from "../profile.model";
import type { ProfilesActions } from "../profiles.routes";

export const getMyProfileRoute = ({ getMyProfile }: ProfilesActions) =>
  defineRoute({
    response: MyProfileModel,
    summary: "Get the caller's public profile",
    description:
      "Every account has one, created at sign-up with a handle from the name. The display name starts as the account name and is separate from it.",
    auth: true,

    action: ({ user }) => getMyProfile.execute({ userId: user.id }),
    postAction: ({ output }) => ProfileEntity.normalizeMine(output),
  });
