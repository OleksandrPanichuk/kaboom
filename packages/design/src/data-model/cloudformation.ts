import type { DesignGraph } from "../graph";
import {
  dynamoTableName,
  type DynamoTableNode,
  dynamoTablesOf,
  keyAttributeName,
} from "./key-value";

const PROJECTION_TYPES = {
  all: "ALL",
  "keys-only": "KEYS_ONLY",
  include: "INCLUDE",
} as const;

const logicalId = (name: string, taken: Set<string>): string => {
  const base =
    name
      .split(/[^a-z0-9]+/i)
      .filter(Boolean)
      .map((word) => word[0]!.toUpperCase() + word.slice(1))
      .join("")
      .replace(/^[^a-z]+/i, "") || "Table";
  const stem = /table$/i.test(base) ? base.slice(0, -5) : base;
  let id = `${stem}Table`;

  for (let suffix = 2; taken.has(id); suffix += 1) {
    id = `${stem}Table${suffix}`;
  }

  taken.add(id);

  return id;
};

const keySchema = (
  table: DynamoTableNode,
  partitionKey: string,
  sortKey: string | null,
) => [
  { AttributeName: keyAttributeName(table, partitionKey), KeyType: "HASH" },
  ...(sortKey === null
    ? []
    : [{ AttributeName: keyAttributeName(table, sortKey), KeyType: "RANGE" }]),
];

const resourceOf = (table: DynamoTableNode) => {
  const { keySchema: keys, indexes, billing, ttlAttribute } = table.props;
  const used = new Set(
    [
      keys.partitionKey,
      keys.sortKey,
      ...indexes.flatMap((index) => [index.partitionKey, index.sortKey]),
    ].filter((id): id is string => id !== null),
  );
  const provisioned = billing === "provisioned";
  const throughput = {
    ReadCapacityUnits: table.props.readCapacity,
    WriteCapacityUnits: table.props.writeCapacity,
  };
  const projection = (index: (typeof indexes)[number]) => ({
    ProjectionType: PROJECTION_TYPES[index.projection],
    ...(index.projection === "include"
      ? { NonKeyAttributes: index.include ?? [] }
      : {}),
  });
  const global = indexes.filter((index) => index.kind === "global");
  const local = indexes.filter((index) => index.kind === "local");

  return {
    Type: "AWS::DynamoDB::Table",
    Properties: {
      TableName: dynamoTableName(table),
      BillingMode: provisioned ? "PROVISIONED" : "PAY_PER_REQUEST",
      AttributeDefinitions: keys.attributes
        .filter((attribute) => used.has(attribute.id))
        .map((attribute) => ({
          AttributeName: attribute.name,
          AttributeType: attribute.type,
        })),
      ...(keys.partitionKey === null
        ? {}
        : { KeySchema: keySchema(table, keys.partitionKey, keys.sortKey) }),
      ...(provisioned ? { ProvisionedThroughput: throughput } : {}),
      ...(global.length > 0
        ? {
            GlobalSecondaryIndexes: global.map((index) => ({
              IndexName: index.name,
              KeySchema: keySchema(table, index.partitionKey, index.sortKey),
              Projection: projection(index),
              ...(provisioned ? { ProvisionedThroughput: throughput } : {}),
            })),
          }
        : {}),
      ...(local.length > 0
        ? {
            LocalSecondaryIndexes: local.map((index) => ({
              IndexName: index.name,
              KeySchema: keySchema(table, index.partitionKey, index.sortKey),
              Projection: projection(index),
            })),
          }
        : {}),
      ...(ttlAttribute !== ""
        ? {
            TimeToLiveSpecification: {
              AttributeName: ttlAttribute,
              Enabled: true,
            },
          }
        : {}),
    },
  };
};

export const toCloudFormation = (graph: DesignGraph): string => {
  const taken = new Set<string>();
  const resources = Object.fromEntries(
    dynamoTablesOf(graph).map((table) => [
      logicalId(dynamoTableName(table), taken),
      resourceOf(table),
    ]),
  );

  return JSON.stringify(
    { AWSTemplateFormatVersion: "2010-09-09", Resources: resources },
    null,
    2,
  );
};
