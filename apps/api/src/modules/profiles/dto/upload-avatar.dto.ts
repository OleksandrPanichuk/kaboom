import { t } from "elysia";

import { AVATAR_MAX_BYTES } from "../profiles.constants";

export const UploadAvatarInput = t.Object({
  file: t.File({ maxSize: AVATAR_MAX_BYTES }),
});
export type UploadAvatarInput = typeof UploadAvatarInput.static;
