import z from "zod";

import { HOURS_PER_MONTH, perMillion } from "../../cost/prices";
import { defineTechnology } from "../define-technology";
import { choice, count, toggle } from "../kinds/shared";

const RDS_CLASSES = {
  "db.t4g.medium": { reads: 1_500, writes: 400, hourly: 0.065 },
  "db.r6g.large": { reads: 4_000, writes: 1_000, hourly: 0.225 },
  "db.r6g.2xlarge": { reads: 12_000, writes: 3_000, hourly: 0.899 },
  "db.r6g.8xlarge": { reads: 40_000, writes: 9_000, hourly: 3.596 },
} as const;

const AURORA_PREMIUM = 1.2;
const CLOUD_SQL_PER_VCPU = 49;
const DYNAMODB = {
  readUnit: 0.095,
  writeUnit: 0.475,
  readsPerMillion: 0.125,
  writesPerMillion: 0.625,
};

type RdsClass = keyof typeof RDS_CLASSES;

const rdsClass = () =>
  choice(
    Object.keys(RDS_CLASSES) as [RdsClass, ...RdsClass[]],
    "db.r6g.large",
    { title: "Instance class", description: "Size of the database server" },
  );

export const postgresql = defineTechnology({
  id: "postgresql",
  kind: "sql-database",
  provider: "self-hosted",
  label: "PostgreSQL",
  icon: "postgresql",
  monogram: "PG",
  summary:
    "Postgres on servers you run. Failover is yours to set up, with a tool such as Patroni.",
  props: z.strictObject({
    vcpus: count(4, { title: "vCPUs", description: "Cores of the primary" }),
    failoverTool: toggle(false, {
      title: "Automatic failover",
      description: "A tool such as Patroni promotes a replica on its own",
    }),
  }),
  derive: ({ vcpus, failoverTool }) => ({
    readCapacityRps: vcpus * 1_200,
    writeCapacityRps: vcpus * 300,
    failover: failoverTool ? ("automatic" as const) : ("manual" as const),
  }),
});

export const amazonRds = defineTechnology({
  id: "amazon-rds",
  kind: "sql-database",
  provider: "aws",
  label: "Amazon RDS for PostgreSQL",
  monogram: "RDS",
  summary:
    "Managed Postgres. Multi-AZ keeps a standby in another zone and fails over to it in about a minute.",
  props: z.strictObject({
    instanceClass: rdsClass(),
    multiAz: toggle(true, {
      title: "Multi-AZ",
      description: "A synchronous standby in another zone",
    }),
  }),
  derive: ({ instanceClass, multiAz }) => ({
    readCapacityRps: RDS_CLASSES[instanceClass].reads,
    writeCapacityRps: RDS_CLASSES[instanceClass].writes,
    failover: multiAz ? ("automatic" as const) : ("manual" as const),
  }),
  monthlyUsd: ({ instanceClass, multiAz }) =>
    RDS_CLASSES[instanceClass].hourly * HOURS_PER_MONTH * (multiAz ? 2 : 1),
});

export const amazonAurora = defineTechnology({
  id: "amazon-aurora",
  kind: "sql-database",
  provider: "aws",
  label: "Amazon Aurora PostgreSQL",
  monogram: "AUR",
  summary:
    "Postgres on Aurora's shared storage: replicas promote in seconds, and reads scale with them.",
  props: z.strictObject({
    instanceClass: rdsClass(),
  }),
  derive: ({ instanceClass }) => ({
    readCapacityRps: Math.round(RDS_CLASSES[instanceClass].reads * 1.5),
    writeCapacityRps: Math.round(RDS_CLASSES[instanceClass].writes * 1.5),
    failover: "automatic" as const,
  }),
  monthlyUsd: ({ instanceClass }) =>
    RDS_CLASSES[instanceClass].hourly * HOURS_PER_MONTH * AURORA_PREMIUM,
});

export const cloudSql = defineTechnology({
  id: "cloud-sql",
  kind: "sql-database",
  provider: "gcp",
  label: "Cloud SQL for PostgreSQL",
  icon: "googlecloud",
  monogram: "SQL",
  summary:
    "Managed Postgres on Google Cloud. High availability keeps a standby in another zone.",
  props: z.strictObject({
    vcpus: count(4, { title: "vCPUs", description: "Cores of the instance" }),
    highAvailability: toggle(true, {
      title: "High availability",
      description: "A standby in another zone that takes over",
    }),
  }),
  derive: ({ vcpus, highAvailability }) => ({
    readCapacityRps: vcpus * 1_000,
    writeCapacityRps: vcpus * 250,
    failover: highAvailability ? ("automatic" as const) : ("manual" as const),
  }),
  monthlyUsd: ({ vcpus, highAvailability }) =>
    vcpus * CLOUD_SQL_PER_VCPU * (highAvailability ? 2 : 1),
});

export const amazonDynamodb = defineTechnology({
  id: "amazon-dynamodb",
  kind: "nosql-database",
  provider: "aws",
  label: "Amazon DynamoDB",
  monogram: "DDB",
  summary:
    "A managed key-value store. A partition serves 3,000 reads and 1,000 writes a second, and on-demand adds partitions as traffic grows.",
  props: z.strictObject({
    mode: choice(["on-demand", "provisioned"], "on-demand", {
      title: "Capacity mode",
      description: "Pay per request, or reserve read and write units",
    }),
    readUnits: count(3_000, {
      title: "Read units",
      description: "Reserved reads a second, when provisioned",
    }),
    writeUnits: count(1_000, {
      title: "Write units",
      description: "Reserved writes a second, when provisioned",
    }),
  }),
  derive: ({ mode, readUnits, writeUnits }) => {
    if (mode === "on-demand") {
      return {
        partitions: 40,
        readCapacityPerPartition: 3_000,
        writeCapacityPerPartition: 1_000,
        replicationFactor: 3,
      };
    }

    const partitions = Math.max(
      1,
      Math.ceil(Math.max(readUnits / 3_000, writeUnits / 1_000)),
    );

    return {
      partitions,
      readCapacityPerPartition: Math.max(1, Math.floor(readUnits / partitions)),
      writeCapacityPerPartition: Math.max(
        1,
        Math.floor(writeUnits / partitions),
      ),
      replicationFactor: 3,
    };
  },
  monthlyUsd: ({ mode, readUnits, writeUnits }, load) =>
    mode === "provisioned"
      ? readUnits * DYNAMODB.readUnit + writeUnits * DYNAMODB.writeUnit
      : perMillion(load.reads, DYNAMODB.readsPerMillion) +
        perMillion(load.writes, DYNAMODB.writesPerMillion),
});

export const cassandra = defineTechnology({
  id: "cassandra",
  kind: "nosql-database",
  provider: "self-hosted",
  label: "Apache Cassandra",
  icon: "apachecassandra",
  monogram: "C*",
  summary:
    "A wide-column store you run yourself, with no leader: capacity grows with every node you add.",
  props: z.strictObject({
    nodes: count(6, { title: "Nodes", description: "Servers in the ring" }),
    replicationFactor: choice(["1", "3", "5"], "3", {
      title: "Replication factor",
      description: "Copies of every row",
    }),
  }),
  derive: ({ nodes, replicationFactor }) => ({
    partitions: nodes,
    readCapacityPerPartition: 4_000,
    writeCapacityPerPartition: 5_000 / Number(replicationFactor),
    replicationFactor: Number(replicationFactor),
    consistency: "eventual" as const,
  }),
});

export const mongodb = defineTechnology({
  id: "mongodb",
  kind: "nosql-database",
  provider: "self-hosted",
  label: "MongoDB",
  icon: "mongodb",
  monogram: "MDB",
  summary:
    "A document store; each shard is a replica set with one primary taking its writes.",
  props: z.strictObject({
    shards: count(2, {
      title: "Shards",
      description: "Replica sets the data is split over",
    }),
  }),
  derive: ({ shards }) => ({
    partitions: shards,
    readCapacityPerPartition: 6_000,
    writeCapacityPerPartition: 2_000,
    replicationFactor: 3,
    consistency: "strong" as const,
  }),
});
