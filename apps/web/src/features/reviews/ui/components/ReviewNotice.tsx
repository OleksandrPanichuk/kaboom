import { cn } from "cn";
import { LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";

interface ReviewNoticeProps {
  title: string;
  body: string;
  busy?: boolean;
  children?: ReactNode;
}

export function ReviewNotice({
  title,
  body,
  busy = false,
  children,
}: ReviewNoticeProps) {
  return (
    <section
      role={busy ? "status" : undefined}
      className={cn(
        "flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-card sm:p-6",
        busy ? "border-interactive-border/60" : "border-border",
      )}
    >
      <h2 className="flex items-center gap-2 font-semibold">
        {busy ? (
          <LoaderCircle
            aria-hidden="true"
            className="size-4 animate-spin text-interactive"
          />
        ) : null}
        {title}
      </h2>
      {body ? (
        <p className="text-sm leading-6 text-muted-foreground text-pretty">
          {body}
        </p>
      ) : null}
      {children}
    </section>
  );
}
