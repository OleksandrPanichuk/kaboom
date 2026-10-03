import { t } from "elysia";

export const HintParams = t.Object({
  slug: t.String({ minLength: 1, maxLength: 64 }),
  index: t.Integer({ minimum: 0, maximum: 9 }),
});
