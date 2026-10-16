import { t } from "elysia";

import { MAX_STARS } from "../problem-ratings.constants";

export const RateProblemInput = t.Object({
  stars: t.Integer({ minimum: 1, maximum: MAX_STARS }),
});
export type RateProblemInput = typeof RateProblemInput.static;
