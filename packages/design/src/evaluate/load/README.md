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

| Field | Default | Meaning |
|---|---|---|
| `stepSeconds` | 10 | Length of one step |
| `durationSeconds` | 600 | Length of the run; steps = duration / step |
| `traffic` | `[]` | Piecewise-constant multiplier on every client's `rps`: `{ at, multiplier }` holds from `at` seconds until the next entry. 1 before the first |
| `faults` | `[]` | Events, below |
| `slo` | p99 300 ms, availability 99.9 % | Targets `slo-breach` compares against |

## Traffic

- Every node carries **two channels**, reads/s and writes/s.
- A client emits `rps × multiplier × readRatio` reads and the rest as writes.
- An edge carries a channel by kind: `read` edges carry reads only, `write`
  edges writes only, `sync-call` and `async-message` both. `replication`
  carries none.
- How a node's **forwarded** channel is split over the outgoing edges that
  carry it depends on the node kind's `distribution`:
  - `by-share`: each edge gets `share × fanOut` of it;
  - `evenly` (load balancer): split evenly over the edges to **up** targets,
    times `fanOut`; `share` is ignored. A balancer without health checks
    keeps sending to targets that are down;
  - `broadcast` (stream): each edge gets all of it, times `fanOut`; every
    outgoing edge is a consumer group.

## Topology

- The load subgraph is every edge but `replication`. It is acyclic, which
  `applyOps` guarantees, and nodes are evaluated in its topological order.
- A `replication` edge primary → replica declares the replica. It carries no
  load; the primary spreads its reads over itself and its up replicas.

## Node behaviour

`λ` is what a node receives, reads plus writes, and `capacity` what it can
serve. A node that is down serves nothing, forwards nothing and fails every
request it receives.

| Kind | Capacity | Forwards |
|---|---|---|
| `client` | unbounded | what it emits |
| `service` | `replicas × capacityRpsPerReplica` | what it serves |
| `worker` | `replicas × capacityMsgPerReplica` | what it serves |
| `load-balancer`, `cdn` | `capacityRps` | balancer: what it serves; CDN: `reads × (1 − hitRatio)` and all writes |
| `cache` | reads against `readCapacityRps`, writes against `writeCapacityRps` | `reads × (1 − hitRatio)` and all writes, to whatever it connects to |
| `sql-database` | writes: `writeCapacityRps × shards`, on the primary only; reads: `readCapacityRps × shards × (1 + up replicas)` | nothing |
| `nosql-database` | `partitions × readCapacityPerPartition` and `partitions × writeCapacityPerPartition` | nothing |
| `object-storage` | `readCapacityRps` and `writeCapacityRps` | nothing |
| `queue` | `capacityMsgPerSecond` accepted | see *Backlog* |
| `stream` | `capacityMsgPerSecond` accepted | see *Backlog* |

For a node with separate read and write capacities, `ρ = max(reads / read
capacity, writes / write capacity)`; otherwise `ρ = λ / capacity`. Replica
nodes report their primary's read utilisation.

**Saturation.** Up to `ρ = 0.95` a node serves everything. Above it, it serves
`0.95 × capacity` of each channel in proportion, and the rest is an error
(nothing forwards it downstream).

## Latency and errors

Per node, per step:

- **p50** = `baseLatencyMs / (1 − ρ)` and **p99** = `p50 × (1 + ρ)` below
  `ρ = 0.95`. At or above it, or when the node is down, both are pinned at the
  largest `timeoutMs` of its inbound edges (1000 ms without one): a caller
  waits no longer than it is willing to. A worker's base is `processingMs`;
  clients, queues and streams add none.
- **Own error rate**: 1 when down, the unserved fraction when saturated, 0
  otherwise.
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

1. fault onsets and ends, and failover timers;
2. autoscaler decisions taken on the previous step;
3. load propagation;
4. utilisation, latency and errors;
5. backlog;
6. findings.

A fault is an event with `at` and an optional `until`, in seconds, applied at
onset and undone at its end.

| Fault | Effect |
|---|---|
| `node-down` | the node is down. A SQL primary with `failover` `automatic` recovers 30 s later, `manual` 300 s later, if it has at least one replica; one replica is then spent on the promotion. With `none`, or no replica, it stays down until `until` |
| `capacity` | the node's capacity is multiplied by `factor` |
| `latency` | `addMs` is added to the node's base latency |
| `cache-flush` | the cache's hit ratio drops to 0 and recovers linearly over 60 s |

**Autoscaling.** A service or worker with autoscaling enabled that stays above
its `targetUtilisation` for two consecutive steps gains `ceil(replicas × 0.5)`
replicas, up to `max`, counted from the next step. It never scales down.

## Findings

Each finding names its target, the step it first held at, a message that
quotes the numbers, and those numbers in `data`. One finding per kind and
target: the first step it held, with the worst value seen.

| Kind | When |
|---|---|
| `saturated` | a node reaches `ρ ≥ 0.95` |
| `errors` | a node's own error rate exceeds 1 % |
| `backlog-growing` | a queue's or consumer group's backlog grows for three steps in a row |
| `slo-breach` | a client's p99 or availability misses the scenario's SLO |
