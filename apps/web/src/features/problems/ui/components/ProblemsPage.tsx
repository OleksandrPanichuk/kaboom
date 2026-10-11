import type { ReactNode } from "react";

interface ProblemsPageProps {
  aside?: ReactNode;
  children: ReactNode;
}

export function ProblemsPage({ aside, children }: ProblemsPageProps) {
  return (
    <div className="flex-1 bg-background px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-3xl font-semibold tracking-[-0.03em]">
              Problems
            </h1>
            <p className="text-sm leading-6 text-muted-foreground sm:text-base">
              Design a system against a brief, run it under load, and submit it
              for a score.
            </p>
          </div>
          {aside}
        </div>
        {children}
      </div>
    </div>
  );
}
