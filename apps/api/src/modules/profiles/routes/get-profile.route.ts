import { defineRoute } from "@/core/route";
import { rankFor } from "@/modules/submissions";

import { ProfileEntity } from "../profile.entity";
import { PublicProfileModel } from "../profile.model";
import type { ProfilesActions } from "../profiles.routes";
import { ProfileParams } from "./profile-params";

export const getProfileRoute = ({ getProfile }: ProfilesActions) =>
  defineRoute({
    params: ProfileParams,
    response: PublicProfileModel,
    summary: "Get someone's public profile by handle",
    description:
      "Their display name, bio, links and avatar, their all-time standing, skills and recent counted challenge submissions. Never the email or the account name. A hidden profile answers 404 PROFILE_NOT_FOUND to everyone but its owner.",
    auth: true,

    action: ({ params, user }) =>
      getProfile.execute({ handle: params.handle, viewerId: user.id }),
    postAction: ({ output }) =>
      ProfileEntity.normalizePublic(output, (points) => rankFor(points).name),
  });
