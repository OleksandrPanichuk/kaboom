import type { NodeKindDocs } from "@repo/design";
import { ChevronRight } from "lucide-react";

interface KindAboutProps {
  label: string;
  docs: NodeKindDocs;
}

export function KindAbout({ label, docs }: KindAboutProps) {
  return (
    <details className="group border-b">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-4 py-3 text-xs font-medium tracking-wide text-muted-foreground uppercase outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
        <ChevronRight
          aria-hidden="true"
          className="size-3.5 transition-transform group-open:rotate-90"
        />
        About {label}
      </summary>
      <div className="flex flex-col gap-3 px-4 pb-4 text-sm leading-5">
        <p className="text-pretty">{docs.summary}</p>
        <div className="flex flex-col gap-1">
          <h4 className="text-xs font-medium text-muted-foreground">
            Use it for
          </h4>
          <p className="text-pretty">{docs.useWhen}</p>
        </div>
        <div className="flex flex-col gap-1">
          <h4 className="text-xs font-medium text-muted-foreground">
            Watch out for
          </h4>
          <ul className="flex list-disc flex-col gap-1 pl-4">
            {docs.pitfalls.map((pitfall) => (
              <li key={pitfall} className="text-pretty">
                {pitfall}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  );
}
