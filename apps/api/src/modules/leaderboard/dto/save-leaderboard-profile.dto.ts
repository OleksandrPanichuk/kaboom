import { t } from "elysia";

import { HANDLE_PATTERN } from "../leaderboard.constants";

export const SaveLeaderboardProfileInput = t.Object({
  handle: t.String({
    pattern: HANDLE_PATTERN,
    description:
      "3 to 20 lowercase letters, digits, hyphens or underscores, starting and ending with a letter or digit",
  }),
  visible: t.Boolean(),
});
export type SaveLeaderboardProfileInput =
  typeof SaveLeaderboardProfileInput.static;
