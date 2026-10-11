import { t } from "elysia";

import {
  BIO_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  HANDLE_PATTERN,
  LINK_MAX_LENGTH,
  LINK_PATTERN,
  MAX_LINKS,
} from "../profiles.constants";

export const UpdateMyProfileInput = t.Object({
  handle: t.Optional(
    t.String({
      pattern: HANDLE_PATTERN,
      description:
        "3 to 20 lowercase letters, digits, hyphens or underscores, starting and ending with a letter or digit",
    }),
  ),
  displayName: t.Optional(
    t.String({
      minLength: 1,
      maxLength: DISPLAY_NAME_MAX_LENGTH,
      pattern: "\\S",
    }),
  ),
  bio: t.Optional(t.String({ maxLength: BIO_MAX_LENGTH })),
  links: t.Optional(
    t.Array(t.String({ pattern: LINK_PATTERN, maxLength: LINK_MAX_LENGTH }), {
      maxItems: MAX_LINKS,
    }),
  ),
  visible: t.Optional(
    t.Boolean({
      description:
        "Whether others can open the profile and see it on the leaderboard",
    }),
  ),
});
export type UpdateMyProfileInput = typeof UpdateMyProfileInput.static;
