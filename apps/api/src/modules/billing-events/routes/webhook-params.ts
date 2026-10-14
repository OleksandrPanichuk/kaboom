import { t } from "elysia";

import { BILLING_PROVIDERS } from "@/db";

export const WebhookParams = t.Object({
  provider: t.UnionEnum(BILLING_PROVIDERS),
});
