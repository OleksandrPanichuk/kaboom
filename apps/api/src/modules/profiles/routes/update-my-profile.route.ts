import { defineRoute } from "@/core/route";

import { UpdateMyProfileInput } from "../dto";
import { ProfileEntity } from "../profile.entity";
import { MyProfileModel } from "../profile.model";
import { UPDATE_PROFILE_RATE_LIMIT } from "../profiles.constants";
import type { ProfilesActions } from "../profiles.routes";

export const updateMyProfileRoute = ({ updateMyProfile }: ProfilesActions) =>
  defineRoute({
    body: UpdateMyProfileInput,
    response: MyProfileModel,
    summary:
      "Change the caller's handle, display name, bio, links or visibility",
    description:
      "A hidden profile cannot be opened by anyone else and is left off the leaderboard. Answers 409 HANDLE_TAKEN when someone else holds the handle.",
    auth: true,
    rateLimit: UPDATE_PROFILE_RATE_LIMIT,

    action: ({ body, user }) =>
      updateMyProfile.execute({ userId: user.id, ...body }),
    postAction: ({ output }) => ProfileEntity.normalizeMine(output),
  });
