export const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{1,18}[a-z0-9])$/;

export const LINK_PATTERN = /^https?:\/\/\S+$/;

export const DISPLAY_NAME_MAX_LENGTH = 50;

export const BIO_MAX_LENGTH = 280;

export const MAX_LINKS = 3;

export const AVATAR_MAX_BYTES = 1024 * 1024;

export const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
