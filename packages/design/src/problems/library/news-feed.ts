import type { ProblemContentInput } from "../schema";
import { edge, graph, node } from "./build";

const members = () =>
  node("members", "client", "Members", { rps: 30_000, readRatio: 0.97 });

export const newsFeed: ProblemContentInput = {
  slug: "news-feed",
  title: "News feed",
  track: "system-design",
  difficulty: "medium",
  tags: ["fan-out", "caching", "search", "change-data-capture"],
  summary:
    "Show every member a feed of what the people they follow posted, and let them search it.",
  statement: `Design the home feed of a social network.

**What it does**

- A member opens the app and sees the latest posts of everyone they follow.
- A member writes a post; their followers see it in their feeds soon after.
- Members can search posts by their words.

**How it is used**

- 30,000 requests a second: 97 % read, 3 % are new posts.
- Of the reads, 90 % open a feed and 10 % search.
- A member has about 100 followers, so each post lands in 100 feeds.
- Assembling a feed from scratch reads about 20 posts.
- A feed should open within 200 ms at p99, and 99.9 % of requests must succeed.
- A big event can double the traffic for a few minutes.

**What to watch**

- Building feeds when they are read multiplies every read; building them when posts are written multiplies every post.
- A post must not fail because search is down, and search may be a few seconds behind.

The *Members* client is already on the canvas. Build what it talks to.`,
  baseline: graph([members()]),
  drills: [
    {
      id: "normal-day",
      title: "A normal day",
      description:
        "30,000 requests a second for five minutes. Posts must reach every feed by the end.",
      visibility: "public",
      durationSeconds: 300,
      slo: { p99Ms: 200, availability: 0.999 },
      expect: { maxP99Ms: 200, minAvailability: 0.999, maxEndBacklog: 0 },
    },
    {
      id: "big-event",
      title: "A big event",
      description:
        "Traffic doubles for three minutes. Feeds stay fast, and the posts it brings reach every feed by the end.",
      visibility: "public",
      durationSeconds: 600,
      traffic: [
        { at: 60, multiplier: 2 },
        { at: 240, multiplier: 1 },
      ],
      slo: { p99Ms: 300, availability: 0.99 },
      expect: { maxP99Ms: 300, minAvailability: 0.99, maxEndBacklog: 0 },
    },
    {
      id: "feed-cache-flush",
      title: "The feed cache is emptied",
      visibility: "hidden",
      durationSeconds: 300,
      faults: [{ kind: "cache-flush", select: { nodeKind: "cache" }, at: 60 }],
      slo: { p99Ms: 200, availability: 0.999 },
      expect: { endAvailability: 0.999 },
    },
    {
      id: "search-down",
      title: "Search goes down",
      visibility: "hidden",
      durationSeconds: 300,
      faults: [
        {
          kind: "node-down",
          select: { nodeKind: "search-index" },
          at: 60,
          until: 240,
        },
      ],
      slo: { p99Ms: 200, availability: 0.89 },
      expect: { minAvailability: 0.89 },
    },
  ],
  rubric: [
    {
      key: "handles-a-normal-day",
      title: "Serves a normal day within the SLO",
      weight: 25,
      check: { check: "drill-passes", drillId: "normal-day" },
    },
    {
      key: "handles-a-big-event",
      title: "Keeps up with a big event",
      weight: 20,
      check: { check: "drill-passes", drillId: "big-event" },
    },
    {
      key: "recovers-from-an-empty-cache",
      title: "Recovers when the feed cache is emptied",
      weight: 10,
      check: { check: "drill-passes", drillId: "feed-cache-flush" },
    },
    {
      key: "posts-without-search",
      title: "Keeps feeds and posts working while search is down",
      weight: 10,
      check: { check: "drill-passes", drillId: "search-down" },
    },
    {
      key: "offers-search",
      title: "Offers search from an index",
      weight: 5,
      check: { check: "has-node-kind", nodeKind: "search-index" },
    },
    {
      key: "feeds-the-index-from-the-store",
      title: "Feeds the index from the store, not by writing twice",
      weight: 10,
      check: { check: "no-lint", lint: "dual-write" },
    },
    {
      key: "fans-out-in-the-background",
      title: "Fans posts out in the background",
      weight: 10,
      check: { check: "no-lint", lint: "sync-fan-out" },
    },
    {
      key: "no-single-point-of-failure",
      title: "Has no single point of failure",
      weight: 10,
      check: { check: "no-lint", lint: "spof-critical-path" },
    },
  ],
  reference: {
    notes:
      "Feeds are built when posts are written: the API stores each post and appends it to a stream, and fan-out workers write it into 100 cached feeds. Opening a feed is one cache read; a miss rebuilds the feed from 20 posts. The posts store's change feed keeps the search index up to date, so a post never waits on search. Sized for twice the usual traffic: 60,000 feed reads and 180,000 feed writes a second at the peak.",
    graph: graph(
      [
        members(),
        node("lb", "load-balancer", "Load balancer", { capacityRps: 100_000 }),
        node("api", "service", "Feed API", {
          replicas: 30,
          capacityRpsPerReplica: 2_500,
        }),
        node("feeds", "cache", "Feed cache", {
          hitRatio: 0.95,
          readCapacityRps: 100_000,
          writeCapacityRps: 250_000,
        }),
        node("posts", "nosql-database", "Posts", {
          partitions: 24,
          readCapacityPerPartition: 3_000,
          writeCapacityPerPartition: 1_000,
        }),
        node("search", "search-index", "Post search"),
        node("events", "stream", "New posts"),
        node("fanout", "worker", "Fan-out", {
          replicas: 6,
          capacityMsgPerReplica: 500,
        }),
      ],
      [
        edge("members", "lb", "sync-call"),
        edge("lb", "api", "sync-call"),
        edge("api", "feeds", "read", { share: 0.9 }),
        edge("api", "search", "read", { share: 0.1 }),
        edge("api", "posts", "write"),
        edge("feeds", "posts", "read", { fanOut: 20 }),
        edge("api", "events", "write"),
        edge("posts", "search", "change-feed"),
        edge("events", "fanout", "async-message"),
        edge("fanout", "feeds", "write", { fanOut: 100 }),
      ],
    ),
  },
};
