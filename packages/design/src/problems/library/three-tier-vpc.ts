import type { ProblemContentInput } from "../schema";
import { edge, graph, node, subnet, vpc, within } from "./build";

const shoppers = () =>
  node("shoppers", "client", "Shoppers", { rps: 1_500, readRatio: 0.9 });

const tiers = () => [
  node("lb", "load-balancer", "Load balancer"),
  node("app", "service", "Shop", { replicas: 3 }),
  node("db", "sql-database", "Orders"),
];

const payments = () => node("payments", "external-api", "Payment provider");

const calls = () => [
  edge("shoppers", "lb", "sync-call"),
  edge("lb", "app", "sync-call"),
  edge("app", "db", "read"),
  edge("app", "db", "write"),
  edge("app", "payments", "sync-call"),
];

const placeIn =
  (groupId: string, ids: string[]) => (item: ReturnType<typeof node>) =>
    ids.includes(item.id) ? within(groupId, item) : item;

export const threeTierVpc: ProblemContentInput = {
  slug: "three-tier-vpc",
  title: "VPC for a three-tier app",
  track: "devops",
  difficulty: "medium",
  tags: ["networking", "vpc", "security-groups", "nat"],
  summary:
    "Lay out the network of a web shop so shoppers reach it, it reaches its payment provider, and nobody reaches its database.",
  statement: `Design the network of a web shop with three tiers: a load balancer, the application servers and an orders database, plus a payment provider it calls on the internet.

**What it does**

- Shoppers reach the shop through the load balancer.
- The application servers read and write orders, and call the payment provider over the internet to charge a card.

**How it is used**

- Everything runs in one VPC today, in a single public subnet, with no security groups.
- An audit found the database answering on a public address.

**What to watch**

- Shoppers must still get through, and the shop must still reach the payment provider.
- Nothing but the load balancer should be reachable from the internet.
- The database should accept connections from the application servers and nothing else.

The shop's VPC is on the canvas. Rebuild its network.`,
  baseline: graph(
    [
      shoppers(),
      ...tiers().map(placeIn("open", ["lb", "app", "db"])),
      payments(),
    ],
    calls(),
    [
      vpc("shop", "Shop VPC"),
      subnet("open", "public-subnet", "Public", "shop"),
    ],
  ),
  drills: [
    {
      kind: "network",
      id: "everything-connects",
      title: "Every call gets through, and the data stays private",
      description:
        "Shoppers reach the shop, the shop reaches its database and the payment provider, and the internet cannot reach the database.",
      visibility: "public",
      expect: { forbid: ["blocked-path", "exposed-store"] },
    },
    {
      kind: "network",
      id: "database-locked-down",
      title: "Only the shop reaches the database",
      description:
        "The database accepts connections from the application servers and nothing else.",
      visibility: "public",
      expect: { forbid: ["exposed-store", "open-store"] },
    },
    {
      kind: "network",
      id: "servers-hidden",
      title: "The servers hide behind the load balancer",
      visibility: "hidden",
      expect: { forbid: ["exposed-service", "blocked-path"] },
    },
  ],
  rubric: [
    {
      key: "everything-connects",
      title: "Keeps every call working while the data stays private",
      weight: 30,
      check: { check: "drill-passes", drillId: "everything-connects" },
    },
    {
      key: "database-locked-down",
      title: "Lets only the application servers reach the database",
      weight: 30,
      check: { check: "drill-passes", drillId: "database-locked-down" },
    },
    {
      key: "servers-hidden",
      title: "Keeps the application servers off the internet",
      weight: 20,
      check: { check: "drill-passes", drillId: "servers-hidden" },
    },
    {
      key: "guards-each-tier",
      title: "Puts a security group around each tier",
      weight: 10,
      check: { check: "has-node-kind", nodeKind: "security-group", min: 3 },
    },
    {
      key: "calls-out-through-nat",
      title: "Calls out through a NAT gateway",
      weight: 10,
      check: { check: "has-node-kind", nodeKind: "nat-gateway", min: 1 },
    },
  ],
  interview: {
    opening:
      "Hi! Today we're looking at the network of a web shop. An audit just found its database answering on a public address, and we'd like to fix that properly. What would you like to know?",
    facts: [
      {
        topic: "Tiers",
        answer:
          "A load balancer, three application servers and a Postgres database for orders.",
      },
      {
        topic: "Today's network",
        answer:
          "One VPC with a single public subnet. Every machine has a public address, and there are no security groups.",
      },
      {
        topic: "Payments",
        answer:
          "The application servers call a payment provider over the internet to charge cards. The provider does not call back in.",
      },
      {
        topic: "The audit",
        answer:
          "The auditors could open a connection to the database from the internet. They want the database reachable from the application servers only.",
      },
      {
        topic: "Administration",
        answer:
          "Engineers reach the machines through a bastion today, but leave that out: treat it as solved.",
      },
      {
        topic: "Availability",
        answer:
          "One availability zone is fine for this exercise; the question is reachability, not redundancy.",
      },
    ],
    phases: [
      {
        id: "requirements",
        minutes: 5,
        goal: "Agree on who must reach what, and what must stay unreachable.",
      },
      {
        id: "high-level",
        minutes: 15,
        goal: "Subnets for each tier, and how traffic gets in and out.",
      },
      {
        id: "deep-dive",
        minutes: 15,
        goal: "Security groups that admit only what each tier needs, and the outbound path to the payment provider.",
      },
      {
        id: "wrap-up",
        minutes: 5,
        goal: "Walk a request in and a payment out, and say what an attacker on the internet can still reach.",
      },
    ],
    rubric: [
      {
        key: "clarifies-flows",
        dimension: "requirements",
        title: "Maps who must reach what before designing",
        signals: [
          "Lists the flows: shoppers in, the shop to its database, the shop out to payments",
          "Asks what must stay unreachable",
        ],
        weight: 10,
      },
      {
        key: "splits-subnets",
        dimension: "design",
        title: "Splits the tiers into public and private subnets",
        signals: [
          "Keeps only the load balancer in a public subnet",
          "Puts the application servers and the database in private subnets",
        ],
        weight: 25,
      },
      {
        key: "least-privilege",
        dimension: "reliability",
        title: "Admits only what each tier needs",
        signals: [
          "Gives each tier its own security group",
          "Lets the database admit the application servers' group only",
          "Avoids opening a store to the whole VPC",
        ],
        weight: 25,
      },
      {
        key: "outbound-path",
        dimension: "operability",
        title: "Keeps the payment provider reachable from private subnets",
        signals: [
          "Notices that private subnets have no way out on their own",
          "Adds a NAT gateway in a public subnet",
          "Explains that a NAT gateway lets calls out but nothing in",
        ],
        weight: 20,
      },
      {
        key: "communicates",
        dimension: "communication",
        title: "Explains trade-offs and responds to challenges",
        signals: [
          "Thinks aloud and keeps the design and the explanation in step",
          "Changes the design when a drill or a question shows a problem",
        ],
        weight: 20,
      },
    ],
    drillIds: ["everything-connects", "database-locked-down"],
  },
  hints: [
    {
      title: "Why can the auditors reach the database?",
      body: "It sits in a public subnet and nothing guards it: anything that can route to it can connect.",
      cost: 5,
    },
    {
      title: "Public for the door, private for the rest",
      body: "Keep the load balancer in a public subnet and move the application servers and the database into private ones. Give each tier a security group that admits only the tier in front of it.",
      cost: 10,
    },
    {
      title: "The payments broke",
      body: "A private subnet cannot reach the internet by itself. A NAT gateway in a public subnet lets it call out without letting anything in.",
      cost: 15,
    },
  ],
  reference: {
    notes:
      "The load balancer and a NAT gateway sit in a public subnet; the application servers and the database each sit in a private subnet. The load balancer's security group admits the internet, the application servers' admits the load balancer's group, and the database's admits the application servers' group only. The servers call the payment provider out through the NAT gateway, which lets nothing back in.",
    graph: graph(
      [
        shoppers(),
        within("edge", node("lb", "load-balancer", "Load balancer")),
        within("apps", node("app", "service", "Shop", { replicas: 3 })),
        within("data", node("db", "sql-database", "Orders")),
        within("edge", node("nat", "nat-gateway", "NAT gateway")),
        payments(),
        node("sg-lb", "security-group", "Load balancer group", {
          fromInternet: true,
        }),
        node("sg-app", "security-group", "Shop group"),
        node("sg-db", "security-group", "Orders group"),
      ],
      [
        ...calls(),
        edge("sg-lb", "lb", "protects"),
        edge("sg-app", "app", "protects"),
        edge("sg-db", "db", "protects"),
        edge("sg-app", "sg-lb", "admits"),
        edge("sg-db", "sg-app", "admits"),
      ],
      [
        vpc("shop", "Shop VPC"),
        subnet("edge", "public-subnet", "Public", "shop"),
        subnet("apps", "private-subnet", "Application", "shop"),
        subnet("data", "private-subnet", "Data", "shop"),
      ],
    ),
  },
};
