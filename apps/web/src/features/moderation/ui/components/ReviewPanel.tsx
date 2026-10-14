import type { ReactNode } from "react";

interface ReviewPanelProps {
  title: string;
  children: ReactNode;
}

export function ReviewPanel({ title, children }: ReviewPanelProps) {
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}
