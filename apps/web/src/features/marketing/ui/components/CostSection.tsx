import { siPostgresql } from "simple-icons";

import { COST_LINES } from "@/features/marketing/constants";

import { SectionHeading } from "./SectionHeading";

const total = COST_LINES.reduce((sum, line) => sum + line.usd, 0);
const usd = (value: number) => `$${value.toLocaleString("en")}`;

export function CostSection() {
  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-20 sm:px-6">
      <SectionHeading
        eyebrow="Real products, real numbers"
        title="Pick the product, get its limits and its bill"
        body="Choose Amazon RDS, ElastiCache, SQS or a self-hosted Kafka, and the instance class, Multi-AZ or FIFO setting becomes the capacity your design is tested with. The whole design is priced monthly at list prices."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <div
          data-reveal
          data-tilt
          className="flex flex-col gap-4 rounded-3xl border border-border/80 bg-card/70 p-6"
        >
          <div className="flex items-center gap-3">
            <span
              className="grid size-10 place-items-center rounded-xl"
              style={{ backgroundColor: "#ffffff" }}
            >
              <svg
                viewBox="0 0 24 24"
                className="size-6"
                fill={`#${siPostgresql.hex}`}
                aria-hidden="true"
              >
                <path d={siPostgresql.path} />
              </svg>
            </span>
            <div className="flex flex-col">
              <span className="font-semibold">Orders DB</span>
              <span className="text-xs text-muted-foreground">
                Amazon RDS for PostgreSQL
              </span>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["Instance class", "db.r6g.xlarge"],
              ["Multi-AZ", "On"],
              ["Read capacity", "18,000 / s"],
              ["Write capacity", "6,000 / s"],
              ["Failover", "Automatic"],
              ["Max connections", "1,000"],
            ].map(([term, detail]) => (
              <div
                key={term}
                className="flex flex-col gap-0.5 rounded-xl border border-border/70 bg-background/50 px-3 py-2"
              >
                <dt className="text-xs text-muted-foreground">{term}</dt>
                <dd className="font-mono font-medium">{detail}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-muted-foreground">
            Derived from the product. Change the instance class and the numbers
            follow.
          </p>
        </div>
        <div
          data-reveal
          data-tilt
          className="flex flex-col gap-4 rounded-3xl border border-border/80 bg-card/70 p-6"
        >
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-semibold">Monthly cost</span>
            <span className="text-3xl font-semibold tracking-[-0.03em] tabular-nums">
              {usd(total)}
            </span>
          </div>
          <ul className="flex flex-col gap-3">
            {COST_LINES.map((line) => (
              <li key={line.label} className="flex flex-col gap-1.5 text-sm">
                <span className="flex justify-between gap-3">
                  <span className="truncate text-muted-foreground">
                    {line.label}
                  </span>
                  <span className="font-mono tabular-nums">
                    {usd(line.usd)}
                  </span>
                </span>
                <span className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{
                      width: `${(line.usd / COST_LINES[0].usd) * 100}%`,
                    }}
                  />
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            An example design, at us-east-1 on-demand prices. A problem can ask
            a design to fit a budget.
          </p>
        </div>
      </div>
    </section>
  );
}
