import type { ReactNode } from "react";

interface InspectorSectionProps {
  title: string;
  children: ReactNode;
}

export function InspectorSection({ title, children }: InspectorSectionProps) {
  return (
    <section className="flex flex-col gap-4 border-b px-4 py-4 last:border-b-0">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}
