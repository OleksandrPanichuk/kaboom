import { Check, Minus } from "lucide-react";

import { COMPARISON } from "@/features/marketing/constants";

import { SectionHeading } from "./SectionHeading";

export function ComparisonSection() {
  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-20 sm:px-6">
      <SectionHeading
        eyebrow="Why Kaboom"
        title="Whiteboard practice, upgraded"
        centered
      />
      <div
        data-reveal
        className="overflow-hidden rounded-3xl border border-border/80"
      >
        <table className="w-full text-left text-sm">
          <thead className="bg-card/60 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium sm:px-6">
                <span className="sr-only">Question</span>
              </th>
              <th className="px-4 py-3 font-medium sm:px-6">
                Whiteboard practice
              </th>
              <th className="px-4 py-3 font-medium text-primary sm:px-6">
                Kaboom
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {COMPARISON.map((row) => (
              <tr key={row.topic}>
                <th
                  scope="row"
                  className="px-4 py-4 align-top font-medium sm:px-6"
                >
                  {row.topic}
                </th>
                <td className="px-4 py-4 align-top text-muted-foreground sm:px-6">
                  <span className="flex gap-2">
                    <Minus
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0"
                    />
                    {row.whiteboard}
                  </span>
                </td>
                <td className="bg-primary/[0.04] px-4 py-4 align-top sm:px-6">
                  <span className="flex gap-2">
                    <Check
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-primary"
                    />
                    {row.kaboom}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
