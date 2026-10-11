import { MINUTE } from "@/constants";

export const HANDLE_PATTERN = "^[a-z0-9](?:[a-z0-9_-]{1,18}[a-z0-9])$";

export const DISPLAY_NAME_MAX_LENGTH = 50;

export const BIO_MAX_LENGTH = 280;

export const MAX_LINKS = 3;

export const LINK_MAX_LENGTH = 200;

export const LINK_PATTERN = "^https?://[^\\s]+$";

export const AVATAR_MAX_BYTES = 1024 * 1024;

export const AVATAR_PREFIX = "avatars/";

export const AVATAR_FILE_PATTERN =
  "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(?:png|jpg|webp)$";

export const AVATAR_CACHE_CONTROL = "public, max-age=31536000, immutable";

export const RECENT_SUBMISSIONS = 10;

export const UPDATE_PROFILE_RATE_LIMIT = {
  limit: 20,
  windowMs: 10 * MINUTE,
  scope: "profiles:update",
} as const;

export const UPLOAD_AVATAR_RATE_LIMIT = {
  limit: 10,
  windowMs: 10 * MINUTE,
  scope: "profiles:avatar",
} as const;
