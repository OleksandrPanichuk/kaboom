import { t } from "elysia";

export const SubmitSolutionInput = t.Object({
  revision: t.Optional(t.Integer({ minimum: 0 })),
});
