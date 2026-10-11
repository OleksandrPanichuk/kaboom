import { t } from "elysia";

import { MAX_NAME_LENGTH } from "@/constants";
import { DESIGN_KINDS } from "@/db";

export const CreateDesignInput = t.Object({
  name: t.String({ minLength: 1, maxLength: MAX_NAME_LENGTH }),
  kind: t.Optional(t.UnionEnum(DESIGN_KINDS)),
});
export type CreateDesignInput = typeof CreateDesignInput.static;
