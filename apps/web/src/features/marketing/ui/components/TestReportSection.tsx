import { cn } from "cn";
import { CircleCheck, CircleX, TriangleAlert } from "lucide-react";

import { TEST_SUITES } from "@/features/marketing/constants";

import { SectionHeading } from "./SectionHeading";

const ASSERTIONS = [
  {
    label: "p99 latency under 200 ms",
    expected: "≤ 200 ms",
    actual: "168 ms",
    ok: true,
  },
  {
    label: "Availability at least 99.5%",
    expected: "≥ 99.5%",
    actual: "99.4%",
    ok: false,
  },
  {
    label: "Writes reach a database",
    expected: "100%",
    actual: "100%",
    ok: true,
  },
];

export function TestReportSection() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
      <div className="flex flex-col gap-6">
        <SectionHeading
          eyebrow="Tests on every submission"
          title="A report, not a vibe"
          body="Submit and your design runs the problem's functional, load, fault, chaos and constraint suites. Every assertion shows what it expected, what it got, and the node to blame."
        />
        <ul
          data-reveal
          className="flex flex-col gap-2 text-sm text-muted-foreground"
        >
          <li>
            · Public tests show everything. Hidden tests show only their name
            and result.
          </li>
          <li>
            · A test that passes as drawn but fails on some of its twenty varied
            runs is marked flaky and scores half.
          </li>
          <li>
            · Chaos cases come from your own design, so they cannot be learned
            by heart.
          </li>
        </ul>
      </div>
      <div
        data-reveal
        data-tilt
        className="overflow-hidden rounded-3xl border border-border/80 bg-card/70 shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border/80 px-5 py-4">
          <span className="font-semibold">Test report</span>
          <span className="font-mono text-sm text-muted-foreground">
            <span className="text-success-foreground">20</span> / 23 passed
          </span>
        </div>
        <ul className="grid grid-cols-5 gap-px border-b border-border/80 bg-border/80 text-center">
          {TEST_SUITES.map((suite) => (
            <li
              key={suite.name}
              className="flex flex-col gap-1 bg-card/90 px-2 py-3"
            >
              <span className="text-[11px] text-muted-foreground">
                {suite.name}
              </span>
              <span
                className={cn(
                  "font-mono text-sm font-semibold",
                  suite.passed === suite.total
                    ? "text-success-foreground"
                    : "text-warning-foreground",
                )}
              >
                {suite.passed}/{suite.total}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">A link goes viral</span>
            <span className="flex items-center gap-1.5 rounded-full border border-warning-border bg-warning-surface px-2 py-0.5 text-xs font-medium text-warning-foreground">
              <TriangleAlert aria-hidden="true" className="size-3.5" />
              Flaky · holds in 17 of 20 runs
            </span>
          </div>
          <ul className="flex flex-col divide-y divide-border/70 rounded-xl border border-border/70 text-sm">
            {ASSERTIONS.map((assertion) => (
              <li
                key={assertion.label}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5"
              >
                {assertion.ok ? (
                  <CircleCheck
                    aria-label="Passed"
                    className="size-4 text-success-foreground"
                  />
                ) : (
                  <CircleX
                    aria-label="Failed"
                    className="size-4 text-danger-foreground"
                  />
                )}
                <span className="truncate">{assertion.label}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {assertion.actual}{" "}
                  <span className="opacity-60">/ {assertion.expected}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="font-mono text-xs text-muted-foreground">
            Blamed: <span className="text-foreground">Orders service</span> at
            3:12 · worst run: seed 14
          </p>
        </div>
      </div>
    </section>
  );
}
