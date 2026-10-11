import type { DocumentIndex } from "../../catalogue";
import {
  collectionName,
  type CollectionNode,
  collectionsOf,
  embedsMany,
  pathByNames,
  referencesOf,
} from "../../data-model/documents";
import type { DesignGraph } from "../../graph";
import type {
  Finding,
  FindingKind,
  RequirementCheck,
  SchemaResult,
} from "../result";
import type { DocumentRequirements } from "./requirements";

type DocumentQuery = DocumentRequirements["queries"][number];

const ID_PATH = ["_id"];

const key = (path: readonly string[]) => path.join("/");

const servesQuery = (
  index: Pick<DocumentIndex, "keys" | "partial">,
  equal: string[][],
  sort: Array<{ path: string[]; direction: "asc" | "desc" }>,
  range: string[] | null,
): boolean => {
  if (index.partial !== undefined) return false;
  if (index.keys.some((item) => item.direction === "text")) return false;
  if (equal.length + sort.length + (range ? 1 : 0) === 0) return false;

  const keys = index.keys;
  const wanted = new Set(equal.map(key));
  const prefix = keys.slice(0, equal.length);

  if (
    prefix.length !== equal.length ||
    !prefix.every((item) => wanted.has(key(item.path)))
  ) {
    return false;
  }

  const sorted = keys.slice(equal.length, equal.length + sort.length);

  if (sorted.length !== sort.length) return false;

  const same = sort.every(
    (item, position) =>
      key(sorted[position]!.path) === key(item.path) &&
      sorted[position]!.direction === item.direction,
  );
  const reversed = sort.every(
    (item, position) =>
      key(sorted[position]!.path) === key(item.path) &&
      sorted[position]!.direction !== item.direction,
  );

  if (sort.length > 0 && !same && !reversed) return false;

  if (range) {
    const next = keys[equal.length + sort.length];

    return next !== undefined && key(next.path) === key(range);
  }

  return true;
};

export const evaluateDocuments = (
  graph: DesignGraph,
  requirements: DocumentRequirements,
): SchemaResult => {
  const collections = new Map(
    collectionsOf(graph).map((collection) => [collection.id, collection]),
  );
  const references = referencesOf(graph);
  const checks: RequirementCheck[] = [];
  const nameOf = (id: string) => {
    const collection = collections.get(id);

    return collection ? collectionName(collection) : id;
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

  const missing = (
    requirement: RequirementCheck["requirement"],
    label: string,
    expected: string,
    id: string,
  ) =>
    check({
      requirement,
      label,
      expected,
      actual: `no collection ${id}`,
      passed: false,
      nodeIds: [],
      finding: "missing-collection",
      message: `The design has no collection ${id}, which the problem needs.`,
    });

  const resolve = (collection: CollectionNode, dotted: string) =>
    dotted === "_id" ? ID_PATH : pathByNames(collection.props.fields, dotted);

  for (const requirement of requirements.embedded) {
    const label = `${nameOf(requirement.collection)}.${requirement.field}, embedded`;
    const expected = `an array of up to ${requirement.max} objects inside each document`;
    const collection = collections.get(requirement.collection);

    if (!collection) {
      missing("embedded", label, expected, requirement.collection);
      continue;
    }

    const path = resolve(collection, requirement.field);
    const field = path
      ? collection.props.fields.find((item) => item.id === path[0])
      : undefined;
    const nested = path?.length === 1 ? field : undefined;
    const embedded =
      nested !== undefined &&
      (embedsMany(nested) ||
        (requirement.max === 1 && nested.type === "object"));

    check({
      requirement: "embedded",
      label,
      expected,
      actual: embedded
        ? "embedded"
        : nested
          ? `a ${nested.type === "array" ? `array of ${nested.of}` : nested.type}`
          : "missing",
      passed: embedded,
      nodeIds: [collection.id],
      finding: "not-embedded",
      message: nested
        ? `${collectionName(collection)}.${requirement.field} is read with its document every time, so it belongs inside it as objects, not as ${nested.type === "array" ? `an array of ${nested.of}` : `a ${nested.type}`}.`
        : `${collectionName(collection)} has no ${requirement.field}, which is read with every document and belongs inside it.`,
    });
  }

  for (const requirement of requirements.references) {
    const label = `${nameOf(requirement.from)} references ${nameOf(requirement.to)}`;
    const expected =
      requirement.growth === "unbounded"
        ? `a field on ${nameOf(requirement.from)} holding the _id of a ${nameOf(requirement.to)} document, and no array of them on ${nameOf(requirement.to)}`
        : "a reference between them";
    const from = collections.get(requirement.from);
    const to = collections.get(requirement.to);

    if (!from || !to) {
      missing(
        "reference",
        label,
        expected,
        from ? requirement.to : requirement.from,
      );
      continue;
    }

    const childToParent = references.filter(
      (item) => item.from.id === from.id && item.to.id === to.id && !item.many,
    );
    const parentToChild = references.filter(
      (item) => item.from.id === to.id && item.to.id === from.id,
    );
    const copied = to.props.fields.filter(
      (field) =>
        embedsMany(field) &&
        field.name.toLowerCase() === collectionName(from).toLowerCase(),
    );

    if (
      requirement.growth === "unbounded" &&
      (parentToChild.some((item) => item.many) || copied.length > 0)
    ) {
      const offender =
        parentToChild.find((item) => item.many)?.field ?? copied[0]!;

      check({
        requirement: "reference",
        label,
        expected,
        actual: `${collectionName(to)}.${offender.name} grows with every ${collectionName(from)} document`,
        passed: false,
        nodeIds: [to.id, from.id],
        edgeIds: parentToChild.map((item) => item.edge.id),
        finding: "unbounded-array",
        message: `${collectionName(to)}.${offender.name} gains an entry for every ${collectionName(from)} document, without bound, so the document grows until every read of it is slow and it hits 16 MB; let each ${collectionName(from)} document hold the _id of its ${collectionName(to)} document instead.`,
      });
      continue;
    }

    const satisfied =
      requirement.growth === "unbounded"
        ? childToParent.length > 0
        : childToParent.length > 0 || parentToChild.length > 0;

    check({
      requirement: "reference",
      label,
      expected,
      actual: satisfied
        ? `${collectionName(from)}.${(childToParent[0] ?? parentToChild[0])!.field.name}`
        : "no reference",
      passed: satisfied,
      nodeIds: [from.id, to.id],
      edgeIds: [...childToParent, ...parentToChild].map((item) => item.edge.id),
      finding: "missing-relationship",
      message: `Nothing references ${collectionName(to)} from ${collectionName(from)}, so a ${collectionName(from)} document cannot say which ${collectionName(to)} document it belongs to.`,
    });
  }

  const judgeQuery = (query: DocumentQuery) => {
    const collection = collections.get(query.collection);
    const fail = (actual: string, finding: FindingKind, message: string) =>
      check({
        requirement: "query",
        label: query.title,
        expected: "served by an index",
        actual,
        passed: false,
        nodeIds: collection ? [collection.id] : [],
        finding,
        message,
      });

    if (!collection) {
      fail(
        `no collection ${query.collection}`,
        "missing-collection",
        `The design has no collection ${query.collection}, which the problem needs.`,
      );
      return;
    }

    const named = [
      ...query.equal,
      ...query.sort.map((item) => item.field),
      ...(query.range ? [query.range] : []),
    ];
    const paths = named.map((dotted) => resolve(collection, dotted));
    const absent = named.filter((_, position) => paths[position] === null);

    if (absent.length > 0) {
      fail(
        `${collectionName(collection)} has no ${absent.join(", ")}`,
        "missing-field",
        `${query.title} needs ${absent.join(" and ")} on ${collectionName(collection)}, which it does not have.`,
      );
      return;
    }

    const resolved = paths as string[][];
    const equal = resolved.slice(0, query.equal.length);
    const sort = query.sort.map((item, position) => ({
      path: resolved[query.equal.length + position]!,
      direction: item.direction,
    }));
    const range = query.range ? resolved.at(-1)! : null;
    const implicit = { keys: [{ path: ID_PATH, direction: "asc" as const }] };
    const served = [implicit, ...collection.props.indexes].some((index) =>
      servesQuery(index, equal, sort, range),
    );

    if (!served) {
      const wanted = [
        ...query.equal,
        ...query.sort.map((item) => `${item.field} ${item.direction}`),
        ...(query.range ? [`${query.range} range`] : []),
      ].join(", ");

      fail(
        `${collectionName(collection)} has no index on (${wanted})`,
        "unindexed-query",
        `${query.title} scans or sorts ${collectionName(collection)} in memory: no index has the keys equality, then sort, then range (${wanted}).`,
      );
      return;
    }

    check({
      requirement: "query",
      label: query.title,
      expected: "served by an index",
      actual: "served by an index",
      passed: true,
      nodeIds: [collection.id],
      finding: "unindexed-query",
      message: "",
    });
  };

  for (const query of requirements.queries) judgeQuery(query);

  for (const [requirement, list] of [
    ["unique", requirements.unique],
    ["ttl", requirements.ttl],
  ] as const) {
    for (const item of list) {
      const label =
        requirement === "unique"
          ? `${nameOf(item.collection)}.${item.field}, unique`
          : `${nameOf(item.collection)}.${item.field}, expires`;
      const expected =
        requirement === "unique" ? "a unique index on it" : "a TTL index on it";
      const collection = collections.get(item.collection);

      if (!collection) {
        missing(requirement, label, expected, item.collection);
        continue;
      }

      const path = resolve(collection, item.field);
      const passed =
        path !== null &&
        collection.props.indexes.some(
          (index) =>
            index.keys.length === 1 &&
            key(index.keys[0]!.path) === key(path) &&
            (requirement === "unique"
              ? index.unique
              : index.ttlSeconds !== undefined),
        );

      check({
        requirement,
        label,
        expected,
        actual: passed ? expected.replace("a ", "") : "none",
        passed,
        nodeIds: [collection.id],
        finding: requirement === "unique" ? "missing-unique" : "missing-ttl",
        message:
          requirement === "unique"
            ? `Nothing stops two documents of ${collectionName(collection)} sharing ${item.field}; a unique index on it would.`
            : `Documents of ${collectionName(collection)} never expire by ${item.field}; a TTL index on it removes them when they are due.`,
      });
    }
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
