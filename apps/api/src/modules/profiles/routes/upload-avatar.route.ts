import { defineRoute } from "@/core/route";

import { UploadAvatarInput } from "../dto";
import { ProfileEntity } from "../profile.entity";
import { MyProfileModel } from "../profile.model";
import { UPLOAD_AVATAR_RATE_LIMIT } from "../profiles.constants";
import type { ProfilesActions } from "../profiles.routes";

export const uploadAvatarRoute = ({ uploadAvatar }: ProfilesActions) =>
  defineRoute({
    body: UploadAvatarInput,
    response: MyProfileModel,
    summary: "Upload the caller's avatar",
    description:
      "A PNG, JPEG or WebP image of at most 1 MB, sent as multipart form data in the field file. The type is read from the file's bytes, not its name. Answers 422 AVATAR_INVALID otherwise.",
    auth: true,
    rateLimit: UPLOAD_AVATAR_RATE_LIMIT,

    action: ({ body, user }) =>
      uploadAvatar.execute({ userId: user.id, file: body.file }),
    postAction: ({ output }) => ProfileEntity.normalizeMine(output),
  });
