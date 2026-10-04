import z from "zod";

import { HOURS_PER_MONTH, perMillion } from "../../cost/prices";
import { defineTechnology } from "../define-technology";
import { choice, count, toggle } from "../kinds/shared";
import { prop } from "../prop-meta";

const KINESIS_SHARD_HOURLY = 0.015;

export const rabbitmq = defineTechnology({
  id: "rabbitmq",
  kind: "queue",
  provider: "self-hosted",
  label: "RabbitMQ",
  icon: "rabbitmq",
  summary:
    "A broker you run yourself; a quorum queue lives on one leader node, so it grows by splitting work over queues.",
  props: z.strictObject({
    nodes: count(3, { title: "Nodes", description: "Brokers in the cluster" }),
    quorumQueues: toggle(true, {
      title: "Quorum queues",
      description: "Replicated queues that survive a broker failing",
    }),
  }),
  derive: ({ nodes, quorumQueues }) => ({
    capacityMsgPerSecond:
      (quorumQueues ? 12_000 : 25_000) * Math.max(1, Math.floor(nodes / 3) + 1),
    deliveryGuarantee: "at-least-once" as const,
  }),
});

export const amazonSqs = defineTechnology({
  id: "amazon-sqs",
  kind: "queue",
  provider: "aws",
  label: "Amazon SQS",
  icon: "amazonsqs",
  summary:
    "A managed queue. Standard queues scale almost without limit but may deliver twice and out of order; FIFO queues keep order at a few thousand messages a second.",
  props: z.strictObject({
    type: choice(["standard", "fifo"], "standard", {
      title: "Queue type",
      description: "Standard for throughput, FIFO for order and no duplicates",
    }),
    batching: toggle(true, {
      title: "Batching",
      description: "Send and receive up to ten messages per call",
    }),
  }),
  derive: ({ type, batching }) => ({
    capacityMsgPerSecond:
      type === "standard" ? 100_000 : batching ? 3_000 : 300,
    deliveryGuarantee:
      type === "fifo" ? ("exactly-once" as const) : ("at-least-once" as const),
    retentionHours: 96,
  }),
  monthlyUsd: ({ type }, load) =>
    perMillion(load.reads + load.writes, type === "fifo" ? 0.5 : 0.4),
});

export const bullmq = defineTechnology({
  id: "bullmq",
  kind: "queue",
  provider: "self-hosted",
  label: "BullMQ",
  icon: "redis",
  summary:
    "A job queue on Redis. One Redis thread carries every queue, so it is simple and fast up to a point, with no partitions.",
  props: z.strictObject({
    redisMemoryGb: prop(z.number().positive().max(1_024).default(4), {
      title: "Redis memory",
      description: "Memory of the Redis it runs on",
      unit: "GB",
    }),
  }),
  derive: () => ({
    capacityMsgPerSecond: 10_000,
    partitions: 1,
    deliveryGuarantee: "at-least-once" as const,
  }),
});

export const azureServiceBus = defineTechnology({
  id: "azure-service-bus",
  kind: "queue",
  provider: "azure",
  label: "Azure Service Bus",
  icon: "microsoftazure",
  summary:
    "A managed broker. Standard is shared and throttled; Premium reserves messaging units that scale it.",
  props: z.strictObject({
    tier: choice(["standard", "premium"], "standard", {
      title: "Tier",
      description: "Shared capacity, or reserved messaging units",
    }),
    messagingUnits: count(1, {
      title: "Messaging units",
      description: "Reserved units on the Premium tier",
    }),
  }),
  derive: ({ tier, messagingUnits }) => ({
    capacityMsgPerSecond: tier === "premium" ? messagingUnits * 4_000 : 2_000,
    deliveryGuarantee: "at-least-once" as const,
  }),
});

export const kafka = defineTechnology({
  id: "kafka",
  kind: "stream",
  provider: "self-hosted",
  label: "Apache Kafka",
  icon: "apachekafka",
  summary:
    "An event log you run yourself. Throughput grows with brokers, and parallelism with partitions.",
  props: z.strictObject({
    brokers: count(3, {
      title: "Brokers",
      description: "Servers in the cluster",
    }),
    partitions: count(12, {
      title: "Partitions",
      description:
        "Partitions of the topic; at most one consumer each per group",
    }),
    replicationFactor: prop(z.number().int().min(1).max(5).default(3), {
      title: "Replication factor",
      description: "Copies of every partition",
      unit: "count",
    }),
  }),
  derive: ({ brokers, partitions, replicationFactor }) => {
    const copies = Math.min(replicationFactor, brokers);

    return {
      capacityMsgPerSecond: (brokers * 90_000) / copies,
      partitions,
      replicationFactor: copies,
    };
  },
});

export const amazonMsk = defineTechnology({
  id: "amazon-msk",
  kind: "stream",
  provider: "aws",
  label: "Amazon MSK",
  icon: "amazonwebservices",
  summary: "Managed Kafka: the same log, with AWS running the brokers.",
  props: z.strictObject({
    brokerType: choice(
      ["kafka.m5.large", "kafka.m5.xlarge", "kafka.m5.2xlarge"],
      "kafka.m5.large",
      { title: "Broker type", description: "Size of every broker" },
    ),
    brokers: count(3, {
      title: "Brokers",
      description: "One or more per zone",
    }),
    partitions: count(12, {
      title: "Partitions",
      description: "Partitions of the topic",
    }),
  }),
  derive: ({ brokerType, brokers, partitions }) => ({
    capacityMsgPerSecond:
      brokers *
      {
        "kafka.m5.large": 15_000,
        "kafka.m5.xlarge": 30_000,
        "kafka.m5.2xlarge": 60_000,
      }[brokerType],
    partitions,
    replicationFactor: Math.min(3, brokers),
  }),
  monthlyUsd: ({ brokerType, brokers }) =>
    brokers *
    HOURS_PER_MONTH *
    {
      "kafka.m5.large": 0.21,
      "kafka.m5.xlarge": 0.42,
      "kafka.m5.2xlarge": 0.84,
    }[brokerType],
});

export const amazonKinesis = defineTechnology({
  id: "amazon-kinesis",
  kind: "stream",
  provider: "aws",
  label: "Amazon Kinesis",
  icon: "amazonwebservices",
  summary:
    "A managed stream sized in shards: each takes 1,000 records a second, and a shard is a partition.",
  props: z.strictObject({
    shards: count(4, {
      title: "Shards",
      description: "1,000 records a second each",
    }),
    retentionHours: prop(z.number().int().min(24).max(8_760).default(24), {
      title: "Retention",
      description: "How long records are kept",
      unit: "h",
    }),
  }),
  derive: ({ shards, retentionHours }) => ({
    capacityMsgPerSecond: shards * 1_000,
    partitions: shards,
    retentionHours,
    replicationFactor: 3,
  }),
  monthlyUsd: ({ shards }) => shards * KINESIS_SHARD_HOURLY * HOURS_PER_MONTH,
});
