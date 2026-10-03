import {
  catalogue,
  HANDBOOK_ARTICLES,
  TRACK_LABELS,
  TRACKS,
} from "@repo/design";

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
        {TRACKS.map((track) => (
          <div key={track} className="flex flex-col gap-4">
            <h3 className="font-semibold">{TRACK_LABELS[track]}</h3>
            {PALETTE_GROUPS.filter((group) => group.track === track).map(
              (group) => {
                const own = group.kinds.filter(
                  (kind) => catalogue[kind].track === track,
                );

                return own.length > 0 ? (
                  <div key={group.label} className="flex flex-col gap-3">
                    <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      {group.label}
                    </h4>
                    <ul className="grid gap-3 md:grid-cols-2">
                      {own.map((kind) => (
                        <KindEntry key={kind} kind={kind} />
                      ))}
                    </ul>
                  </div>
                ) : null;
              },
            )}
          </div>
        ))}
      </section>
    </HandbookPage>
  );
}
