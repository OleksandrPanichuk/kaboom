import type { ReactNode } from "react";

interface HandbookPageProps {
  title: string;
  description: string;
  back?: ReactNode;
  children: ReactNode;
}

export function HandbookPage({
  title,
  description,
  back,
  children,
}: HandbookPageProps) {
  return (
    <div className="flex-1 bg-zinc-50/70 px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <div className="flex min-w-0 flex-col gap-1">
          {back}
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-balance">
            {title}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base text-pretty">
            {description}
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
