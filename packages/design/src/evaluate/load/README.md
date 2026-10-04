# Load evaluator

`evaluateLoad(graph, scenario)` runs a design under a traffic scenario, step by
step, and answers what every node receives, how busy it is, how long a hop
takes, what fails, and which findings follow. It is deterministic: the same
graph and scenario always give the same numbers, and every number a finding
quotes is in its `data`.

These are the rules. Each one is pinned by a test in `load.test.ts` or a
golden fixture in `golden.test.ts`; change a rule here and in its test in the
same pull request.

## Scenario

| Field             | Default                         | Meaning                                                                                                                                      |
| ----------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `stepSeconds`     | 10                              | Length of one step                                                                                                                           |
| `durationSeconds` | 600                             | Length of the run; steps = duration / step                                                                                                   |
| `traffic`         | `[]`                            | Piecewise-constant multiplier on every client's `rps`: `{ at, multiplier }` holds from `at` seconds until the next entry. 1 before the first |
| `faults`          | `[]`                            | Events, below                                                                                                                                |
| `slo`             | p99 300 ms, availability 99.9 % | Targets `slo-breach` compares against                                                                                                        |

## Traffic

- Every node carries **two channels**, reads/s and writes/s.
- A client emits `rps × multiplier × readRatio` reads and the rest as writes.
- A scheduler emits writes (jobs) on its own clock, not the traffic
  multiplier: `jobsPerSecond × firing × share of the step inside a burst`,
  where a burst of `burstSeconds` starts every `everySeconds` from 0. `firing`
  is `replicas` without a `lock` edge, 1 with one to an up coordination
  service, and 0 when every service it locks on is down.
- An edge carries a channel by kind: `read` edges carry reads only, `write`
  edges writes only, `sync-call` and `async-message` both, `change-feed` writes
  only. `replication`, `lock`, `mounts`, `scales` and `watches` carry none.
- A database forwards its served **writes** on its `change-feed` edges and
  nothing on any other edge. A change feed is asynchronous: what is behind it
  adds no latency and no errors to the writer.
- How a node's **forwarded** channel is split over the outgoing edges that
  carry it depends on the node kind's `distribution`:
  - `by-share`: each edge gets `share × fanOut` of it;
  - `evenly` (load balancer, Kubernetes service): split evenly over the edges to **up** targets,
    times `fanOut`; `share` is ignored. A balancer without health checks
    keeps sending to targets that are down;
  - `broadcast` (stream): each edge gets all of it, times `fanOut`; every
    outgoing edge is a consumer group.
  - `routed` (DNS): see _Regions_.

## Topology

- The load subgraph is every edge but `replication`, `lock` and the control
  edges `mounts`, `scales` and `watches`. It is acyclic, which
  `applyOps` guarantees, and nodes are evaluated in its topological order.
- A `replication` edge primary → replica declares the replica. It carries no
  load; the primary spreads its reads over itself and its up replicas.
- A `lock` edge from a scheduler to a coordination service carries no load
  either; it only decides how many of the scheduler's replicas fire.
- A `scales` edge from a pod autoscaler to a deployment declares its autoscaling
  (_Autoscaling_). `mounts` and `watches` change nothing here.
- A pod autoscaler, a config map, a secret and an alert serve no traffic:
  `applyOps` lets no load edge touch them, so they receive nothing.

## Node behaviour

`λ` is what a node receives, reads plus writes, and `capacity` what it can
serve. A node that is down serves nothing, forwards nothing and fails every
request it receives.

| Kind                          | Capacity                                                                                                        | Forwards                                                               |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `client`                      | unbounded                                                                                                       | what it emits                                                          |
| `service`, `k8s-deployment`   | `replicas × capacityRpsPerReplica`                                                                              | what it serves                                                         |
| `worker`                      | `replicas × capacityMsgPerReplica`                                                                              | what it serves                                                         |
| `load-balancer`, `cdn`        | `capacityRps`                                                                                                   | balancer: what it serves; CDN: `reads × (1 − hitRatio)` and all writes |
| `api-gateway`, `rate-limiter` | `capacityRps`                                                                                                   | what it serves, by share                                               |
| `ingress`                     | `capacityRps`                                                                                                   | what it serves, by share                                               |
| `k8s-service`                 | unbounded                                                                                                       | what it serves, evenly over its up targets                             |
| `external-api`                | unbounded, behind its rate limit                                                                                | nothing                                                                |
| `cache`                       | reads against `readCapacityRps`, writes against `writeCapacityRps`                                              | `reads × (1 − hitRatio)` and all writes, to whatever it connects to    |
| `sql-database`                | writes: `writeCapacityRps × shards`, on the primary only; reads: `readCapacityRps × shards × (1 + up replicas)` | its writes, on `change-feed` edges                                     |
| `nosql-database`              | `partitions × readCapacityPerPartition` and `partitions × writeCapacityPerPartition`                            | its writes, on `change-feed` edges                                     |
| `object-storage`              | `readCapacityRps` and `writeCapacityRps`                                                                        | nothing                                                                |
| `dns`                         | unbounded                                                                                                       | see _Regions_                                                          |
| `search-index`                | reads: `shards × replicas × queryCapacityPerCopy`; writes: `shards × indexCapacityPerShard`                     | nothing                                                                |
| `scheduler`, `coordination`   | unbounded                                                                                                       | scheduler: what it emits; coordination: nothing                        |
| `queue`                       | `capacityMsgPerSecond` accepted                                                                                 | see _Backlog_                                                          |
| `stream`                      | `capacityMsgPerSecond` accepted                                                                                 | see _Backlog_                                                          |

For a node with separate read and write capacities, `ρ = max(reads / read
capacity, writes / write capacity)`; otherwise `ρ = λ / capacity`. Replica
nodes report their primary's read utilisation.

**Throttling.** A rate limiter, a gateway with throttling enabled and an
external API (its `rateLimitRps`, scaled by a `capacity` fault) admit at most
their limit and turn the rest away before anything else happens:
`admitted = λ × min(1, limit / λ)`. What is turned away is an error, but it
fails at once: `ρ` and latency are computed on what was admitted, so a
limiter keeps the requests it lets through fast while the ones behind it stay
below saturation. The step reports it as `throttled` (req/s).

**Saturation.** Up to `ρ = 0.95` a node serves everything. Above it, it serves
`0.95 × capacity` of each channel in proportion, and the rest is an error
(nothing forwards it downstream).

## Latency and errors

Per node, per step:

- **p50** = `baseLatencyMs / (1 − ρ)` and **p99** = `p50 × (1 + ρ)` below
  `ρ = 0.95`. At or above it, or when the node is down, both are pinned at the
  largest `timeoutMs` of its inbound edges (1000 ms without one): a caller
  waits no longer than it is willing to. A worker's base is `processingMs`;
  clients, queues, streams and Kubernetes services add none.
- **Own error rate**: 1 when down; otherwise `1 − admitted × served × (1 −
intrinsic)`, where `admitted` is the throttling fraction, `served` the
  saturation fraction, and `intrinsic` an external API's `errorRate` (0 for
  every other kind). A client that connects to nothing has nobody to answer it, so
  every request it sends fails.
- **Error rate** = `own + (1 − own) × downstream`, where `downstream` weighs
  each outgoing `sync-call`, `read` or `write` edge by `w`, the share of the
  node's served requests that take it. When the weights sum to at most 1 the
  node splits its requests (a balancer, reads and writes to one database),
  and `downstream = Σ w × error rate of the target`. When they sum to more,
  it fans out and every request makes several calls, and `downstream = 1 − Π
(1 − min(1, w) × error rate)`. Async edges decouple: a failing consumer
  grows a backlog, never upstream errors.

Per client, per step: **p50 / p99** is the largest sum of hop latencies along
a synchronous path from it; **availability** = `1 − error rate`; **served** =
emitted × availability.

## Regions

A node belongs to the region of the nearest `region` group around it; a node
in no group is in none.

- A synchronous edge between two nodes in **different** regions adds
  `CROSS_REGION_MS` (70 ms) to the path latency of every request that takes
  it. An edge with an end in no region adds nothing, so a client outside
  every region pays no hop to reach one.
- `dns` forwards over its **routable** targets: a target that is up, or one
  that went down less than `ttlSeconds` ago, since clients keep the answer
  they cached. With `latency` it splits by `share`, renormalised over the
  routable targets; with `failover` everything goes to the routable target
  with the largest `share`. Traffic sent to a target that is down fails, so
  a lost region costs its share of requests for one TTL.

## Backlog

A queue drains up to what its consumers can take: the sum over its outgoing
edges of each up target's capacity at the saturation limit (`0.95 ×
capacity`). Each step, `drained = min(backlog / stepSeconds + in, consumer
capacity)` and `backlog += (in − drained) × stepSeconds`. Consumers compete,
so what it drains is split over them in proportion to their capacity, not by
share. Messages beyond `capacityMsgPerSecond` are refused and count as the
queue's errors.

A stream does the same **per consumer group**: each outgoing edge has its own
backlog (its lag), drained by that edge's target alone.

## Time and faults

A step runs, in order:

1. fault onsets and ends, failover timers, and rollouts;
2. autoscaler decisions taken on the previous step;
3. load propagation;
4. utilisation, latency and errors;
5. backlog;
6. findings.

A fault is an event with `at` and an optional `until`, in seconds, applied at
onset and undone at its end.

| Fault             | Effect                                                                                                                                                                                                                                                                            |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node-down`       | the node is down. A SQL primary with `failover` `automatic` recovers 30 s later, `manual` 300 s later, if it has at least one replica outside every region that is down; one replica is then spent on the promotion. With `none`, or no such replica, it stays down until `until` |
| `region-down`     | every node in the group `groupId`, or in a group inside it, is down, as if each had its own `node-down`; a SQL primary among them fails over the same way                                                                                                                         |
| `capacity`        | the node's capacity is multiplied by `factor`                                                                                                                                                                                                                                     |
| `latency`         | `addMs` is added to the node's base latency                                                                                                                                                                                                                                       |
| `cache-flush`     | the cache's hit ratio drops to 0 and recovers linearly over 60 s                                                                                                                                                                                                                  |
| `rollout`         | a deployment starts replacing its pods with the version `release`, from the first step at or after `at`; see _Rollouts_. It has no `until`. Rollouts follow one another: a later one starts once the one under way has finished, stalled or rolled back                           |
| `error-rate`      | the node fails `rate` of the requests it serves, on top of anything else                                                                                                                                                                                                          |
| `group-down`      | every node in the group `groupId`, of any kind, or in a group inside it, is down, as `region-down` is for a region                                                                                                                                                                |
| `partition`       | every edge with exactly one end inside the group `groupId` is cut; see _Partitions and retries_                                                                                                                                                                                   |
| `secret-rotation` | the secret `nodeId` gets a new value at `at`; see _Secrets and migrations_                                                                                                                                                                                                        |

**Autoscaling.** A service or worker with autoscaling enabled that stays above
its `targetUtilisation` for two consecutive steps gains `ceil(replicas × 0.5)`
replicas, up to `max`, counted from the next step. It never scales down.
A deployment does the same with the `min`, `max` and `targetUtilisation` of the
pod autoscaler that `scales` it, and starts at its `replicas` held between that
`min` and `max`. The autoscaler holds still while a rollout is under way; once it has stalled, the pods the autoscaler adds are of the old version and serve alongside what it kept.

## Rollouts

A rollout replaces a deployment's `N` pods, its replica count when the rollout
starts, with pods of a new version. A new pod is **ready** `startupSeconds`
after it is created. A `release` is one of:

- `healthy`: the new pods serve like the old ones;
- `never-ready`: the new pods never answer. With `readinessProbe` they are
  never ready. Without one they count as ready anyway, take their share of
  traffic and fail all of it;
- `broken`: the new pods pass every check and fail every request;
- `slow`: the new pods answer every request, but each takes `SLOWDOWN` (2)
  times as long, so a pod also serves half as many;
- `deadlocks`: the new pods serve normally for `DEADLOCK_AFTER_SECONDS`
  (300) after they are ready, then hang. A hung pod still passes its
  readiness check, which is shallow, so it stays ready and fails every
  request it is sent. Without `livenessProbe` it hangs for good. With one,
  it is restarted `LIVENESS_DETECT_SECONDS` (30) after it hangs, waits a
  back-off of 10 s doubled on every restart up to 300 s, starts again,
  and serves for another 300 s. A pod waiting or starting is not ready.

The Kubernetes service spreads requests evenly over **serving** pods: the old
pods and the ready new ones. A blue-green deployment serves from the old set
until it switches. The deployment's capacity is `serving × capacityRpsPerReplica`,
and its own error rate adds the share of serving pods that fail. Slow pods
cut the capacity by half their share of the serving pods. They double the
base latency behind p99 once more than 1 % of the serving pods are slow,
since one request in a hundred is enough to move p99, and behind p50 once
half of them are. Each step, by `strategy`:

- `rolling`: first remove old pods while the old and ready new pods together
  stay at least `N − maxUnavailable`. Then create new pods while every pod
  together stays at most `N + maxSurge` and the new ones at most `N`. With
  both at 0 it never moves.
- `recreate`: remove every old pod on the first step and create `N` new ones.
- `blue-green`: create `N` new pods on the first step. Once all are ready,
  remove the old ones, which switches every request to the new set at once.
- `canary`: create one new pod. A canary that fails, answers slowly or has
  been restarted is removed and the rollout is **rolled back**: the old
  pods keep serving. A canary that hangs only after `canarySeconds` is
  never caught this way.
  One that serves cleanly for `canarySeconds` after it is ready lets the rest
  follow as `rolling`.

A rollout is **complete** once no old pod is left and all `N` new pods are
ready. One that is neither complete nor rolled back `progressDeadlineSeconds`
after it began is **stalled**. It keeps what it has, as Kubernetes does, and
neither rolls back nor goes on. Each step reports the deployment's `rollout`:
its phase, its old, ready, starting, failing and slow pods, and how often
its new pods have been restarted.

## Partitions and retries

**Partition.** A cut edge delivers nothing: its target receives none of its
load, though both ends stay up. A synchronous call over it fails, at its
`timeoutMs`; a queue cannot hand messages to a consumer across it, so its
backlog grows; a producer cannot enqueue across it, which fails the
producer's request. A load balancer that health-checks drops a target it
cannot reach, and DNS stops routing to one `ttlSeconds` after the cut, as
it does for a target that is down. A load balancer left with no target it
can reach fails every request it cannot forward. A call that retries over a
cut waits out `timeoutMs` once per attempt. A node with no capacity at all,
such as a deployment with no pod ready yet, reports a utilisation of 10
(1000 %) rather than infinity, so a saved run stays finite; any other
overload is reported as it is. A partition is not an outage:
it promotes no replica, and a `monitoring` node still scrapes across it.
In a drill, a selected node in no group is cut off on its own, as
`node-down`.

**Retries.** A synchronous edge's `retries` repeats a failed call. A
target's error rate `e` has a lasting part `p`, the calls that fail however
often they are made: those of a node that is down, over a cut, or that need
a dependency that is down. The rest, saturation and flaky faults, fail at
random, at a rate `t = (e - p) / (1 - p)` among the calls that could
succeed. The caller sees `p + (1 - p) t^(retries + 1)` fail, and sends
`1 + Σ (p + (1 - p) t^k)` for `k` from 1 to `retries` times the load, from
the target's rates on the step before, so a storm builds over steps. The
lasting part travels upstream with the error it explains, so a retry
further up does not rescue a request a dead dependency fails. Once
more than 1 % of calls fail, p99 through the edge doubles, as one retry
lands inside it, and p50 does too past half. A cut edge counts as failing
every call. An edge whose load grows by half or more raises `retry-storm`.

## Secrets and migrations

**Rotation.** A secret's old value stops working `overlapSeconds` after a
rotation. Every deployment that `mounts` the secret then depends on how its
pods read it, by `secretDelivery`:

- `volume`: the kubelet refreshes the mounted file, so every pod has the new
  value 60 s after the rotation. Between the revocation and that refresh,
  every pod fails every request.
- `env` with `restartOnSecretChange`: the change starts a rollout of a healthy
  version, by the deployment's strategy. New pods start with the new value.
  Old pods fail every request once the old value is revoked, until they are
  replaced.
- `env` alone: the pods read the value once, at start, so every pod fails
  every request from the revocation on.

**Following rollouts.** A rollout that starts after another inherits that
one's failures in its old pods: a breaking migration's or a revoked
secret's, or a finished release's own failing pods. A rollout that starts
after a rotation, whatever triggered it, gives its new pods the new
value, so it ends a rotation's failures as it replaces the pods.

**Migrations.** A `rollout` with `migrates` runs its migration when it
starts. With `schemaChanges: breaking`, the previous version cannot work
with the new schema: every old pod fails every request from then on,
including the old pods a canary's rollback leaves serving. With
`backward-compatible`, as expand and contract gives, the old version keeps
working.

## Alerts

Alerts are evaluated once the steps have run. An alert watches nodes through
`watches` edges, and it sees a node only if a `monitoring` node `scrapes`
it; a node nothing scrapes is invisible to it, which the `unscraped-alert`
lint reports. Per watched node, the alert's signal is breached on a step
when:

| Signal             | Breached when                                                      |
| ------------------ | ------------------------------------------------------------------ |
| `error-rate`       | the node's error rate is above 1 %                                 |
| `latency`          | its p99 is above the scenario's SLO                                |
| `saturation`       | its utilisation is at least 90 %; a node that is down reports none |
| `rollout-progress` | its rollout is stalled                                             |

An alert fires once a breach has lasted `forSeconds` without a break, plus
the scrape interval of the fastest monitoring node that scrapes the node.
A breach that clears earlier starts the count again. The result lists every
alert with the second it fired, or `null`, and an `alert-fired` finding for
each page. A drill's `detectWithinSeconds` asks for a page within that many
seconds of its first fault or traffic change.

## Findings

Each finding names its target, the step it first held at, a message that
quotes the numbers, and those numbers in `data`. One finding per kind and
target: the first step it held, with the worst value seen.

| Kind              | When                                                                 |
| ----------------- | -------------------------------------------------------------------- |
| `saturated`       | a node reaches `ρ ≥ 0.95`                                            |
| `errors`          | a node's own error rate, less what it throttles, exceeds 1 %         |
| `throttled`       | a node turns away more than 1 % of what it receives                  |
| `backlog-growing` | a queue's or consumer group's backlog grows for three steps in a row |
| `slo-breach`      | a client's p99 or availability misses the scenario's SLO             |
| `rollout-stalled` | a deployment's rollout is stalled                                    |
| `rolled-back`     | a deployment's canary is rolled back                                 |
| `crash-looping`   | a deployment's new pods have been restarted 3 times or more          |
| `alert-fired`     | an alert paged; see _Alerts_                                         |
| `stale-secret`    | a deployment's pods hold a secret's value after it was revoked       |
| `schema-break`    | a breaking migration left old pods failing every request             |
| `retry-storm`     | an edge's retries make it send 1.5× the load or more                 |
