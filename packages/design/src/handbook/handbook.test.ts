import { describe, expect, test } from "bun:test";

import { NODE_KINDS } from "../catalogue";
import { HANDBOOK_ARTICLES } from "./articles";

describe("handbook", () => {
  test("gives every article its own slug", () => {
    const slugs = HANDBOOK_ARTICLES.map((article) => article.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z]+(?:-[a-z]+)*$/);
  });

  test.each(HANDBOOK_ARTICLES.map((article) => [article.slug, article]))(
    "%s names kinds that exist",
    (_, article) => {
      for (const kind of article.kinds) expect(NODE_KINDS).toContain(kind);
      expect(article.summary.length).toBeLessThanOrEqual(120);
    },
  );
});
