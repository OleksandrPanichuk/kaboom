import { randomBytes } from "node:crypto";

const BASE_LENGTH = 11;

const slug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, BASE_LENGTH);

export const defaultHandle = (name: string, userId: string): string =>
  `${slug(name) || "user"}-${userId.replaceAll("-", "").slice(0, 8)}`;

export const randomHandle = (name: string): string =>
  `${slug(name) || "user"}-${randomBytes(4).toString("hex")}`;
