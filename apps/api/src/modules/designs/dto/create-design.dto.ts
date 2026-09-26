import { t } from "elysia";

import { MAX_NAME_LENGTH } from "@/constants";

export const CreateDesignInput = t.Object({
  name: t.String({ minLength: 1, maxLength: MAX_NAME_LENGTH }),
});
export type CreateDesignInput = typeof CreateDesignInput.static;
