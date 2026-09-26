import { type Static, t, type TSchema } from "elysia";

import { AppError } from "./errors";
import { HttpStatus } from "./http";

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

const CURSOR_MAX_LENGTH = 512;

export const PageQueryFields = {
  cursor: t.Optional(t.String({ minLength: 1, maxLength: CURSOR_MAX_LENGTH })),
  limit: t.Optional(t.Integer({ minimum: 1, maximum: MAX_PAGE_LIMIT })),
};

export const PageQuery = t.Object(PageQueryFields);

export type PageQuery = Static<typeof PageQuery>;

export const PageModel = <Item extends TSchema>(item: Item) =>
  t.Object({
    items: t.Array(item),
    nextCursor: t.Union([t.String(), t.Null()]),
  });

export interface PageRequest {
  cursor: string | null;
  limit: number;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export const toPageRequest = ({ cursor, limit }: PageQuery): PageRequest => ({
  cursor: cursor ?? null,
  limit: limit ?? DEFAULT_PAGE_LIMIT,
});

export const mapPage = <From, To>(
  page: Page<From>,
  map: (item: From) => To,
): Page<To> => ({
  items: page.items.map(map),
  nextCursor: page.nextCursor,
});

export class InvalidCursorError extends AppError {
  public readonly status = HttpStatus.BadRequest;
  public readonly code = "INVALID_CURSOR";

  constructor() {
    super("The page cursor is malformed");
  }
}
