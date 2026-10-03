# Network evaluator

`evaluateNetwork(graph)` checks the design's network: whether every call
its edges make can connect, and what the internet can reach. Like the
pipeline evaluator it answers once, with no traffic.

These are the rules. Each one is pinned by a test in `network.test.ts`;
change a rule here and in its test in the same pull request.

## Placement

A node sits in the `internet`, a `public` subnet or a `private` subnet:

- inside a `public-subnet` or `private-subnet` group, which `applyOps`
  keeps inside a `vpc`, it is in that subnet and that VPC;
- inside a `vpc` but in no subnet, it is private;
- in no VPC at all, it is on the internet.

A `security-group` protects the nodes it has a `protects` edge to, at most
one per node. It admits connections from the internet with `fromInternet`,
from anything in the VPC with `fromVpc`, and from a node or the members of
another security group it has an `admits` edge to. A node no security
group protects accepts any connection that can reach it.

## Connections

Every edge that carries load is a connection from its source to its
target. It is **blocked** when:

- the target is outside the source's VPC, on the internet or in another
  VPC, and the source sits in a private subnet of a VPC with no
  `nat-gateway` in a public subnet;
- the target sits in a private subnet and the source is outside its VPC;
- the target's security group does not admit the source: from outside
  its VPC only `fromInternet` does; from inside, `fromVpc` or an `admits`
  edge to the source or its security group.

## Exposure

A node is **reachable from the internet** when it is on the internet, or
in a public subnet with no security group or one with `fromInternet`.
Clients and external APIs are the internet themselves and are left out.

## Findings

| Kind              | When                                                                              |
| ----------------- | --------------------------------------------------------------------------------- |
| `blocked-path`    | a connection is blocked                                                           |
| `exposed-store`   | a stateful node, other than an entry point, is reachable from the internet        |
| `exposed-service` | a node that is neither stateful nor an entry point is reachable from the internet |
| `open-store`      | a stateful node that serves traffic in a VPC has no security group, or one that admits the whole VPC |

Entry points are clients, DNS, CDNs, load balancers, API gateways, rate
limiters and ingresses: what the internet is meant to reach.
