import { cn } from "cn";
import {
  siApachekafka,
  type SimpleIcon,
  siNginx,
  siPostgresql,
  siRedis,
} from "simple-icons";

interface CanvasNode {
  id: string;
  x: number;
  y: number;
  label: string;
  detail: string;
  icon?: SimpleIcon;
  replicas?: number;
  failing?: boolean;
}

const NODES: CanvasNode[] = [
  { id: "clients", x: 24, y: 168, label: "Clients", detail: "12k req/s" },
  {
    id: "gateway",
    x: 168,
    y: 168,
    label: "Gateway",
    detail: "nginx",
    icon: siNginx,
  },
  {
    id: "orders",
    x: 316,
    y: 168,
    label: "Orders",
    detail: "3 replicas",
    replicas: 3,
  },
  {
    id: "cache",
    x: 470,
    y: 64,
    label: "Cache",
    detail: "Redis",
    icon: siRedis,
  },
  {
    id: "db",
    x: 470,
    y: 272,
    label: "Orders DB",
    detail: "Postgres",
    icon: siPostgresql,
    failing: true,
  },
  {
    id: "events",
    x: 316,
    y: 312,
    label: "Events",
    detail: "Kafka",
    icon: siApachekafka,
  },
];

const WIDTH = 118;
const HEIGHT = 46;

const center = (id: string) => {
  const node = NODES.find((candidate) => candidate.id === id)!;

  return { x: node.x + WIDTH / 2, y: node.y + HEIGHT / 2 };
};

const EDGES: Array<[string, string]> = [
  ["clients", "gateway"],
  ["gateway", "orders"],
  ["orders", "cache"],
  ["orders", "db"],
  ["orders", "events"],
];

const path = (from: string, to: string) => {
  const a = center(from);
  const b = center(to);
  const mid = (a.x + b.x) / 2;

  return `M ${a.x} ${a.y} C ${mid} ${a.y}, ${mid} ${b.y}, ${b.x} ${b.y}`;
};

function Glyph({ icon, x, y }: { icon: SimpleIcon; x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-3" y="-3" width="20" height="20" rx="6" fill="#ffffff" />
      <g transform="scale(0.58)">
        <path d={icon.path} fill={`#${icon.hex}`} />
      </g>
    </g>
  );
}

interface ChipProps {
  label: string;
  value: string;
  tone: "success" | "primary" | "danger";
  className: string;
}

function Chip({ label, value, tone, className }: ChipProps) {
  return (
    <div
      className={cn(
        "absolute items-center gap-2.5 rounded-xl border border-border/80 bg-card/85 px-3 py-2 shadow-2xl backdrop-blur-md motion-safe:animate-float",
        className,
      )}
    >
      <span
        className={cn(
          "size-2 rounded-full",
          tone === "success" && "bg-success-foreground",
          tone === "primary" && "bg-primary",
          tone === "danger" && "bg-danger-foreground motion-safe:animate-blink",
        )}
      />
      <span className="flex flex-col leading-tight">
        <span className="text-[10px] tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
        <span className="font-mono text-sm font-semibold tabular-nums">
          {value}
        </span>
      </span>
    </div>
  );
}

export function HeroVisual() {
  return (
    <div className="relative isolate mx-auto w-full max-w-[640px]">
      <div
        aria-hidden="true"
        className="absolute -inset-10 -z-10 rounded-[3rem] bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--primary)_30%,transparent),transparent)] blur-2xl motion-safe:animate-glow"
      />
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/60 shadow-2xl backdrop-blur-sm">
        <div className="flex items-center gap-2 border-b border-border/80 px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-muted-foreground/30" />
          <span className="size-2.5 rounded-full bg-muted-foreground/30" />
          <span className="size-2.5 rounded-full bg-muted-foreground/30" />
          <span className="ml-3 min-w-0 truncate font-mono text-xs text-muted-foreground">
            checkout-under-a-flash-sale
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-success-border whitespace-nowrap bg-success-surface px-2 py-0.5 text-[11px] font-medium text-success-foreground">
            <span className="size-1.5 rounded-full bg-success-foreground motion-safe:animate-blink" />
            Load test running
          </span>
        </div>
        <svg
          role="img"
          aria-label="A design taking traffic: clients through a gateway to an orders service, its cache, database and event stream"
          viewBox="0 0 612 380"
          className="block w-full"
        >
          <defs>
            <pattern
              id="hero-dots"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <circle
                cx="1"
                cy="1"
                r="1"
                className="fill-muted-foreground/15"
              />
            </pattern>
          </defs>
          <rect width="612" height="380" fill="url(#hero-dots)" />
          {EDGES.map(([from, to]) => (
            <g key={`${from}-${to}`}>
              <path
                d={path(from, to)}
                fill="none"
                className="stroke-border"
                strokeWidth="2"
              />
              <path
                d={path(from, to)}
                fill="none"
                className="stroke-primary motion-safe:animate-flow"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="4 8"
              />
            </g>
          ))}
          {NODES.map((node) => (
            <g key={node.id}>
              {node.replicas
                ? [2, 1].map((offset) => (
                    <rect
                      key={offset}
                      x={node.x + offset * 5}
                      y={node.y - offset * 5}
                      width={WIDTH}
                      height={HEIGHT}
                      rx="10"
                      className="fill-card stroke-border"
                    />
                  ))
                : null}
              <rect
                x={node.x}
                y={node.y}
                width={WIDTH}
                height={HEIGHT}
                rx="10"
                className={cn(
                  "fill-card",
                  node.failing ? "stroke-danger-foreground" : "stroke-border",
                )}
                strokeWidth={node.failing ? 1.5 : 1}
              />
              {node.icon ? (
                <Glyph icon={node.icon} x={node.x + 10} y={node.y + 16} />
              ) : (
                <circle
                  cx={node.x + 17}
                  cy={node.y + 23}
                  r="6"
                  className="fill-interactive-foreground/80"
                />
              )}
              <text
                x={node.x + 34}
                y={node.y + 20}
                className="fill-foreground text-[12px] font-semibold"
              >
                {node.label}
              </text>
              <text
                x={node.x + 34}
                y={node.y + 35}
                className="fill-muted-foreground font-mono text-[10px]"
              >
                {node.detail}
              </text>
              {node.failing ? (
                <g className="motion-safe:animate-blink">
                  <rect
                    x={node.x + 60}
                    y={node.y - 12}
                    width="66"
                    height="18"
                    rx="9"
                    className="fill-danger-surface stroke-danger-border"
                  />
                  <text
                    x={node.x + 93}
                    y={node.y + 1}
                    textAnchor="middle"
                    className="fill-danger-foreground text-[9px] font-semibold"
                  >
                    replica lost
                  </text>
                </g>
              ) : null}
            </g>
          ))}
        </svg>
      </div>
      <Chip
        label="p99 latency"
        value="84 ms"
        tone="success"
        className="top-16 -left-3 flex sm:-left-10"
      />
      <Chip
        label="Throughput"
        value="12,400/s"
        tone="primary"
        className="-right-2 bottom-24 hidden [animation-delay:-2s] sm:flex sm:-right-8"
      />
      <Chip
        label="Chaos case"
        value="DB failover"
        tone="danger"
        className="-bottom-5 left-8 hidden [animation-delay:-4s] sm:left-24 sm:flex"
      />
    </div>
  );
}
