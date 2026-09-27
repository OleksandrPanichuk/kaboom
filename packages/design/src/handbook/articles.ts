import type { HandbookArticle } from "./schema";

export const caching: HandbookArticle = {
  slug: "caching",
  title: "Caching",
  summary:
    "Answer repeated reads from memory so the store behind them only sees what the cache misses.",
  kinds: ["cache", "cdn"],
  problems: ["url-shortener", "news-feed"],
  body: `A cache keeps copies of data that is read far more often than it changes. A read it can answer never reaches the store; a read it cannot answer, a **miss**, goes on to the store as if the cache were not there.

## What the numbers mean

- **Hit ratio** is the share of reads the cache answers. At 0.9, the store sees a tenth of the reads.
- The store still has to take every **write**, and every miss.
- A **CDN** is the same idea placed near the user, for responses that are the same for everyone.

## When the cache is empty

A cache that restarts or is flushed answers nothing for a while, and warms up again as reads fill it. In Kaboom a flushed cache drops to a hit ratio of 0 and recovers over a minute. Size the store for that minute, not only for a normal day's misses, or the flush becomes an outage.

## What it is not

A cache is not the system of record. Anything that exists only in the cache is lost when it restarts, and a value written to the store but not to the cache is read stale until it expires.`,
};

export const replication: HandbookArticle = {
  slug: "replication",
  title: "Replication and failover",
  summary:
    "Keep copies of a database on other machines, to spread its reads and to survive losing the primary.",
  kinds: ["sql-database", "nosql-database"],
  problems: ["url-shortener", "chat"],
  body: `A replica is a copy of a database that follows every change of the **primary**. Writes go to the primary only; reads can be spread over the primary and its replicas.

## Reads, not writes

Each replica adds read capacity. None adds write capacity: every write still lands on the one primary, and on every replica after it. When writes are the bottleneck, replicas do not help; **sharding** does, by splitting the data so that each primary holds part of it.

## Failover

When the primary is lost, a replica can be **promoted** to take its place. In Kaboom, automatic failover takes 30 seconds and manual failover 300; with no replica, or failover off, the data stays unreachable until the primary is back. The promoted replica is no longer a replica, so a design that had one is left with none.

## Where the copies live

A replica on the same machine, rack or region as the primary fails together with it. Keep at least one copy somewhere the primary's failure does not reach.`,
};

export const queues: HandbookArticle = {
  slug: "queues",
  title: "Queues and streams",
  summary:
    "Hand work to a queue so the caller answers at once, and let workers do it at their own pace.",
  kinds: ["queue", "stream", "worker"],
  problems: ["photo-uploads", "notifications", "news-feed"],
  body: `Some work does not need to finish before the user gets an answer: making thumbnails, sending an email, updating a hundred feeds. Put it on a queue and answer; **workers** take it from the queue and do it.

## Queue or stream

- A **work queue** gives each message to one worker. More workers drain it faster.
- An **event stream** keeps every message and lets each **consumer group** read all of them at its own pace: search indexing, notifications and analytics can all follow one stream.

## The backlog

When messages arrive faster than the workers take them, they wait: the backlog grows. That is the point of a queue during a burst. It is a problem only if the workers cannot keep up **on average**, because then the backlog never shrinks. Size the workers so that what piles up during a burst is gone before the next one.

## Decoupling

A caller that hands work to a queue does not wait for it and does not fail when it fails. A worker that cannot reach a third party grows a backlog instead of failing users.`,
};

export const backPressure: HandbookArticle = {
  slug: "back-pressure",
  title: "Back-pressure and rate limits",
  summary:
    "Turn away what a system cannot take, at once, so that what it does take stays fast.",
  kinds: ["rate-limiter", "api-gateway", "external-api"],
  problems: ["rate-limited-api", "notifications"],
  body: `A system that accepts more work than it can do does not do more work. It queues it, every request waits, and once callers give up waiting, everything fails at the timeout, including the requests it could have served.

## Saturation

In Kaboom a node serves up to 95 % of its capacity. Above that it serves only that much, fails the rest, and every request through it waits for the caller's timeout. One saturated database makes every path through it slow.

## Failing fast

A **rate limiter**, or a gateway with throttling on, lets through at most a set number of requests a second and turns the rest away **at once**. Those still fail for the user, but they fail fast and never reach what is behind the limiter. What gets through stays below saturation, and stays fast.

Pick the limit above a normal day's traffic and below what the weakest part behind it can take.

## Other people's limits

A third party enforces its own limit. Calls above it are refused however many servers you add, so size whatever calls it, usually workers behind a queue, to what it accepts.`,
};

export const idempotency: HandbookArticle = {
  slug: "idempotency",
  title: "Idempotency and running once",
  summary:
    "Make work safe to repeat, because retries, redeliveries and duplicate schedulers will repeat it.",
  kinds: ["scheduler", "coordination", "worker"],
  problems: ["notifications"],
  body: `Work gets repeated. A queue with **at-least-once** delivery hands a message out again when a worker crashes before acknowledging it. A client retries a request whose answer it never got. Two copies of a scheduler both fire at midnight.

## Idempotent work

An operation is **idempotent** when doing it twice has the same effect as doing it once. Setting a value is; adding to it is not. Give each piece of work an id and remember the ids already done, and a repeat becomes harmless.

## Running once

Some work must not run twice at all: a digest must go out once, not once per replica of the scheduler that sends it. Either run one replica, or let the replicas take a **lock** on a coordination service such as ZooKeeper or etcd, so that only the holder fires.

In Kaboom, a scheduler with several replicas and no lock sends every job once per replica. With a lock only one fires; with the lock service down none does, which is the safe way to fail.

## Quorum

A coordination service needs a majority of its members up. With one or two members, losing one stops every lock.`,
};

export const multiRegion: HandbookArticle = {
  slug: "multi-region",
  title: "Multiple regions",
  summary:
    "Run the system in more than one region, for users far apart and to survive losing a whole region.",
  kinds: ["dns"],
  problems: ["chat"],
  body: `A region is a group of data centres that can fail together: a power cut, a network partition, a bad deploy. Running in two regions lets the system survive one of them, and puts each user closer to one.

## Routing with DNS

**DNS** tells each client which region to use. With a latency policy it spreads users over the regions; with a failover policy it sends everyone to one and moves them when it fails. Clients keep the answer for its **TTL**: after a region fails, they keep going there until it runs out, and those requests fail.

## The price of distance

A call from one region to another takes longer, about 70 ms in Kaboom. Keep the request path inside one region where you can; a write that must reach a single primary in the other region pays the hop.

## Surviving the loss

For a region to take over, it must hold everything the request path needs: servers, streams, workers, and a copy of the data that can be promoted. Size each region to carry all the traffic, because after a failover it does.`,
};

export const HANDBOOK_ARTICLES: readonly HandbookArticle[] = [
  caching,
  replication,
  queues,
  backPressure,
  idempotency,
  multiRegion,
];
