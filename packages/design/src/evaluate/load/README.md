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

| Fault         | Effect                                                                                                                                                                                                                                                                            |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node-down`   | the node is down. A SQL primary with `failover` `automatic` recovers 30 s later, `manual` 300 s later, if it has at least one replica outside every region that is down; one replica is then spent on the promotion. With `none`, or no such replica, it stays down until `until` |
| `region-down` | every node in the group `groupId`, or in a group inside it, is down, as if each had its own `node-down`; a SQL primary among them fails over the same way                                                                                                                         |
| `capacity`    | the node's capacity is multiplied by `factor`                                                                                                                                                                                                                                     |
| `latency`     | `addMs` is added to the node's base latency                                                                                                                                                                                                                                       |
| `cache-flush` | the cache's hit ratio drops to 0 and recovers linearly over 60 s                                                                                                                                                                                                                  |
| `rollout`     | a deployment starts replacing its pods with the version `release`, from the first step at or after `at`; see _Rollouts_. It has no `until`, and only a deployment's first rollout counts                                                                                          |

**Autoscaling.** A service or worker with autoscaling enabled that stays above
its `targetUtilisation` for two consecutive steps gains `ceil(replicas × 0.5)`
replicas, up to `max`, counted from the next step. It never scales down.
A deployment does the same with the `min`, `max` and `targetUtilisation` of the
pod autoscaler that `scales` it, and starts at its `replicas` held between that
`min` and `max`. The autoscaler holds still while a rollout is under way.

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
  times as long, so a pod also serves half as many.

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
- `canary`: create one new pod. A canary that fails or answers slowly and
  has served for a step is removed and the rollout is **rolled back**: the
  old pods keep serving.
  One that serves cleanly for `canarySeconds` after it is ready lets the rest
  follow as `rolling`.

A rollout is **complete** once no old pod is left and all `N` new pods are
ready. One that is neither complete nor rolled back `progressDeadlineSeconds`
after it began is **stalled**. It keeps what it has, as Kubernetes does, and
neither rolls back nor goes on. Each step reports the deployment's `rollout`:
its phase and its old, ready, starting, failing and slow pods.

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
