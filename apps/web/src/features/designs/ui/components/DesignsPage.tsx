import type { ReactNode } from "react";

interface DesignsPageProps {
  action?: ReactNode;
  children: ReactNode;
}

export function DesignsPage({ action, children }: DesignsPageProps) {
  return (
    <div className="flex-1 bg-zinc-50/70 px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-3xl font-semibold tracking-[-0.04em]">
              Designs
            </h1>
            <p className="text-sm leading-6 text-muted-foreground sm:text-base">
              Systems you have sketched, newest first.
            </p>
          </div>
          {action}
        </div>
        {children}
      </div>
    </div>
  );
}
