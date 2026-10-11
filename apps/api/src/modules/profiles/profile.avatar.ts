import { AVATAR_PREFIX } from "./profiles.constants";

export type AvatarType = "png" | "jpg" | "webp";

export const AVATAR_CONTENT_TYPES: Readonly<Record<AvatarType, string>> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
};

const startsWith = (bytes: Uint8Array, signature: readonly number[], at = 0) =>
  signature.every((byte, index) => bytes[at + index] === byte);

export const sniffAvatar = (bytes: Uint8Array): AvatarType | null => {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "png";
  }

  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpg";

  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return "webp";
  }

  return null;
};

export const avatarKey = (file: string): string => `${AVATAR_PREFIX}${file}`;

export const avatarUrl = (key: string | null): string | null =>
  key === null
    ? null
    : `/api/profiles/avatars/${key.slice(AVATAR_PREFIX.length)}`;
