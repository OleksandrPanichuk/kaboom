import { catalogue, type NodeKind } from "@repo/design";
import { Link } from "@tanstack/react-router";

import { FALLBACK_NODE_ICON, NODE_KIND_ICONS } from "@/features/canvas";
import { articlesAbout } from "@/features/handbook/utils";

interface KindEntryProps {
  kind: NodeKind;
}

export function KindEntry({ kind }: KindEntryProps) {
  const definition = catalogue[kind];
  const Icon = NODE_KIND_ICONS[definition.icon] ?? FALLBACK_NODE_ICON;
  const articles = articlesAbout(kind);

  return (
    <li
      id={kind}
      className="flex min-w-0 scroll-mt-24 flex-col gap-3 rounded-2xl border border-black/[0.07] bg-white p-4 sm:p-5"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-indigo-200/60 bg-indigo-50 text-indigo-700">
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <h3 className="font-semibold tracking-[-0.02em]">{definition.label}</h3>
      </div>
      <p className="text-sm leading-5 text-pretty">{definition.docs.summary}</p>
      <div className="flex flex-col gap-1">
        <h4 className="text-xs font-medium text-muted-foreground">
          Use it for
        </h4>
        <p className="text-sm leading-5 text-pretty">
          {definition.docs.useWhen}
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <h4 className="text-xs font-medium text-muted-foreground">
          Watch out for
        </h4>
        <ul className="flex list-disc flex-col gap-1 pl-4 text-sm leading-5">
          {definition.docs.pitfalls.map((pitfall) => (
            <li key={pitfall} className="text-pretty">
              {pitfall}
            </li>
          ))}
        </ul>
      </div>
      {articles.length > 0 ? (
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
          <span className="text-muted-foreground">Read more:</span>
          {articles.map((article) => (
            <Link
              key={article.slug}
              to="/handbook/$slug"
              params={{ slug: article.slug }}
              className="font-medium text-indigo-700 underline-offset-2 hover:underline"
            >
              {article.title}
            </Link>
          ))}
        </p>
      ) : null}
    </li>
  );
}
