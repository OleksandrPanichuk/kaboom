# Documents evaluator

`evaluateDocuments(graph, requirements)` checks a MongoDB design against
what a problem says its data must do. Like the schema evaluator it answers
once, with no traffic.

These are the rules. Each one is pinned by a test in `documents.test.ts`;
change a rule here and in its test in the same pull request.

## Requirements

A problem names its collections by node id, the ones its baseline draws,
and fields by name, dotted for a nested field (`shipping.city`). How far
something grows is a fact of the problem, never something the solver
declares.

## Embedded

`{ collection, field, max }`: what is read with its document every time
and has at most `max` entries. The collection has a field of that name
that is an array of objects (or an object, when `max` is 1). A separate
collection, or an array of ids, fails with `not-embedded`.

## References

A reference is a `reference` edge from a field holding an `objectId`, or
an array of them, to another collection's `_id`.

- `growth: "unbounded"`: the child (`from`) holds a single reference to
  its parent (`to`), and the parent holds no array that gains an entry per
  child: neither an array of references to the children nor an embedded
  array named after them. Such an array grows until every read of the
  document is slow and it hits 16 MB (`unbounded-array`).
- `growth: "bounded"`: a reference in either direction.

## Queries

`{ collection, equal, sort, range }`: served by an index whose keys are
the equality fields first, in any order, then the sort fields in order,
with every direction as asked or every one reversed, then the range field
(equality, sort, range). `_id` is always indexed. A partial index serves
no query here, since it leaves documents out, and a text index serves none
of these.

## Unique and TTL

`unique: { collection, field }` asks for a unique index on that field
alone; `ttl` asks for a TTL index on that date field alone.

## Findings

| Kind                   | When                                                  |
| ---------------------- | ----------------------------------------------------- |
| `missing-collection`   | a collection the problem names is not in the design   |
| `missing-field`        | a query names a field the collection does not have    |
| `not-embedded`         | what is read with its document is not inside it       |
| `unbounded-array`      | a parent keeps an array that grows with every child   |
| `missing-relationship` | nothing references the parent from the child          |
| `unindexed-query`      | no index has the keys equality, then sort, then range |
| `missing-unique`       | nothing stops two documents sharing a field           |
| `missing-ttl`          | documents never expire by the field that says when    |

## The drill

A `documents` drill carries the requirements and fails on every failed
check. A design with no reference at all fails it outright, so a reference
with its edges removed passes no documents drill, and `checkPublishable`
refuses a documents drill that declares no reference or names a collection
the baseline or the reference does not have.
