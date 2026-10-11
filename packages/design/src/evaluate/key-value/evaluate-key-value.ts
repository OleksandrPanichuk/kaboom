import { placeholders, templateParts } from "../../catalogue";
import {
  dynamoTableName,
  findItem,
  itemAttribute,
  type KeySource,
  keySources,
  type ResolvedItem,
} from "../../data-model/key-value";
import type { DesignGraph } from "../../graph";
import type {
  Finding,
  FindingKind,
  RequirementCheck,
  SchemaResult,
} from "../result";
import {
  type KeyValueRequirements,
  MAX_ITEM_KB,
  PARTITION_WRITES_PER_SECOND,
} from "./requirements";

type Pattern = KeyValueRequirements["patterns"][number];

type Served = { served: false } | { served: true; shards: number };

const lower = (name: string) => name.toLowerCase();

const count = (value: number) =>
  value.toLocaleString("en-US", { maximumFractionDigits: 0 });

const servesPattern = (
  source: KeySource,
  items: ResolvedItem[],
  equal: string[],
  range: string | null,
): Served => {
  const given = new Set(equal.map(lower));
  const partitions = items.map(({ item }) => item.keys[source.partitionKey]);

  if (partitions.some((template) => template === undefined)) {
    return { served: false };
  }

  if (new Set(partitions).size > 1) return { served: false };

  if (
    source.sortKey !== null &&
    items.some(({ item }) => item.keys[source.sortKey!] === undefined)
  ) {
    return { served: false };
  }

  const [first] = items;
  const used = new Set<string>();
  let shards = 1;

  for (const name of placeholders(partitions[0]!)) {
    if (given.has(lower(name))) {
      used.add(lower(name));
      continue;
    }

    const sharded = itemAttribute(first!.item, name)?.shards;

    if (sharded === undefined) return { served: false };

    shards *= sharded;
  }

  const remaining = new Set([...given].filter((name) => !used.has(name)));

  if (remaining.size === 0 && range === null) return { served: true, shards };
  if (items.length > 1 || source.sortKey === null) return { served: false };

  let next: string | null = null;

  for (const part of templateParts(first!.item.keys[source.sortKey]!)) {
    if (part.kind === "literal") continue;
    if (remaining.has(lower(part.name))) {
      remaining.delete(lower(part.name));
      continue;
    }

    next = lower(part.name);
    break;
  }

  if (remaining.size > 0) return { served: false };
  if (range !== null && next !== lower(range)) return { served: false };

  return { served: true, shards };
};

const projected = (
  source: KeySource,
  { table, item }: ResolvedItem,
): Set<string> | null => {
  if (source.kind !== "global" || source.projection === "all") return null;

  const { partitionKey, sortKey } = table.props.keySchema;
  const keys = [partitionKey, sortKey, source.partitionKey, source.sortKey];

  return new Set([
    ...keys.flatMap((id) =>
      id !== null && item.keys[id] !== undefined
        ? placeholders(item.keys[id]).map(lower)
        : [],
    ),
    ...(source.projection === "include" ? source.include.map(lower) : []),
  ]);
};

export const evaluateKeyValue = (
  graph: DesignGraph,
  requirements: KeyValueRequirements,
): SchemaResult => {
  const checks: RequirementCheck[] = [];

  const check = (
    fields: Omit<RequirementCheck, "finding" | "message" | "edgeIds"> & {
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

  const missingItem = (
    requirement: RequirementCheck["requirement"],
    label: string,
    expected: string,
    name: string,
  ) =>
    check({
      requirement,
      label,
      expected,
      actual: `no ${name} items`,
      passed: false,
      nodeIds: [],
      finding: "missing-item",
      message: `The design has no item type ${name}, which the problem needs.`,
    });

  const judgePattern = (pattern: Pattern) => {
    const expected = "a Query on the table or an index";
    const resolved = pattern.items.map((name) => findItem(graph, name));
    const absent = pattern.items.find((_, position) => !resolved[position]);

    if (absent !== undefined) {
      missingItem("pattern", pattern.title, expected, absent);
      return;
    }

    const items = resolved as ResolvedItem[];
    const table = items[0]!.table;
    const nodeIds = [...new Set(items.map((entry) => entry.table.id))];
    const fail = (actual: string, finding: FindingKind, message: string) =>
      check({
        requirement: "pattern",
        label: pattern.title,
        expected,
        actual,
        passed: false,
        nodeIds,
        finding,
        message,
      });

    if (nodeIds.length > 1) {
      fail(
        "items in different tables",
        "needs-scan",
        `${pattern.title} reads ${pattern.items.join(" and ")} together, which live in different tables, and one Query reads one partition of one table.`,
      );
      return;
    }

    const keyed = [...pattern.equal, ...(pattern.range ? [pattern.range] : [])];
    const lacking = items.flatMap(({ item }) =>
      keyed
        .filter((name) => !itemAttribute(item, name))
        .map((name) => `${item.name}.${name}`),
    );
    const unreturned = pattern.returns.filter(
      (name) => !items.some(({ item }) => itemAttribute(item, name)),
    );

    if (lacking.length > 0 || unreturned.length > 0) {
      const names = [...lacking, ...unreturned];

      fail(
        `no ${names.join(", ")}`,
        "missing-field",
        `${pattern.title} needs ${names.join(" and ")}, which the items do not have.`,
      );
      return;
    }

    let shortOf: { source: KeySource; missing: string[] } | null = null;

    for (const source of keySources(table)) {
      const served = servesPattern(
        source,
        items,
        pattern.equal,
        pattern.range ?? null,
      );

      if (!served.served) continue;

      const missing = items.flatMap((entry) => {
        const visible = projected(source, entry);

        return visible === null
          ? []
          : pattern.returns.filter(
              (name) =>
                itemAttribute(entry.item, name) !== undefined &&
                !visible.has(lower(name)),
            );
      });

      if (missing.length > 0) {
        shortOf ??= { source, missing: [...new Set(missing)] };
        continue;
      }

      check({
        requirement: "pattern",
        label: pattern.title,
        expected,
        actual:
          served.shards > 1
            ? `a Query on each of ${served.shards} shards of ${source.name}`
            : `a Query on ${source.name}`,
        passed: true,
        nodeIds,
        finding: "needs-scan",
        message: "",
      });
      return;
    }

    if (shortOf) {
      fail(
        `${shortOf.source.name} lacks ${shortOf.missing.join(", ")}`,
        "projection-missing",
        `${pattern.title} is a Query on ${shortOf.source.name}, but the index does not project ${shortOf.missing.join(" or ")}, and a global index cannot fetch them from the table; project them, or all attributes.`,
      );
      return;
    }

    const by =
      pattern.equal.length > 0 ? pattern.equal.join(" and ") : "nothing given";

    fail(
      "a Scan",
      "needs-scan",
      `${pattern.title} cannot be a Query: neither ${dynamoTableName(table)} nor an index has a partition key built from ${by}${pattern.range ? ` with ${pattern.range} next in its sort key` : ""}${pattern.items.length > 1 ? `, shared by ${pattern.items.join(" and ")}` : ""}, so it reads the whole table.`,
    );
  };

  for (const pattern of requirements.patterns) judgePattern(pattern);

  const cardinality = (item: string, attribute: string) =>
    requirements.cardinality.find(
      (fact) =>
        lower(fact.item) === lower(item) &&
        lower(fact.attribute) === lower(attribute),
    )?.values;

  for (const { item: name, perSecond } of requirements.writes) {
    const label = `${name} writes spread across partitions`;
    const expected = `at most ${count(PARTITION_WRITES_PER_SECOND)} writes a second on each partition`;
    const resolved = findItem(graph, name);

    if (!resolved) {
      missingItem("partition", label, expected, name);
      continue;
    }

    const { table, item } = resolved;
    let worst: { source: KeySource; partitions: number } | null = null;

    for (const source of keySources(table)) {
      const template = item.keys[source.partitionKey];

      if (source.kind === "local" || template === undefined) continue;

      const partitions = placeholders(template).reduce(
        (product, attribute) =>
          product *
          (cardinality(item.name, attribute) ??
            itemAttribute(item, attribute)?.shards ??
            Number.POSITIVE_INFINITY),
        1,
      );

      if (!worst || partitions < worst.partitions) {
        worst = { source, partitions };
      }
    }

    if (!worst) {
      check({
        requirement: "partition",
        label,
        expected,
        actual: "no partition key",
        passed: false,
        nodeIds: [table.id],
        finding: "missing-item",
        message: `${item.name} fills no partition key of ${dynamoTableName(table)}, so it cannot be written at all.`,
      });
      continue;
    }

    const each = perSecond / worst.partitions;
    const passed = each <= PARTITION_WRITES_PER_SECOND;

    check({
      requirement: "partition",
      label,
      expected,
      actual: !Number.isFinite(worst.partitions)
        ? "spread by a key with many values"
        : worst.partitions === 1
          ? `${count(each)} a second on one partition of ${worst.source.name}`
          : `${count(each)} a second on each of ${count(worst.partitions)} partitions of ${worst.source.name}`,
      passed,
      nodeIds: [table.id],
      finding: "hot-partition",
      message: `${worst.source.name === "the table" ? dynamoTableName(table) : worst.source.name} puts ${item.name} writes on ${worst.partitions === 1 ? "one partition" : `only ${count(worst.partitions)} partitions`}, about ${count(each)} a second each, past the ${count(PARTITION_WRITES_PER_SECOND)} a partition takes; build its partition key from something with more values, or shard it.`,
    });
  }

  for (const { item: name, from, max, kb } of requirements.apart) {
    const label = `${name} apart from ${from}`;
    const expected = `${name} as items of their own, or a list that fits in ${MAX_ITEM_KB} KB`;

    if (findItem(graph, name)) {
      check({
        requirement: "size",
        label,
        expected,
        actual: "items of their own",
        passed: true,
        nodeIds: [findItem(graph, name)!.table.id],
        finding: "item-too-large",
        message: "",
      });
      continue;
    }

    const parent = findItem(graph, from);
    const list = parent?.item.attributes.find(
      (attribute) => attribute.type === "L" || attribute.type === "M",
    );

    if (!parent || !list) {
      missingItem("size", label, expected, name);
      continue;
    }

    const size = max === null ? Number.POSITIVE_INFINITY : max * kb;

    check({
      requirement: "size",
      label,
      expected,
      actual:
        max === null
          ? `${from}.${list.name}, without bound`
          : `${from}.${list.name}, about ${count(size)} KB`,
      passed: size <= MAX_ITEM_KB,
      nodeIds: [parent.table.id],
      finding: "item-too-large",
      message: `${from}.${list.name} holds every ${name}, ${max === null ? "without bound" : `up to ${count(max)} of about ${kb} KB`}, and an item stops at ${MAX_ITEM_KB} KB; store each ${name} as an item of its own in ${from}'s partition.`,
    });
  }

  for (const { item: name } of requirements.ttl) {
    const label = `${name} expires`;
    const expected = "the table expires items by an attribute it has";
    const resolved = findItem(graph, name);

    if (!resolved) {
      missingItem("ttl", label, expected, name);
      continue;
    }

    const { table, item } = resolved;
    const by = table.props.ttlAttribute;
    const attribute = by === "" ? undefined : itemAttribute(item, by);
    const passed = attribute?.type === "N";

    check({
      requirement: "ttl",
      label,
      expected,
      actual: passed
        ? `expires by ${attribute.name}`
        : by === ""
          ? "the table expires nothing"
          : attribute
            ? `${item.name}.${attribute.name} is not a number`
            : `${item.name} has no ${by}`,
      passed,
      nodeIds: [table.id],
      finding: "missing-ttl",
      message: `${item.name} items never expire: give ${item.name} an attribute holding epoch seconds, as a number, and name it as ${dynamoTableName(table)}'s Expire by.`,
    });
  }

  const findings: Finding[] = checks
    .filter((item) => !item.passed && item.finding !== null)
    .map((item) => ({
      target:
        item.nodeIds.length > 0
          ? { type: "node", id: item.nodeIds[0] }
          : { type: "graph" },
      kind: item.finding!,
      atStep: 0,
      message: item.message ?? "",
      data: {},
    }));

  return { checks, findings };
};
