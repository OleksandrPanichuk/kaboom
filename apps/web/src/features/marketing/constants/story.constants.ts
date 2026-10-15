export interface InterviewStage {
  phase: string;
  title: string;
  body: string;
  interviewer: string;
  candidate: string;
  tool: string;
}

export const INTERVIEW_STAGES: readonly InterviewStage[] = [
  {
    phase: "Requirements",
    title: "It starts with questions, not boxes",
    body: "The interviewer reads you the brief and waits. Ask about scale, consistency and what matters most, and it answers like a hiring manager who knows the product.",
    interviewer:
      "We sell tickets for big concerts. On-sale opens at noon and the whole city refreshes at once.",
    candidate:
      "How many tickets per event, and can two people ever hold the same seat?",
    tool: "set_phase · requirements",
  },
  {
    phase: "High-level design",
    title: "It watches the canvas while you draw",
    body: "Every node and edge you add reaches the interviewer as it happens. It reads the design, points at the part it means and asks why it is there.",
    interviewer:
      "Your seat holds go straight to Postgres. What happens to the primary at noon?",
    candidate: "I would put a queue in front of the hold writes and drain it.",
    tool: "read_design · highlight Orders DB",
  },
  {
    phase: "Deep dive",
    title: "It runs a drill in the middle of the conversation",
    body: "When an answer needs proof, the interviewer runs a load or chaos drill on your design and discusses what came back: the latency, the errors, the node that gave way.",
    interviewer:
      "Let us test it. Forty thousand holds a second, and the replica fails at minute three.",
    candidate: "p99 held at 140 ms, but the queue backed up for a minute.",
    tool: "run_drill · on-sale spike",
  },
  {
    phase: "Wrap-up",
    title: "And it writes a review you can act on",
    body: "Every rubric item gets a score from 0 to 3 that cites the message, note or drill it rests on. Your skills move, and the next problem aims at the weakest one.",
    interviewer:
      "Strong on requirements and scaling. Reliability lost a point: nothing alerts when the queue grows.",
    candidate: "Fair. I would page on queue age, not depth.",
    tool: "note_evidence · end_interview",
  },
];

export const SCENARIOS = [
  {
    key: "normal",
    label: "A normal day",
    caption: "Steady traffic. The cache absorbs the reads and p99 stays flat.",
    latency: [62, 64, 61, 66, 63, 65, 62, 64, 63, 61, 64, 62],
    errors: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    faultFrom: null,
    faultTo: null,
    verdict: "Passed",
    p99: "66 ms",
    availability: "100%",
  },
  {
    key: "spike",
    label: "A link goes viral",
    caption:
      "Traffic triples in a minute. The autoscaler catches up just in time.",
    latency: [64, 66, 90, 142, 168, 150, 118, 96, 84, 76, 70, 66],
    errors: [0, 0, 0.2, 1.1, 1.8, 0.9, 0.3, 0, 0, 0, 0, 0],
    faultFrom: 2,
    faultTo: 6,
    verdict: "Flaky",
    p99: "168 ms",
    availability: "99.4%",
  },
  {
    key: "failover",
    label: "The primary fails",
    caption:
      "The database fails over. Writes error for twenty seconds, then recover.",
    latency: [63, 65, 64, 210, 380, 240, 120, 80, 70, 66, 64, 63],
    errors: [0, 0, 0, 6, 12, 4, 0.8, 0, 0, 0, 0, 0],
    faultFrom: 3,
    faultTo: 6,
    verdict: "Failed",
    p99: "380 ms",
    availability: "98.1%",
  },
] as const;

export const TEST_SUITES = [
  { name: "Functional", passed: 6, total: 6 },
  { name: "Load", passed: 3, total: 4, flaky: 1 },
  { name: "Faults", passed: 2, total: 3 },
  { name: "Chaos", passed: 7, total: 8 },
  { name: "Constraints", passed: 2, total: 2 },
] as const;

export const DDL = {
  postgres: `CREATE TABLE orders (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id bigint NOT NULL,
  status      order_status NOT NULL DEFAULT 'pending',
  total       numeric(12, 2) NOT NULL CHECK (total >= 0),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX orders_customer_created_idx
  ON orders (customer_id, created_at DESC);`,
  mysql: `CREATE TABLE orders (
  id          bigint NOT NULL AUTO_INCREMENT PRIMARY KEY,
  customer_id bigint NOT NULL,
  status      enum('pending','paid','shipped') NOT NULL DEFAULT 'pending',
  total       decimal(12, 2) NOT NULL CHECK (total >= 0),
  created_at  datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX orders_customer_created_idx
  ON orders (customer_id, created_at DESC);`,
  sqlite: `CREATE TABLE orders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers (id),
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'paid', 'shipped')),
  total       NUMERIC NOT NULL CHECK (total >= 0),
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);`,
} as const;

export const COST_LINES = [
  { label: "Orders DB · db.r6g.xlarge, Multi-AZ", usd: 691 },
  { label: "Orders service · 3 replicas", usd: 186 },
  { label: "Cache · cache.r6g.large", usd: 175 },
  { label: "Events · Kafka, 3 brokers", usd: 142 },
  { label: "Gateway · per request", usd: 58 },
] as const;

export const RANK_LADDER = [
  { name: "Junior", points: 0 },
  { name: "Middle", points: 100 },
  { name: "Senior", points: 300 },
  { name: "Staff", points: 600 },
  { name: "Principal", points: 1000 },
] as const;

export const AUTHORING_STEPS = [
  {
    title: "Draft",
    body: "Write the brief, drills, rubric and hints in a form drawn from the validator itself.",
  },
  {
    title: "Check",
    body: "The same checks that guard official problems run on yours, with every issue pointing at its field.",
  },
  {
    title: "Review",
    body: "A moderator approves it, sets the difficulty, or sends it back with feedback.",
  },
  {
    title: "Publish",
    body: "Others solve it, fork it into problems of their own, and climb the leaderboard on it.",
  },
] as const;

export const COMPARISON = [
  {
    topic: "Is the design actually tested?",
    whiteboard: "Someone nods",
    kaboom: "Load, faults and chaos on every submission",
  },
  {
    topic: "Feedback",
    whiteboard: "A feeling",
    kaboom: "A 0–3 score per rubric item, with evidence",
  },
  {
    topic: "Real products and limits",
    whiteboard: "Boxes and arrows",
    kaboom: "RDS, Redis, Kafka, Kubernetes, with their numbers",
  },
  {
    topic: "Cost",
    whiteboard: "Not discussed",
    kaboom: "Priced monthly at list prices",
  },
  {
    topic: "Available",
    whiteboard: "When a friend has time",
    kaboom: "Any time, as often as you like",
  },
] as const;

export const LANDING_QUESTIONS = [
  {
    question: "Who is Kaboom for?",
    answer:
      "Engineers preparing for system design, DevOps or data modelling interviews, and anyone who wants to see how a design behaves before building it. Problems range from easy to hard.",
  },
  {
    question: "Do I need to know AWS or Kubernetes already?",
    answer:
      "No. Every node explains what it is for, when to use it and its pitfalls, and the handbook covers the ideas behind the drills.",
  },
  {
    question: "How realistic is the simulation?",
    answer:
      "It models capacity, latency, replicas, caches, queues, connection pools, autoscaling, failover and partial failures, and runs each load test on twenty varied inputs so a design sized to the letter of the spec shows it.",
  },
  {
    question: "Is the AI interviewer always right?",
    answer:
      "No interviewer is. Every score in a review cites what it rests on, so you can check it, and the deterministic tests score submissions on their own.",
  },
  {
    question: "Can I use it for free?",
    answer:
      "Yes. Every problem and track is free, with a daily limit on mock interview time. Pro raises the limit.",
  },
  {
    question: "Can I write problems for others?",
    answer:
      "Yes. Draft a problem with its drills and rubric, pass the checks, and a moderator publishes it for everyone.",
  },
] as const;
