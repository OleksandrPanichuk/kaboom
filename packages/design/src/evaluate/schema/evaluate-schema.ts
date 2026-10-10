import type { Column } from "../../catalogue";
import {
  columnName,
  indexedBy,
  isOneToOne,
  keyOrders,
  leadsWith,
  relationsOf,
  type ResolvedRelation,
  tableName,
  type TableNode,
  tablesOf,
  uniqueOver,
} from "../../data-model";
import type { DesignGraph } from "../../graph";
import { lints } from "../../lints/lints";
import type {
  Finding,
  FindingKind,
  RequirementCheck,
  SchemaResult,
} from "../result";
import type {
  ColumnRequirement,
  QueryRequirement,
  RelationshipRequirement,
  SchemaRequirements,
} from "./requirements";

type Satisfied =
  | { cardinality: "one-to-many"; relation: ResolvedRelation }
  | { cardinality: "one-to-one"; relation: ResolvedRelation }
  | {
      cardinality: "many-to-many";
      junction: TableNode;
      left: ResolvedRelation;
      right: ResolvedRelation;
    };

interface Hop {
  table: TableNode;
  columns: Column[];
  many: boolean;
}

const STRUCTURAL_LINTS = [
  ["no-primary-key", "keyless-table"],
  ["fk-type-mismatch", "fk-type-mismatch"],
  ["set-null-not-nullable", "set-null-not-nullable"],
] as const satisfies ReadonlyArray<readonly [keyof typeof lints, FindingKind]>;

const byName = (table: TableNode, name: string): Column | undefined =>
  table.props.columns.find(
    (column) => column.name.toLowerCase() === name.toLowerCase(),
  );

const servesOrder = (
  table: TableNode,
  equal: Column[],
  order: Column[],
): boolean =>
  keyOrders(table).some((columns) => {
    const ids = equal.map((column) => column.id);

    return (
      leadsWith(columns, ids) &&
      order.every((column, index) => columns[ids.length + index] === column.id)
    );
  });

const describeColumn = (requirement: ColumnRequirement): string =>
  [
    requirement.type ?? "any type",
    ...(requirement.unique === true ? ["unique"] : []),
    ...(requirement.unique === false ? ["not unique"] : []),
    ...(requirement.nullable === true ? ["nullable"] : []),
    ...(requirement.nullable === false ? ["not null"] : []),
  ].join(", ");

export const evaluateSchema = (
  graph: DesignGraph,
  requirements: SchemaRequirements,
): SchemaResult => {
  const tables = new Map(tablesOf(graph).map((table) => [table.id, table]));
  const relations = relationsOf(graph);
  const checks: RequirementCheck[] = [];
  const satisfied = new Map<RelationshipRequirement, Satisfied>();

  const nameOf = (id: string) => {
    const table = tables.get(id);

    return table ? tableName(table) : id;
  };

  const check = (
    fields: Omit<RequirementCheck, "finding" | "message" | "edgeIds"> & {
      edgeIds?: string[];
      finding: FindingKind;
      message: string;
    },
  ) =>
    checks.push({
      edgeIds: [],
      ...fields,
      finding: fields.passed ? null : fields.finding,
      message: fields.passed ? null : fields.message,
    });

  const missingTables = (
    label: string,
    expected: string,
    ids: string[],
  ): boolean => {
    const missing = ids.filter((id) => !tables.has(id));

    if (missing.length === 0) return false;

    check({
      requirement: "relationship",
      label,
      expected,
      actual: `no table ${missing.join(" or ")}`,
      passed: false,
      nodeIds: [],
      finding: "missing-table",
      message: `The design has no table ${missing.join(" or ")}, which the problem needs.`,
    });

    return true;
  };

  const between = (a: string, b: string) =>
    relations.filter(
      (relation) =>
        (relation.from.id === a && relation.to.id === b) ||
        (relation.from.id === b && relation.to.id === a),
    );

  const judgeOneToMany = (
    requirement: Extract<
      RelationshipRequirement,
      { cardinality: "one-to-many" }
    >,
  ) => {
    const { parent, child } = requirement;
    const label = `Each ${nameOf(parent)} has many ${nameOf(child)}`;
    const expected = `a foreign key on ${nameOf(child)} to ${nameOf(parent)}, not unique`;

    if (missingTables(label, expected, [parent, child])) return;

    const forward = relations.filter(
      (relation) => relation.from.id === child && relation.to.id === parent,
    );
    const backward = relations.filter(
      (relation) => relation.from.id === parent && relation.to.id === child,
    );
    const many = forward.find((relation) => !isOneToOne(relation));
    const nodeIds = [parent, child];

    if (many && backward.length === 0) {
      satisfied.set(requirement, {
        cardinality: "one-to-many",
        relation: many,
      });
      check({
        requirement: "relationship",
        label,
        expected,
        actual: columnName(many.from, many.foreignKey),
        passed: true,
        nodeIds,
        edgeIds: [many.edge.id],
        finding: "wrong-cardinality",
        message: "",
      });
      return;
    }

    if (backward.length > 0) {
      const [wrong] = backward;

      check({
        requirement: "relationship",
        label,
        expected,
        actual: `${columnName(wrong!.from, wrong!.foreignKey)} points the other way`,
        passed: false,
        nodeIds,
        edgeIds: backward.map((relation) => relation.edge.id),
        finding: "wrong-cardinality",
        message: `${columnName(wrong!.from, wrong!.foreignKey)} gives each ${nameOf(parent)} one ${nameOf(child)}, but a ${nameOf(parent)} has many; the foreign key belongs on ${nameOf(child)}.`,
      });
      return;
    }

    if (forward.length > 0) {
      const [unique] = forward;

      check({
        requirement: "relationship",
        label,
        expected,
        actual: `${columnName(unique!.from, unique!.foreignKey)} is unique`,
        passed: false,
        nodeIds,
        edgeIds: forward.map((relation) => relation.edge.id),
        finding: "wrong-cardinality",
        message: `${columnName(unique!.from, unique!.foreignKey)} is unique, so each ${nameOf(parent)} can have only one ${nameOf(child)}.`,
      });
      return;
    }

    check({
      requirement: "relationship",
      label,
      expected,
      actual: "no relation",
      passed: false,
      nodeIds,
      finding: "missing-relationship",
      message: `Nothing relates ${nameOf(child)} to ${nameOf(parent)}, so a ${nameOf(child)} cannot say which ${nameOf(parent)} it belongs to.`,
    });
  };

  const judgeOneToOne = (
    requirement: Extract<
      RelationshipRequirement,
      { cardinality: "one-to-one" }
    >,
  ) => {
    const [a, b] = requirement.between;
    const label = `Each ${nameOf(a)} has one ${nameOf(b)}`;
    const expected = "a unique foreign key between them";

    if (missingTables(label, expected, [a, b])) return;

    const direct = between(a, b);
    const one = direct.find(isOneToOne);
    const nodeIds = [a, b];

    if (one) {
      satisfied.set(requirement, { cardinality: "one-to-one", relation: one });
      check({
        requirement: "relationship",
        label,
        expected,
        actual: columnName(one.from, one.foreignKey),
        passed: true,
        nodeIds,
        edgeIds: [one.edge.id],
        finding: "wrong-cardinality",
        message: "",
      });
      return;
    }

    const [loose] = direct;

    check({
      requirement: "relationship",
      label,
      expected,
      actual: loose
        ? `${columnName(loose.from, loose.foreignKey)} is not unique`
        : "no relation",
      passed: false,
      nodeIds,
      edgeIds: direct.map((relation) => relation.edge.id),
      finding: loose ? "wrong-cardinality" : "missing-relationship",
      message: loose
        ? `${columnName(loose.from, loose.foreignKey)} is not unique, so one ${nameOf(loose.to.id)} could have many ${nameOf(loose.from.id)}.`
        : `Nothing relates ${nameOf(a)} and ${nameOf(b)}.`,
    });
  };

  const judgeManyToMany = (
    requirement: Extract<
      RelationshipRequirement,
      { cardinality: "many-to-many" }
    >,
  ) => {
    const [a, b] = requirement.between;
    const label = `${nameOf(a)} and ${nameOf(b)}, many to many`;
    const expected = `a junction table with a foreign key to each and a unique pair`;

    if (missingTables(label, expected, [a, b])) return;

    const nodeIds = [a, b];
    const direct = a === b ? [] : between(a, b);

    if (direct.length > 0) {
      const [wrong] = direct;

      check({
        requirement: "relationship",
        label,
        expected,
        actual: `${columnName(wrong!.from, wrong!.foreignKey)} links them directly`,
        passed: false,
        nodeIds,
        edgeIds: direct.map((relation) => relation.edge.id),
        finding: "wrong-cardinality",
        message: `${columnName(wrong!.from, wrong!.foreignKey)} lets each ${nameOf(wrong!.from.id)} have only one ${nameOf(wrong!.to.id)}; a many-to-many link needs a table of its own.`,
      });
      return;
    }

    const candidates = [...tables.values()].flatMap((junction) => {
      if (junction.id === a || (junction.id === b && a !== b)) return [];

      const out = relations.filter(
        (relation) => relation.from.id === junction.id,
      );

      return out.flatMap((left) =>
        out
          .filter(
            (right) =>
              right !== left &&
              left.to.id === a &&
              right.to.id === b &&
              right.foreignKey.id !== left.foreignKey.id,
          )
          .map((right) => ({ junction, left, right })),
      );
    });
    const unique = candidates.find(({ junction, left, right }) =>
      uniqueOver(junction, [left.foreignKey.id, right.foreignKey.id]),
    );

    if (unique) {
      satisfied.set(requirement, { cardinality: "many-to-many", ...unique });
      check({
        requirement: "relationship",
        label,
        expected,
        actual: tableName(unique.junction),
        passed: true,
        nodeIds: [...nodeIds, unique.junction.id],
        edgeIds: [unique.left.edge.id, unique.right.edge.id],
        finding: "missing-junction",
        message: "",
      });
      return;
    }

    const [loose] = candidates;

    check({
      requirement: "relationship",
      label,
      expected,
      actual: loose
        ? `${tableName(loose.junction)} allows the same pair twice`
        : "no junction table",
      passed: false,
      nodeIds: loose ? [...nodeIds, loose.junction.id] : nodeIds,
      edgeIds: loose ? [loose.left.edge.id, loose.right.edge.id] : [],
      finding: loose ? "duplicate-links" : "missing-junction",
      message: loose
        ? `Nothing stops ${tableName(loose.junction)} from holding the same ${nameOf(a)} and ${nameOf(b)} twice; make the pair its primary key or a unique index.`
        : `No table links ${nameOf(a)} and ${nameOf(b)}, so neither can have many of the other.`,
    });
  };

  for (const requirement of requirements.relationships) {
    switch (requirement.cardinality) {
      case "one-to-many":
        judgeOneToMany(requirement);
        break;
      case "one-to-one":
        judgeOneToOne(requirement);
        break;
      case "many-to-many":
        judgeManyToMany(requirement);
        break;
    }
  }

  for (const requirement of requirements.columns) {
    const table = tables.get(requirement.table);
    const label = `${nameOf(requirement.table)}.${requirement.name}`;
    const expected = describeColumn(requirement);
    const column = table ? byName(table, requirement.name) : undefined;

    if (!table || !column) {
      check({
        requirement: "column",
        label,
        expected,
        actual: table ? "missing" : `no table ${requirement.table}`,
        passed: false,
        nodeIds: table ? [table.id] : [],
        finding: table ? "missing-column" : "missing-table",
        message: table
          ? `${tableName(table)} has no column ${requirement.name}.`
          : `The design has no table ${requirement.table}, which the problem needs.`,
      });
      continue;
    }

    const unique = uniqueOver(table, [column.id]);
    const wrong = [
      ...(requirement.type !== undefined && column.type !== requirement.type
        ? [`is ${column.type}, not ${requirement.type}`]
        : []),
      ...(requirement.unique === true && !unique ? ["is not unique"] : []),
      ...(requirement.unique === false && unique ? ["is unique"] : []),
      ...(requirement.nullable !== undefined &&
      column.nullable !== requirement.nullable
        ? [column.nullable ? "can be null" : "cannot be null"]
        : []),
    ];

    check({
      requirement: "column",
      label,
      expected,
      actual:
        wrong.length === 0
          ? describeColumn({ ...requirement, type: column.type })
          : wrong.join(", "),
      passed: wrong.length === 0,
      nodeIds: [table.id],
      finding: "column-mismatch",
      message: `${columnName(table, column)} ${wrong.join(" and ")}.`,
    });
  }

  const route = (from: string, to: string): Hop[] | null => {
    const previous = new Map<
      string,
      { at: string; via: RelationshipRequirement }
    >();
    const queue = [from];
    const seen = new Set([from]);
    const ends = (requirement: RelationshipRequirement): [string, string] =>
      requirement.cardinality === "one-to-many"
        ? [requirement.parent, requirement.child]
        : requirement.between;

    while (queue.length > 0) {
      const at = queue.shift()!;

      if (at === to) break;

      for (const requirement of requirements.relationships) {
        const [x, y] = ends(requirement);
        const next = x === at ? y : y === at ? x : null;

        if (next === null || seen.has(next)) continue;

        seen.add(next);
        previous.set(next, { at, via: requirement });
        queue.push(next);
      }
    }

    if (!seen.has(to)) return null;

    const steps: Array<{
      at: string;
      next: string;
      via: RelationshipRequirement;
    }> = [];

    for (let current = to; current !== from;) {
      const step = previous.get(current)!;

      steps.unshift({ at: step.at, next: current, via: step.via });
      current = step.at;
    }

    const hops: Hop[] = [];

    for (const { next, via } of steps) {
      const found = satisfied.get(via);

      if (!found) return null;

      if (found.cardinality === "many-to-many") {
        const [inbound, outbound] =
          found.left.to.id === next
            ? [found.right, found.left]
            : [found.left, found.right];

        hops.push({
          table: found.junction,
          columns: [inbound.foreignKey],
          many: true,
        });
        hops.push({
          table: outbound.to,
          columns: [outbound.referenced],
          many: false,
        });
        continue;
      }

      const { relation } = found;

      hops.push(
        relation.from.id === next
          ? {
              table: relation.from,
              columns: [relation.foreignKey],
              many: found.cardinality === "one-to-many",
            }
          : { table: relation.to, columns: [relation.referenced], many: false },
      );
    }

    return hops;
  };

  const judgeQuery = (query: QueryRequirement) => {
    const from = tables.get(query.from);
    const fail = (
      actual: string,
      finding: FindingKind,
      message: string,
      nodeIds: string[],
    ) =>
      check({
        requirement: "query",
        label: query.title,
        expected: "served by an index",
        actual,
        passed: false,
        nodeIds,
        finding,
        message,
      });

    if (!from) {
      fail(
        `no table ${query.from}`,
        "missing-table",
        `The design has no table ${query.from}, which the problem needs.`,
        [],
      );
      return;
    }

    const lookup = query.by.map((name) => byName(from, name));
    const absent = query.by.filter((_, index) => !lookup[index]);

    if (absent.length > 0) {
      fail(
        `${tableName(from)} has no ${absent.join(", ")}`,
        "missing-column",
        `${query.title} looks ${tableName(from)} up by ${absent.join(" and ")}, which it does not have.`,
        [from.id],
      );
      return;
    }

    const hops: Hop[] = [
      { table: from, columns: lookup as Column[], many: true },
    ];

    if (query.to !== undefined) {
      const rest = route(query.from, query.to);

      if (!rest) {
        fail(
          "no way through the relationships",
          "missing-relationship",
          `${query.title} cannot get from ${tableName(from)} to ${nameOf(query.to)}, because a relationship it goes through is missing.`,
          [from.id],
        );
        return;
      }

      hops.push(...rest);
    }

    const last = hops.at(-1)!;
    const order = query.orderBy.map((name) => byName(last.table, name));
    const unordered = query.orderBy.filter((_, index) => !order[index]);

    if (unordered.length > 0) {
      fail(
        `${tableName(last.table)} has no ${unordered.join(", ")}`,
        "missing-column",
        `${query.title} orders ${tableName(last.table)} by ${unordered.join(" and ")}, which it does not have.`,
        [last.table.id],
      );
      return;
    }

    for (const [position, hop] of hops.entries()) {
      const ordered =
        position === hops.length - 1 && hop.many ? (order as Column[]) : [];
      const served =
        ordered.length > 0
          ? servesOrder(hop.table, hop.columns, ordered)
          : indexedBy(
              hop.table,
              hop.columns.map((column) => column.id),
            );

      if (!served) {
        const wanted = [...hop.columns, ...ordered]
          .map((column) => column.name)
          .join(", ");

        fail(
          `${tableName(hop.table)} has no index on (${wanted})`,
          "unindexed-query",
          `${query.title} reads every row of ${tableName(hop.table)}: no index leads with (${wanted}).`,
          [hop.table.id],
        );
        return;
      }
    }

    check({
      requirement: "query",
      label: query.title,
      expected: "served by an index",
      actual: "served by an index",
      passed: true,
      nodeIds: hops.map((hop) => hop.table.id),
      finding: "unindexed-query",
      message: "",
    });
  };

  for (const query of requirements.queries) judgeQuery(query);

  const findings: Finding[] = [
    ...checks
      .filter((item) => !item.passed && item.finding !== null)
      .map((item): Finding => ({
        target:
          item.nodeIds.length > 0
            ? { type: "node", id: item.nodeIds[0] }
            : { type: "graph" },
        kind: item.finding!,
        atStep: 0,
        message: item.message ?? "",
        data: {},
      })),
    ...STRUCTURAL_LINTS.flatMap(([lint, kind]) =>
      lints[lint].run(graph).map((hit): Finding => ({
        target:
          hit.edgeIds.length > 0
            ? { type: "edge", id: hit.edgeIds[0] }
            : { type: "node", id: hit.nodeIds[0] },
        kind,
        atStep: 0,
        message: hit.message,
        data: {},
      })),
    ),
  ];

  return { checks, findings };
};
