import {
  siApachecassandra,
  siApachekafka,
  siCloudflare,
  siDocker,
  siElasticsearch,
  siGithubactions,
  siGrafana,
  siHelm,
  siKubernetes,
  siMongodb,
  type SimpleIcon,
  siMysql,
  siNginx,
  siPostgresql,
  siPrometheus,
  siRabbitmq,
  siRedis,
  siSqlite,
  siTerraform,
} from "simple-icons";

export const STACK_ICONS: readonly SimpleIcon[] = [
  siPostgresql,
  siRedis,
  siApachekafka,
  siKubernetes,
  siNginx,
  siMongodb,
  siRabbitmq,
  siDocker,
  siTerraform,
  siPrometheus,
  siGrafana,
  siMysql,
  siElasticsearch,
  siGithubactions,
  siHelm,
  siSqlite,
  siApachecassandra,
  siCloudflare,
];

export const TRACKS = [
  {
    key: "system-design",
    title: "System design",
    blurb:
      "Services, caches, queues and databases under real traffic, real faults and a budget.",
    problems: [
      "URL shortener",
      "News feed",
      "Team chat across regions",
      "Card payments that retry with care",
    ],
  },
  {
    key: "devops",
    title: "DevOps",
    blurb:
      "Rollouts, probes, autoscaling, pipelines and networks that page you before your users do.",
    problems: [
      "Zero-downtime deploys",
      "p99 doubled after a deploy",
      "Rotate a database password",
      "VPC for a three-tier app",
    ],
  },
  {
    key: "data-model",
    title: "Data modelling",
    blurb:
      "Tables, keys, indexes and documents, checked against the queries your data has to answer.",
    problems: [
      "Blog with tags",
      "Orders for an online shop",
      "Chat messages in MongoDB",
      "Meeting rooms for many companies",
    ],
  },
] as const;

export const STEPS = [
  {
    title: "Pick a problem",
    body: "A brief, a traffic profile and a rubric. Start it as a challenge, or as a live interview.",
  },
  {
    title: "Draw the design",
    body: "Drag in services, caches, queues and databases, pick real products, and wire them up.",
  },
  {
    title: "Run it, break it",
    body: "Load tests on twenty varied runs, chaos drawn from your own design, and a review per skill.",
  },
] as const;

export const FACTS = [
  { value: "3", label: "tracks: system design, DevOps and data modelling" },
  { value: "20", label: "varied runs behind every load test" },
  { value: "0–3", label: "scored per rubric item, each with its evidence" },
] as const;
