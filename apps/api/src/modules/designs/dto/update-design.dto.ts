import { t } from "elysia";

import { MAX_NAME_LENGTH } from "@/constants";

export const UpdateDesignInput = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: MAX_NAME_LENGTH })),
});
export type UpdateDesignInput = typeof UpdateDesignInput.static;
