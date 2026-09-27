import type { ProblemContentInput } from "../schema";
import { edge, graph, node } from "./build";

const users = () =>
  node("users", "client", "Users", { rps: 5_500, readRatio: 0.9 });

export const photoUploads: ProblemContentInput = {
  slug: "photo-uploads",
  title: "Photo upload pipeline",
  track: "system-design",
  difficulty: "medium",
  tags: ["queues", "async", "cdn", "autoscaling"],
  summary:
    "Accept photo uploads, make thumbnails in the background, and serve every photo quickly.",
  statement: `Design the photo side of a social app.

**What it does**

- A user uploads a photo; the upload must succeed even when thumbnails are slow to make.
- Every photo gets thumbnails, made in the background after the upload.
- Anyone can view any photo.

**How it is used**

- 5,500 requests a second: 90 % are views, 10 % uploads.
- An event can triple the traffic for two minutes.
- Making the thumbnails of one photo takes a worker about 200 ms, and one worker handles 5 photos a second.
- Views should answer within 300 ms at p99, and 99.9 % of requests must succeed.

**What to watch**

- Uploads and thumbnails should not wait on each other.
- Work that piles up during a burst or an outage has to be done eventually.

The *Users* client is already on the canvas. Build what it talks to.`,
  baseline: graph([users()]),
  drills: [
    {
      id: "normal-day",
      title: "A normal day",
      description: "5,500 requests a second for five minutes.",
      visibility: "public",
      durationSeconds: 300,
      slo: { p99Ms: 300, availability: 0.999 },
      expect: {
        maxP99Ms: 300,
        minAvailability: 0.999,
        maxEndBacklog: 1_000,
        forbid: ["errors"],
      },
    },
    {
      id: "event-burst",
      title: "An event triples the traffic",
      description:
        "Traffic triples for two minutes; the backlog it leaves must be worked off by the end.",
      visibility: "public",
      durationSeconds: 600,
      traffic: [
        { at: 60, multiplier: 3 },
        { at: 180, multiplier: 1 },
      ],
      slo: { p99Ms: 400, availability: 0.99 },
      expect: { maxP99Ms: 400, minAvailability: 0.99, maxEndBacklog: 1_000 },
    },
    {
      id: "workers-down",
      title: "The thumbnail workers stop",
      visibility: "hidden",
      durationSeconds: 600,
      faults: [
        {
          kind: "node-down",
          select: { nodeKind: "worker" },
          at: 60,
          until: 180,
        },
      ],
      expect: { minAvailability: 0.999, maxEndBacklog: 1_000 },
    },
    {
      id: "cdn-flush",
      title: "The CDN loses its cache",
      visibility: "hidden",
      durationSeconds: 300,
      faults: [{ kind: "cache-flush", select: { nodeKind: "cdn" }, at: 60 }],
      slo: { p99Ms: 500, availability: 0.99 },
      expect: { maxP99Ms: 500, minAvailability: 0.99 },
    },
  ],
  rubric: [
    {
      key: "handles-a-normal-day",
      title: "Handles a normal day within the SLO",
      weight: 30,
      check: { check: "drill-passes", drillId: "normal-day" },
    },
    {
      key: "absorbs-a-burst",
      title: "Absorbs a burst and catches up",
      weight: 20,
      check: { check: "drill-passes", drillId: "event-burst" },
    },
    {
      key: "keeps-uploads-up-without-workers",
      title: "Keeps uploads working while the workers are down",
      weight: 20,
      check: { check: "drill-passes", drillId: "workers-down" },
    },
    {
      key: "survives-a-cdn-flush",
      title: "Survives a cold CDN",
      weight: 10,
      check: { check: "drill-passes", drillId: "cdn-flush" },
    },
    {
      key: "no-single-point-of-failure",
      title: "Has no single point of failure",
      weight: 10,
      check: { check: "no-lint", lint: "spof-critical-path" },
    },
    {
      key: "makes-thumbnails-asynchronously",
      title: "Makes thumbnails through a queue",
      weight: 10,
      check: { check: "has-node-kind", nodeKind: "queue" },
    },
  ],
  hints: [
    {
      title: "What does the uploader wait for?",
      body: "Making thumbnails takes 200 ms a photo. If the upload waits for it, a slow worker makes every upload slow.",
      cost: 5,
    },
    {
      title: "Hand the work over",
      body: "Store the photo, put a message on a queue, and let workers make the thumbnails in the background. The upload answers as soon as the photo is stored.",
      cost: 10,
    },
    {
      title: "Serve views from the edge",
      body: "Views are most of the traffic and never change. A CDN in front of object storage answers them close to the user and keeps the origin quiet during an event.",
      cost: 15,
    },
  ],
  reference: {
    notes:
      "Views go through a CDN to object storage. Uploads hit a stateless API that writes the original and enqueues a thumbnail job; autoscaled workers drain the queue and write the thumbnails. The queue keeps uploads fast through bursts and worker outages, and the workers have headroom to catch up.",
    graph: graph(
      [
        users(),
        node("cdn", "cdn", "Photo CDN", {
          hitRatio: 0.9,
          capacityRps: 100_000,
        }),
        node("lb", "load-balancer", "Upload balancer"),
        node("api", "service", "Upload API", {
          replicas: 6,
          capacityRpsPerReplica: 500,
        }),
        node("store", "object-storage", "Photo store", {
          readCapacityRps: 10_000,
          writeCapacityRps: 10_000,
        }),
        node("jobs", "queue", "Thumbnail jobs"),
        node("workers", "worker", "Thumbnail workers", {
          replicas: 150,
          capacityMsgPerReplica: 5,
          processingMs: 200,
          autoscale: {
            enabled: true,
            min: 150,
            max: 600,
            targetUtilisation: 0.7,
          },
        }),
      ],
      [
        edge("users", "cdn", "read"),
        edge("cdn", "store", "read"),
        edge("users", "lb", "write"),
        edge("lb", "api", "sync-call"),
        edge("api", "store", "write"),
        edge("api", "jobs", "async-message"),
        edge("jobs", "workers", "async-message"),
        edge("workers", "store", "write"),
      ],
    ),
  },
};
