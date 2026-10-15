import { t } from "elysia";

export const CardParams = t.Object({
  cardId: t.String({ minLength: 1, maxLength: 255 }),
});
