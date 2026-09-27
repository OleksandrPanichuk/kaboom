import { HANDBOOK_ARTICLES, type HandbookArticle } from "@repo/design";

export const findArticle = (slug: string): HandbookArticle | null =>
  HANDBOOK_ARTICLES.find((article) => article.slug === slug) ?? null;

export const articlesAbout = (kind: string): HandbookArticle[] =>
  HANDBOOK_ARTICLES.filter((article) =>
    (article.kinds as readonly string[]).includes(kind),
  );
