import { HANDBOOK_ARTICLES } from "@repo/design";

import { PALETTE_GROUPS } from "@/features/canvas";
import {
  ArticleCard,
  HandbookPage,
  KindEntry,
} from "@/features/handbook/ui/components";

export function HandbookView() {
  return (
    <HandbookPage
      title="Handbook"
      description="What each building block does and when to reach for it, and the ideas the problems keep coming back to."
    >
      <section aria-labelledby="concepts" className="flex flex-col gap-3">
        <h2 id="concepts" className="text-lg font-semibold tracking-[-0.02em]">
          Concepts
        </h2>
        <ul className="grid gap-3 md:grid-cols-2">
          {HANDBOOK_ARTICLES.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </ul>
      </section>
      <section aria-labelledby="nodes" className="flex flex-col gap-6">
        <h2 id="nodes" className="text-lg font-semibold tracking-[-0.02em]">
          Nodes
        </h2>
        {PALETTE_GROUPS.map((group) => (
          <div key={group.label} className="flex flex-col gap-3">
            <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {group.label}
            </h3>
            <ul className="grid gap-3 md:grid-cols-2">
              {group.kinds.map((kind) => (
                <KindEntry key={kind} kind={kind} />
              ))}
            </ul>
          </div>
        ))}
      </section>
    </HandbookPage>
  );
}
