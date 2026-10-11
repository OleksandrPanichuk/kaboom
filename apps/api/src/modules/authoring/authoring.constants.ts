import { MINUTE } from "@/constants";

export const MAX_DRAFTS = 20;

export const MAX_DRAFT_BYTES = 512 * 1024;

export const REVIEWS_PAGE_DEFAULT_STATUS = "pending";

export const CREATE_DRAFT_RATE_LIMIT = {
  limit: 10,
  windowMs: 10 * MINUTE,
  scope: "authoring:create",
} as const;

export const SAVE_DRAFT_RATE_LIMIT = {
  limit: 120,
  windowMs: MINUTE,
  scope: "authoring:save",
} as const;

export const CHECK_DRAFT_RATE_LIMIT = {
  limit: 20,
  windowMs: MINUTE,
  scope: "authoring:check",
} as const;

export const SUBMIT_DRAFT_RATE_LIMIT = {
  limit: 10,
  windowMs: 10 * MINUTE,
  scope: "authoring:submit",
} as const;
