import { useState } from "react";
import { siMysql, siPostgresql, siSqlite } from "simple-icons";

import { SegmentedControl } from "@/components/SegmentedControl";
import { DDL } from "@/features/marketing/constants";

import { SectionHeading } from "./SectionHeading";

type Engine = keyof typeof DDL;

const ENGINES = [
  { value: "postgres", label: "PostgreSQL", icon: siPostgresql },
  { value: "mysql", label: "MySQL", icon: siMysql },
  { value: "sqlite", label: "SQLite", icon: siSqlite },
] as const;

const TABLES = [
  {
    name: "customers",
    x: 0,
    y: 30,
    columns: ["id  bigint  PK", "email  varchar(320)  UQ", "name  text"],
  },
  {
    name: "orders",
    x: 250,
    y: 0,
    columns: [
      "id  bigint  PK",
      "customer_id  bigint  FK",
      "status  order_status",
      "total  numeric(12,2)",
    ],
  },
  {
    name: "order_lines",
    x: 250,
    y: 150,
    columns: [
      "order_id  bigint  PK FK",
      "product_id  bigint  PK FK",
      "quantity  integer",
    ],
  },
];

export function DataModelShowcase() {
  const [engine, setEngine] = useState<Engine>("postgres");

  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
      <div
        data-reveal
        className="order-2 flex flex-col overflow-hidden rounded-3xl border border-border/80 bg-card/70 shadow-2xl lg:order-1"
      >
        <div className="relative h-60 border-b border-border/80 bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:18px_18px]">
          <svg
            viewBox="0 0 470 230"
            className="absolute inset-0 m-auto h-full w-full p-4"
            aria-hidden="true"
          >
            <path
              d="M 170 70 C 210 70, 210 40, 250 40"
              fill="none"
              className="stroke-primary"
              strokeWidth="1.5"
            />
            <path
              d="M 330 108 C 330 125, 330 135, 330 150"
              fill="none"
              className="stroke-primary"
              strokeWidth="1.5"
            />
            {TABLES.map((table) => (
              <g
                key={table.name}
                transform={`translate(${table.x} ${table.y})`}
              >
                <rect
                  width="200"
                  height={32 + table.columns.length * 18}
                  rx="8"
                  className="fill-card stroke-border"
                />
                <rect width="200" height="24" rx="8" className="fill-muted" />
                <text
                  x="10"
                  y="16"
                  className="fill-foreground font-mono text-[11px] font-semibold"
                >
                  {table.name}
                </text>
                {table.columns.map((column, index) => (
                  <text
                    key={column}
                    x="10"
                    y={40 + index * 18}
                    className="fill-muted-foreground font-mono text-[10px]"
                  >
                    {column}
                  </text>
                ))}
              </g>
            ))}
          </svg>
        </div>
        <div className="flex flex-col gap-3 p-4">
          <SegmentedControl
            name="engine"
            label="Engine"
            value={engine}
            options={ENGINES.map(({ value, label }) => ({ value, label }))}
            onChange={(next) =>
              setEngine(
                ENGINES.find((option) => option.value === next)?.value ??
                  "postgres",
              )
            }
          />
          <pre className="max-h-64 overflow-auto rounded-xl border border-border/70 bg-background/80 p-4 font-mono text-[12px] leading-5 text-muted-foreground">
            <code
              key={engine}
              className="motion-safe:animate-[kb-stage_0.4s_ease-out]"
            >
              {DDL[engine]}
            </code>
          </pre>
        </div>
      </div>
      <div className="order-1 flex flex-col gap-6 lg:order-2">
        <SectionHeading
          eyebrow="Data modelling"
          title="Schemas checked against the queries they serve"
          body="Draw tables, keys, indexes and relations, or MongoDB collections and DynamoDB item types. Drills check that every query is served by an index, that a junction table cannot hold a pair twice, and that money never rounds."
        />
        <ul data-reveal className="flex flex-wrap gap-2">
          {[...ENGINES.map((option) => option.icon)].map((icon) => (
            <li
              key={icon.slug}
              className="flex items-center gap-2 rounded-full border border-border/80 bg-card/60 px-3 py-1.5 text-sm"
            >
              <svg
                viewBox="0 0 24 24"
                className="size-4 fill-current text-muted-foreground"
                aria-hidden="true"
              >
                <path d={icon.path} />
              </svg>
              {icon.title}
            </li>
          ))}
          <li className="rounded-full border border-border/80 bg-card/60 px-3 py-1.5 text-sm">
            MongoDB
          </li>
          <li className="rounded-full border border-border/80 bg-card/60 px-3 py-1.5 text-sm">
            DynamoDB
          </li>
        </ul>
        <p data-reveal className="text-sm text-muted-foreground">
          Export what you drew as DDL, a MongoDB $jsonSchema or CloudFormation.
        </p>
      </div>
    </section>
  );
}
