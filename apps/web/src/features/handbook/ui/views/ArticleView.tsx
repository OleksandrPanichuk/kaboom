import { catalogue, type HandbookArticle } from "@repo/design";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { ArrowLeft } from "lucide-react";

import { Markdown } from "@/components/Markdown";
import { buttonVariants } from "@/components/ui/Button";
import { FALLBACK_NODE_ICON, NODE_KIND_ICONS } from "@/features/canvas";
import { HandbookPage } from "@/features/handbook/ui/components";
import { problemsQuery } from "@/features/problems";

interface ArticleViewProps {
  article: HandbookArticle;
}

export function ArticleView({ article }: ArticleViewProps) {
  const { data: problems } = useQuery(problemsQuery(null));
  const titleOf = (slug: string) =>
    problems?.items.find((problem) => problem.slug === slug)?.title ?? slug;

  return (
    <HandbookPage
      title={article.title}
      description={article.summary}
      back={
        <Link
          to="/handbook"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2 self-start text-muted-foreground",
          )}
        >
          <ArrowLeft aria-hidden="true" />
          Handbook
        </Link>
      }
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <article className="min-w-0 rounded-2xl border border-black/[0.07] bg-white p-4 shadow-[0_12px_36px_-28px_rgba(24,24,27,0.45)] sm:p-6 [&_h2]:mt-2">
          <Markdown>{article.body}</Markdown>
        </article>
        <aside className="flex flex-col gap-6">
          <section
            aria-labelledby="article-nodes"
            className="flex flex-col gap-2"
          >
            <h2
              id="article-nodes"
              className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
            >
              Nodes
            </h2>
            <ul className="flex flex-col gap-1">
              {article.kinds.map((kind) => {
                const definition = catalogue[kind];
                const Icon =
                  NODE_KIND_ICONS[definition.icon] ?? FALLBACK_NODE_ICON;

                return (
                  <li key={kind}>
                    <Link
                      to="/handbook"
                      hash={kind}
                      className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-sm hover:bg-zinc-100"
                    >
                      <Icon
                        aria-hidden="true"
                        className="size-4 shrink-0 text-indigo-700"
                      />
                      {definition.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
          {article.problems.length > 0 ? (
            <section
              aria-labelledby="article-problems"
              className="flex flex-col gap-2"
            >
              <h2
                id="article-problems"
                className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
              >
                Practise it
              </h2>
              <ul className="flex flex-col gap-1">
                {article.problems.map((slug) => (
                  <li key={slug}>
                    <Link
                      to="/problems/$slug"
                      params={{ slug }}
                      className="block rounded-lg px-1.5 py-1 text-sm font-medium text-indigo-700 hover:bg-zinc-100"
                    >
                      {titleOf(slug)}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </HandbookPage>
  );
}
