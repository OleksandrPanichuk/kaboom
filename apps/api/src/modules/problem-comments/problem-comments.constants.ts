import { MINUTE } from "@/constants";

export const MAX_COMMENT_LENGTH = 4000;

export const MAX_REPLIES = 50;

export const POST_COMMENT_RATE_LIMIT = {
  limit: 20,
  windowMs: 10 * MINUTE,
  scope: "problem-comments:post",
} as const;

export const EDIT_COMMENT_RATE_LIMIT = {
  limit: 30,
  windowMs: MINUTE,
  scope: "problem-comments:edit",
} as const;
