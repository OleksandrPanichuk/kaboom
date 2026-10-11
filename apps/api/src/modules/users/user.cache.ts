import z from "zod";

import { MINUTE } from "@/constants";
import { USER_ROLES } from "@/db";

export const USER_CACHE_TTL_MS = 15 * MINUTE;

export const userCacheKey = (id: string): string => `users:${id}`;

export const CachedUserSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string(),
  role: z.enum(USER_ROLES).default("user"),
  emailVerifiedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
});
