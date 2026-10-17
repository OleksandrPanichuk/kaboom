import { MINUTE } from "@/constants";

export const SHARE_TOKEN_BYTES = 16;

export const SHARE_IMAGE_WIDTH = 1200;

export const SHARE_IMAGE_HEIGHT = 630;

export const SHARE_IMAGE_CACHE_CONTROL = "public, max-age=300";

export const SHARE_PAGE_CACHE_CONTROL = "public, max-age=60";

export const CREATE_SHARE_RATE_LIMIT = {
  limit: 30,
  windowMs: 10 * MINUTE,
  scope: "shares:create",
} as const;

export const VIEW_SHARE_RATE_LIMIT = {
  limit: 120,
  windowMs: MINUTE,
  scope: "shares:view",
} as const;
