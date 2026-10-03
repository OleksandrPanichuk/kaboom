import type { ReviewModel } from "@repo/api-client";
import { ChevronRight } from "lucide-react";

import { citationKind, skillLabel } from "@/features/reviews/utils";

import { ScoreDots } from "./ScoreDots";

interface RubricItemCardProps {
  item: ReviewModel["items"][number];
}

export function RubricItemCard({ item }: RubricItemCardProps) {
  return (
    <li className="flex flex-col gap-2 rounded-2xl border border-black/[0.07] bg-white p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="font-medium text-pretty">{item.title}</p>
          <p className="text-xs text-muted-foreground">
            {skillLabel(item.dimension)}
          </p>
        </div>
        <ScoreDots score={item.score} />
      </div>
      <p className="text-sm leading-6 text-zinc-700 text-pretty">
        {item.rationale}
      </p>
      {item.citations.length > 0 ? (
        <details className="group">
          <summary className="flex w-fit cursor-pointer list-none items-center gap-1 rounded text-sm font-medium text-indigo-700 outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
            <ChevronRight
              aria-hidden="true"
              className="size-3.5 transition-transform group-open:rotate-90"
            />
            Evidence ({item.citations.length})
          </summary>
          <ul className="mt-2 flex flex-col gap-2">
            {item.citations.map((citation) => (
              <li
                key={citation.label}
                className="flex min-w-0 gap-2 border-l-2 border-zinc-200 pl-3 text-sm leading-5"
              >
                <span className="w-12 shrink-0 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {citationKind(citation.kind)}
                </span>
                <span className="min-w-0 break-words text-zinc-700">
                  {citation.text}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </li>
  );
}
