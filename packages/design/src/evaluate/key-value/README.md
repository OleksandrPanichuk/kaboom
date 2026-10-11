# Key-value evaluator

`evaluateKeyValue(graph, requirements)` checks a DynamoDB design against
how a problem says its items are read and written. Like the schema and
documents evaluators it answers once, with no traffic.

These are the rules. Each one is pinned by a test in `key-value.test.ts`;
change a rule here and in its test in the same pull request.

## The model

A `dynamo-table` lives only in a `dynamodb` database. Its `keySchema`
declares the key attributes (`PK`, `SK`, `GSI1PK`…), each a string,
number or binary, and which of them are the table's partition and sort
key. Its `indexes` are global or local, each with its own keys and a
projection: `all`, `keys-only`, or `include` with the attributes named. A
local index keeps the table's partition key and adds a sort key of its
own.

Its `items` are item types, which is how one table holds several kinds of
thing. Each has its own attributes, and fills key attributes from a
template: `CUSTOMER#{customerId}` puts the literal `CUSTOMER#` before the
item's `customerId`. An item without a template for an index's keys is
not in that index. A number key holds one number attribute and nothing
else.

## Requirements

A problem names item types by name, the ones its baseline draws, and
their attributes by name. How many values an attribute takes and how
often an item is written are facts of the problem, never something the
solver declares.

## Patterns

`{ items, equal, range, returns }`: one or more item types read with the
`equal` attributes given, optionally bounded or ordered by `range`. A
pattern is served by a `Query` on the table or an index when, for every
item type in it:

- the item fills that source's partition key, and its sort key if it has
  one;
- every attribute in the partition key's template is given by `equal`, or
  is sharded (below);
- the `equal` attributes the partition key leaves over lead the sort
  key's template, with only literals between them, so `begins_with` on
  that prefix finds them;
- `range` is the next attribute in the sort key's template.

Several item types read together must fill the partition key with the
same template, so they share a partition, and are read by the partition
alone. Items in different tables are never read by one Query. A pattern
no source serves is a `Scan` (`needs-scan`).

A global index answers only with what it projects: the attributes in the
item's table and index key templates, plus `include`. A pattern that
`returns` anything else from a global index fails with
`projection-missing`. A local index can fetch from the table, so it never
does.

## Hot partitions

`writes: { item, perSecond }` and `cardinality: { item, attribute,
values }`. For the table and every global index the item is in, the
partitions its writes spread over are the product of the values of each
attribute in the partition key's template: the problem's cardinality, or
the attribute's `shards`, or without bound when the problem says nothing.
A template without attributes is one partition. Writes past 1,000 a
second on a partition fail (`hot-partition`).

An attribute with `shards: N` is the write-sharding pattern: a suffix from
0 to N-1 chosen per write. It spreads the writes over N times as many
partitions, and a pattern whose partition key holds it is served by
querying each shard. An attribute the problem never mentions without
`shards` cannot be queried by, so a random suffix spreads writes but
leaves the reads it was meant for to a Scan.

## Item size

`apart: { item, from, max, kb }`: each `item` belongs to a `from` item,
up to `max` of them (`null` without bound), each about `kb`. Kept as
items of their own, it passes. Kept as a list or map attribute of `from`,
it passes only while `max × kb` fits the 400 KB an item takes, and fails
otherwise (`item-too-large`).

## TTL

`ttl: { item }`: the item's table names an attribute in _Expire by_, and
the item has it as a number, which DynamoDB reads as epoch seconds.

## Findings

| Kind                 | When                                                      |
| -------------------- | --------------------------------------------------------- |
| `missing-item`       | an item type the problem names is not in the design       |
| `missing-field`      | a pattern names an attribute its items do not have        |
| `needs-scan`         | no key of the table or an index serves a pattern          |
| `projection-missing` | a global index serves a pattern but lacks what it returns |
| `hot-partition`      | an item's writes exceed 1,000 a second on a partition     |
| `item-too-large`     | a list that outgrows 400 KB is kept inside its parent     |
| `missing-ttl`        | items never expire by the attribute that says when        |

## The drill

A `key-value` drill carries the requirements and fails on every failed
check. A design where no item fills a partition key fails it outright,
and `checkPublishable` refuses a key-value drill that declares no pattern
or names an item type the baseline or the reference does not have.

## Export

`toCloudFormation` writes an `AWS::DynamoDB::Table` per table: the key
attributes the table or an index is keyed by (CloudFormation refuses any
other), the key schema, the capacity mode, global and local indexes with
their projections, and the TTL attribute. Item types are the
application's convention and are not part of it.
