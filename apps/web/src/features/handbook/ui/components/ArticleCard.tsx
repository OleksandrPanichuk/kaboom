import type { HandbookArticle } from "@repo/design";
import { Link } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";

interface ArticleCardProps {
  article: HandbookArticle;
}

export function ArticleCard({ article }: ArticleCardProps) {
  return (
    <li className="relative flex min-w-0 gap-3 rounded-2xl border border-border bg-card p-4 shadow-card transition-colors hover:border-interactive-border has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring/50">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-interactive-border/60 bg-interactive-surface text-interactive-foreground">
        <BookOpen aria-hidden="true" className="size-4" />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <Link
          to="/handbook/$slug"
          params={{ slug: article.slug }}
          className="font-semibold tracking-[-0.02em] outline-none after:absolute after:inset-0 after:rounded-2xl"
        >
          {article.title}
        </Link>
        <p className="text-sm leading-5 text-muted-foreground text-pretty">
          {article.summary}
        </p>
      </div>
    </li>
  );
}
