import { Check, Minus } from "lucide-react";

import { PLAN_COMPARISON } from "@/features/billing/constants";

const cell = (value: boolean | string) =>
  typeof value === "string" ? (
    <span>{value}</span>
  ) : value ? (
    <Check
      aria-label="Included"
      className="ml-auto size-4 text-success-foreground sm:mx-auto"
    />
  ) : (
    <Minus
      aria-label="Not included"
      className="ml-auto size-4 text-muted-foreground/60 sm:mx-auto"
    />
  );

export function PlanComparison() {
  return (
    <section aria-labelledby="compare-title" className="flex flex-col gap-3">
      <h2
        id="compare-title"
        className="text-lg font-semibold tracking-[-0.02em]"
      >
        Free and Pro side by side
      </h2>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="py-2.5 pr-3 pl-4 font-medium sm:pl-5">Feature</th>
              <th className="w-24 px-3 py-2.5 text-right font-medium sm:w-36 sm:text-center">
                Free
              </th>
              <th className="w-28 py-2.5 pr-4 pl-3 text-right font-medium text-foreground sm:w-36 sm:pr-5 sm:text-center">
                Pro
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {PLAN_COMPARISON.map((row) => (
              <tr key={row.feature}>
                <th scope="row" className="py-3 pr-3 pl-4 font-medium sm:pl-5">
                  {row.feature}
                </th>
                <td className="px-3 py-3 text-right text-muted-foreground sm:text-center">
                  {cell(row.free)}
                </td>
                <td className="py-3 pr-4 pl-3 text-right font-medium sm:pr-5 sm:text-center">
                  {cell(row.pro)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
