import { t } from "elysia";

import { DesignLayoutModel } from "../design.model";

export const SaveDesignLayoutInput = t.Object({
  layout: DesignLayoutModel,
});
export type SaveDesignLayoutInput = typeof SaveDesignLayoutInput.static;
