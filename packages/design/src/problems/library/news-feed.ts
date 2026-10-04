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
      weight: 20,
      check: { check: "drill-passes", drillId: "normal-day" },
    },
    {
      key: "handles-a-big-event",
      title: "Keeps up with a big event",
      weight: 15,
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
      check: {
        check: "serves-reads",
        drillId: "normal-day",
        nodeKind: "search-index",
        minShare: 0.09,
      },
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
      weight: 5,
      check: { check: "no-lint", lint: "spof-critical-path" },
    },
    {
      key: "survives-unseen-faults",
      title: "Survives faults drawn from the design itself",
      weight: 15,
      check: { check: "chaos-coverage", min: 1 },
    },
  ],
  interview: {
    opening:
      "Hi! Let's design the home feed of a social network. Before you draw anything: what would you like to know about how people use it?",
    facts: [
      {
        topic: "Traffic",
        answer:
          "About 30,000 requests a second: 97 % are reads and 3 % are new posts. Of the reads, 90 % open a feed and 10 % search. A big event can double it for a few minutes.",
      },
      {
        topic: "Followers",
        answer:
          "A member has about 100 followers. A handful of celebrities have millions; say how you would treat them, but the design only has to carry the typical member.",
      },
      {
        topic: "Feed order and length",
        answer:
          "Newest first, no ranking. A feed shows the latest 500 posts of the people you follow.",
      },
      {
        topic: "Freshness",
        answer:
          "A post should show up in its followers' feeds within a few seconds. Search may lag behind by a few seconds as well.",
      },
      {
        topic: "Posts",
        answer:
          "Text of up to about 1 KB. Images live elsewhere and are out of scope. Posts are kept forever.",
      },
      {
        topic: "Search",
        answer:
          "Members search posts by their words. Posting must never fail or slow down because search is having trouble.",
      },
      {
        topic: "Latency and availability",
        answer:
          "A feed opens within 200 ms at p99, and 99.9 % of requests must succeed. One region is fine for this interview.",
      },
    ],
    phases: [
      {
        id: "requirements",
        minutes: 5,
        goal: "Agree on the feed's order, freshness and traffic, and on what search must never break.",
      },
      {
        id: "high-level",
        minutes: 15,
        goal: "A design that serves feed reads, posts and search end to end, with its data model.",
      },
      {
        id: "deep-dive",
        minutes: 15,
        goal: "Choose between building feeds on write and on read, keep up with a big event, and keep posting alive while search is down.",
      },
      {
        id: "wrap-up",
        minutes: 5,
        goal: "Summarise the design, the fan-out trade-off and what changes for celebrities.",
      },
    ],
    rubric: [
      {
        key: "clarifies-requirements",
        dimension: "requirements",
        title: "Clarifies the requirements before designing",
        signals: [
          "Asks about the read to write ratio and the number of followers",
          "Asks how fresh and how ordered a feed must be",
          "States which requirements they are designing for",
        ],
        weight: 10,
      },
      {
        key: "estimates-the-fan-out",
        dimension: "requirements",
        title: "Estimates the load, including the fan-out",
        signals: [
          "Turns the traffic into feed reads and posts a second",
          "Multiplies posts by followers to size the fan-out",
          "Uses the numbers to choose between push and pull",
        ],
        weight: 10,
      },
      {
        key: "designs-the-core",
        dimension: "design",
        title: "Designs the read path, the write path and the data model",
        signals: [
          "Separates opening a feed from writing a post",
          "Chooses stores for posts and for feeds, and says why",
          "Explains building feeds on write against building them on read",
        ],
        weight: 20,
      },
      {
        key: "fans-out-in-the-background",
        dimension: "scaling",
        title: "Fans posts out in the background and caches feeds",
        signals: [
          "Writes posts into feeds from workers behind a stream or queue, not while the author waits",
          "Keeps feeds in a cache sized for the peak",
          "Plans for the backlog a big event creates",
        ],
        weight: 20,
      },
      {
        key: "decouples-search",
        dimension: "reliability",
        title: "Keeps posting and reading alive when parts fail",
        signals: [
          "Feeds the search index from the store's change feed instead of writing twice",
          "Explains what members see while search is down",
          "Removes single points of failure from the feed path",
        ],
        weight: 20,
      },
      {
        key: "communicates",
        dimension: "communication",
        title: "Explains trade-offs and responds to challenges",
        signals: [
          "Thinks aloud and keeps the design and the explanation in step",
          "Names the trade-off behind each choice",
          "Changes the design when a drill or a question shows a problem",
        ],
        weight: 20,
      },
    ],
    drillIds: ["normal-day", "big-event", "search-down"],
  },
  hints: [
    {
      title: "Build feeds once, not on every read",
      body: "Assembling a feed from 20 posts on every read multiplies 29,000 reads a second by 20. Posts are written 30 times less often than feeds are read.",
      cost: 5,
    },
    {
      title: "Fan out when a post is written",
      body: "Keep each member's feed in a cache and write every new post into its followers' feeds. Do the writing in workers behind a stream, not while the author waits.",
      cost: 10,
    },
    {
      title: "Keep search off the write path",
      body: "Feed the search index from the posts store's change feed. Then a post never fails because search is down, and search catches up by itself.",
      cost: 15,
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
          replicas: 42,
          capacityRpsPerReplica: 2_500,
        }),
        node("feeds", "cache", "Feed cache", {
          hitRatio: 0.95,
          readCapacityRps: 120_000,
          writeCapacityRps: 300_000,
        }),
        node("posts", "nosql-database", "Posts", {
          partitions: 30,
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
        edge("lb", "api", "sync-call", { retries: 1 }),
        edge("api", "feeds", "read", { retries: 1, share: 0.9 }),
        edge("api", "search", "read", { retries: 1, share: 0.1 }),
        edge("api", "posts", "write", { retries: 1 }),
        edge("feeds", "posts", "read", { retries: 1, fanOut: 20 }),
        edge("api", "events", "write", { retries: 1 }),
        edge("posts", "search", "change-feed"),
        edge("events", "fanout", "async-message"),
        edge("fanout", "feeds", "write", { retries: 1, fanOut: 100 }),
      ],
    ),
  },
};
