import z from "zod";

import { defineNodeKind } from "../define-node-kind";
import { baseLatency, count, gigabytes, rate } from "./shared";

export const searchIndexKind = defineNodeKind({
  kind: "search-index",
  track: "system-design",
  label: "Search index",
  icon: "search-index",
  stateful: true,
  replicable: false,
  carriesTraffic: true,
  distribution: "by-share",
  docs: {
    summary:
      "Answers full-text and filtered queries that a database cannot serve fast, from a copy of its data.",
    useWhen:
      "Users search by words, filter on many fields at once or sort by relevance.",
    pitfalls: [
      "It is a copy, not the system of record: feed it from the database's change feed, not by writing to both.",
      "Indexing is expensive, so a burst of writes can slow queries down.",
      "Reads may be a few seconds behind the database.",
    ],
  },
  props: z.strictObject({
    shards: count(3, {
      title: "Shards",
      description: "Pieces the index is split into; each adds capacity",
    }),
    replicas: count(2, {
      title: "Copies",
      description: "Copies of every shard; each one serves queries too",
    }),
    queryCapacityPerCopy: rate(2_000, {
      title: "Queries per shard copy",
      description: "Queries one copy of one shard serves before it saturates",
    }),
    indexCapacityPerShard: rate(1_000, {
      title: "Indexing per shard",
      description: "Documents a shard indexes a second",
    }),
    storageGb: gigabytes(100, {
      title: "Storage",
      description: "Data the index holds",
      advanced: true,
    }),
    baseLatencyMs: baseLatency(20),
  }),
});
