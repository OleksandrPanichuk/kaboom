import { cn } from "cn";
import { useState } from "react";

import { SegmentedControl } from "@/components/SegmentedControl";
import { SCENARIOS } from "@/features/marketing/constants";

import { SectionHeading } from "./SectionHeading";

const WIDTH = 600;
const HEIGHT = 200;
const MAX_LATENCY = 400;
const MAX_ERRORS = 15;

const x = (index: number, count: number) => (index / (count - 1)) * WIDTH;

export function LoadShowcase() {
  const [key, setKey] = useState<(typeof SCENARIOS)[number]["key"]>("spike");
  const scenario = SCENARIOS.find((candidate) => candidate.key === key)!;
  const count = scenario.latency.length;
  const line = scenario.latency
    .map(
      (value, index) =>
        `${index === 0 ? "M" : "L"} ${x(index, count)} ${HEIGHT - (value / MAX_LATENCY) * HEIGHT}`,
    )
    .join(" ");
  const area = `${line} L ${WIDTH} ${HEIGHT} L 0 ${HEIGHT} Z`;
  const facts = [
    { label: "p99 latency", value: scenario.p99 },
    { label: "Availability", value: scenario.availability },
    { label: "Verdict", value: scenario.verdict },
  ];

  return (
    <section
      id="simulation"
      className="mx-auto flex max-w-6xl scroll-mt-24 flex-col gap-10 px-4 py-20 sm:px-6 sm:py-28"
    >
      <SectionHeading
        eyebrow="Load and chaos"
        title="Watch your design take the traffic"
        body="Each drill plays real traffic against your design, second by second, with the faults the problem asks for. Pick a scenario."
      />
      <div
        data-reveal
        className="overflow-hidden rounded-3xl border border-border/80 bg-card/60"
      >
        <div className="flex flex-col gap-4 border-b border-border/80 p-5 sm:flex-row sm:items-center sm:justify-between">
          <SegmentedControl
            name="scenario"
            label="Scenario"
            value={key}
            options={SCENARIOS.map((candidate) => ({
              value: candidate.key,
              label: candidate.label,
            }))}
            onChange={(next) =>
              setKey(
                SCENARIOS.find((candidate) => candidate.key === next)?.key ??
                  "normal",
              )
            }
          />
          <p className="text-sm text-muted-foreground">{scenario.caption}</p>
        </div>
        <div className="grid gap-px bg-border/80 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="flex flex-col gap-3 bg-background/60 p-5">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded bg-primary" /> p99 latency
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-danger-foreground/70" />{" "}
                errors
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-warning-foreground/30" />{" "}
                fault
              </span>
            </div>
            <svg
              viewBox={`0 0 ${WIDTH} ${HEIGHT + 60}`}
              className="w-full"
              role="img"
              aria-label={`${scenario.label}: p99 ${scenario.p99}, availability ${scenario.availability}`}
            >
              {[0, 0.25, 0.5, 0.75, 1].map((step) => (
                <line
                  key={step}
                  x1="0"
                  x2={WIDTH}
                  y1={HEIGHT * step}
                  y2={HEIGHT * step}
                  className="stroke-border/70"
                  strokeDasharray="2 6"
                />
              ))}
              {scenario.faultFrom !== null && scenario.faultTo !== null ? (
                <rect
                  x={x(scenario.faultFrom, count)}
                  y="0"
                  width={
                    x(scenario.faultTo, count) - x(scenario.faultFrom, count)
                  }
                  height={HEIGHT + 60}
                  className="fill-warning-foreground/10"
                />
              ) : null}
              <g key={`area-${key}`}>
                <path d={area} className="fill-primary/10" />
                <path
                  d={line}
                  fill="none"
                  className="stroke-primary motion-safe:animate-[kb-draw_1.2s_ease-out]"
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  pathLength={1000}
                  strokeDasharray="1000"
                />
              </g>
              {scenario.errors.map((value, index) => (
                <rect
                  key={`${key}-${index}`}
                  x={x(index, count) - 9}
                  y={HEIGHT + 60 - (value / MAX_ERRORS) * 50}
                  width="18"
                  height={(value / MAX_ERRORS) * 50}
                  rx="3"
                  className="fill-danger-foreground/70 transition-all duration-700"
                />
              ))}
            </svg>
            <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
              <span>0:00</span>
              <span>5:00</span>
              <span>10:00</span>
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-px bg-border/80 lg:grid-cols-1">
            {facts.map((fact) => (
              <div
                key={fact.label}
                className="flex flex-col gap-1 bg-background/60 p-5"
              >
                <dt className="text-xs text-muted-foreground">{fact.label}</dt>
                <dd
                  className={cn(
                    "text-xl font-semibold tracking-[-0.02em] tabular-nums sm:text-2xl",
                    fact.value === "Flaky" && "text-warning-foreground",
                    fact.value === "Passed" && "text-success-foreground",
                    fact.value === "Failed" && "text-danger-foreground",
                  )}
                >
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
