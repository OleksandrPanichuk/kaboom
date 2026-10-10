# Schema evaluator

`evaluateSchema(graph, requirements)` checks a data model against what a
problem says its data must do. Like the network evaluator it answers once,
with no traffic.

These are the rules. Each one is pinned by a test in `schema.test.ts`;
change a rule here and in its test in the same pull request.

## Requirements

A problem names its tables by node id, the tables its baseline draws, and
their columns by name, ignoring case. It never names a table the solver
adds, such as a junction table, so any name works.

```ts
relationships: { cardinality: "one-to-many"; parent; child }
             | { cardinality: "one-to-one" | "many-to-many"; between: [a, b] }
columns:       { table; name; type?; unique?; nullable? }
queries:       { id; title; from; by: string[]; to?; orderBy?: string[] }
```

Every requirement becomes one check, passed or failed, and a failed check
becomes a finding.

## Relationships

A foreign key is a `relation` edge from the table that holds it to the
table it references. It is **one-to-one** when its column is unique on its
own, or is the whole primary key, or the whole of a unique index;
otherwise it is many-to-one.

- **one-to-many**: the child holds a foreign key to the parent that is not
  one-to-one, and the parent holds none to the child.
- **one-to-one**: a one-to-one foreign key in either direction.
- **many-to-many**: no foreign key joins the two tables directly, and a
  third table holds a foreign key to each, on two different columns, whose
  pair is unique: both are the primary key, or a unique index holds just
  them. A table may be many-to-many with itself, through two foreign keys
  to it, and then a direct foreign key does not count against it.

## Columns

The table has a column of that name. When the requirement says so, it has
that type, is unique on its own (as `uniqueOver` decides) or is not, and is
nullable or is not.

## Queries

A query looks rows of `from` up by the columns in `by`, then, with `to`,
follows the relationships the problem declares, by the fewest of them,
never any foreign key the solver drew besides. A many-to-many step goes
through the junction table that satisfied it, so a redundant direct foreign
key cannot stand in for one. A step through a relationship the design does
not satisfy leaves the query with no way through.

Each lookup along the way must be **indexed**: its columns, in any order,
lead the primary key, a unique column or an index. A step from a parent to
its children looks the child up by its foreign key; a step to a parent, or
to the other side of a junction, looks a row up by its key, which is always
indexed.

`orderBy` names columns of the last table. It is checked only when the
last lookup reads many rows of one table, a lookup on `from` alone or a
step from a parent to its children: an index must lead with that lookup's
columns and continue with `orderBy`, in order. After any other step it is
ignored, so a problem does not ask for it there.

## Findings

| Kind                    | When                                                                                                                                |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `missing-table`         | a table the problem names is not in the design                                                                                      |
| `missing-relationship`  | nothing relates two tables that must be related, or a query has no way through                                                      |
| `wrong-cardinality`     | a foreign key relates them, but one-to-one where many are needed, the wrong way round, or directly where a junction table is needed |
| `missing-junction`      | no table links the two sides of a many-to-many relationship                                                                         |
| `duplicate-links`       | a junction table exists, but nothing stops the same pair twice                                                                      |
| `missing-column`        | a table has no column the problem or a query names                                                                                  |
| `column-mismatch`       | a column has another type, uniqueness or nullability than asked                                                                     |
| `unindexed-query`       | a lookup along a query, or its order, is served by no index                                                                         |
| `keyless-table`         | a table has no primary key (the `no-primary-key` lint)                                                                              |
| `fk-type-mismatch`      | a foreign key and the column it references differ in type                                                                           |
| `set-null-not-nullable` | a foreign key that cannot be null is set to null on delete                                                                          |

The last three come from the lints of the same names and do not depend on
the requirements; a drill fails on them only when its `expect.forbid`
names them.

## The drill

A `schema` drill carries the requirements and fails on every failed check.
A design with no relation at all fails it outright, so a reference with
its edges removed passes no schema drill. `checkPublishable` refuses a
schema drill that declares no relationship, or names a table the baseline
or the reference does not have.
