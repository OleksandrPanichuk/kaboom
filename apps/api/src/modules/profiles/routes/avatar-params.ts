import { t } from "elysia";

import { AVATAR_FILE_PATTERN } from "../profiles.constants";

export const AvatarParams = t.Object({
  file: t.String({ pattern: AVATAR_FILE_PATTERN }),
});
export type AvatarParams = typeof AvatarParams.static;
