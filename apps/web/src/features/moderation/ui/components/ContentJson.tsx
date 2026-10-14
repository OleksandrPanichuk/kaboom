import { ChevronRight } from "lucide-react";

interface ContentJsonProps {
  title: string;
  detail: string;
  value: unknown;
}

export function ContentJson({ title, detail, value }: ContentJsonProps) {
  return (
    <details className="group min-w-0 rounded-2xl border border-border bg-card shadow-card">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-2xl px-4 py-3.5 outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:px-5 [&::-webkit-details-marker]:hidden">
        <ChevronRight
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
        />
        <span className="font-semibold">{title}</span>
        <span className="ml-auto text-sm text-muted-foreground">{detail}</span>
      </summary>
      <pre className="mx-4 mb-4 max-h-[32rem] overflow-auto rounded-xl bg-muted/60 p-3 text-xs leading-5 sm:mx-5 sm:mb-5">
        {value === undefined ? "None" : JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}
