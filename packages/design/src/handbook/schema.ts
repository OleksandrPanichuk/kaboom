import type { NodeKind } from "../catalogue";

export interface HandbookArticle {
  slug: string;
  title: string;
  summary: string;
  body: string;
  kinds: readonly NodeKind[];
  problems: readonly string[];
}
