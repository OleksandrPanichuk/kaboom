import type { ProblemContentInput } from "../schema";
import {
  attribute,
  database,
  dynamoTable,
  globalIndex,
  graph,
  itemType,
  keyAttribute,
} from "./build";

const game = () => database("game", "Game", "dynamodb");

const player = (keys: Record<string, string> = {}) =>
  itemType(
    "Player",
    [attribute("playerId"), attribute("name"), attribute("country")],
    keys,
  );

const score = (keys: Record<string, string> = {}, shard = false) =>
  itemType(
    "Score",
    [
      attribute("boardId"),
      attribute("playerId"),
      attribute("points", "N"),
      attribute("achievedAt"),
      attribute("expiresAt", "N"),
      ...(shard ? [attribute("shard", "N", { shards: 10 })] : []),
    ],
    keys,
  );

const profile = {
  id: "profile",
  title: "A player with their score on every board, in one query",
  items: ["Player", "Score"],
  equal: ["playerId"],
};

const best = {
  id: "best",
  title: "A player's score on one board",
  items: ["Score"],
  equal: ["playerId", "boardId"],
};

const top = {
  id: "top",
  title: "A board's top scores, highest first",
  items: ["Score"],
  equal: ["boardId"],
  range: "points",
  returns: ["playerId", "points"],
};

const launch = {
  writes: [{ item: "Score", perSecond: 20_000 }],
  cardinality: [{ item: "Score", attribute: "boardId", values: 12 }],
};

export const gameLeaderboard: ProblemContentInput = {
  slug: "game-leaderboard",
  title: "A game leaderboard in DynamoDB",
  track: "data-model",
  difficulty: "medium",
  tags: ["dynamodb", "gsi", "hot-partition", "ttl"],
  summary:
    "Rank every player on a dozen boards in DynamoDB, so the top of a board is one query even on launch day.",
  statement: `Design the DynamoDB table behind a game's leaderboards.

**What it does**

- A player has an id, a name and a country.
- The game keeps 12 boards: all time, this week and today, for each of four regions. A player has one score on each board they have played: the points and when they were achieved.
- A score on today's or this week's board disappears once that day or week is over.

**How it is used**

- A player's page shows the player and their score on every board, from one query.
- The game asks for a player's score on one board after every match.
- A board shows its top scores, highest first, with each player's id and points.

**What to watch**

- On launch day, scores are written 20,000 times a second, spread over the 12 boards.
- A partition takes 1,000 writes a second.

The \`scores\` table in the \`Game\` database already lists the item types and their attributes; \`expiresAt\` holds the epoch second a score disappears. Give it keys, indexes and the templates each item fills them with.`,
  baseline: graph(
    [
      dynamoTable("scores", "game", {
        items: [player(), score()],
      }),
    ],
    [],
    [game()],
  ),
  drills: [
    {
      kind: "key-value",
      id: "player-page",
      title: "A player's page",
      description:
        "A player and their scores share a partition, and one score is found by its board.",
      visibility: "public",
      requirements: { patterns: [profile, best] },
    },
    {
      kind: "key-value",
      id: "top-of-board",
      title: "The top of a board",
      description:
        "A board's scores come back highest first from an index that carries each player and their points.",
      visibility: "public",
      requirements: { patterns: [top] },
    },
    {
      kind: "key-value",
      id: "daily-boards",
      title: "Boards that reset",
      description: "Scores expire by themselves once their board is over.",
      visibility: "public",
      requirements: { patterns: [best], ttl: [{ item: "Score" }] },
    },
    {
      kind: "key-value",
      id: "launch-day",
      title: "Twenty thousand scores a second",
      visibility: "hidden",
      requirements: { patterns: [top], ...launch },
    },
  ],
  rubric: [
    {
      key: "player-page",
      title: "Reads a player and their scores from one partition",
      weight: 25,
      check: { check: "drill-passes", drillId: "player-page" },
    },
    {
      key: "top-of-board",
      title: "Serves a board's ranking from an index",
      weight: 30,
      check: { check: "drill-passes", drillId: "top-of-board" },
    },
    {
      key: "daily-boards",
      title: "Lets daily and weekly scores expire",
      weight: 15,
      check: { check: "drill-passes", drillId: "daily-boards" },
    },
    {
      key: "launch-day",
      title: "Spreads launch-day writes across partitions",
      weight: 30,
      check: { check: "drill-passes", drillId: "launch-day" },
    },
  ],
  hints: [
    {
      title: "Key the table by player",
      body: "A player as PLAYER#<id> / PROFILE and each of their scores as PLAYER#<id> / BOARD#<boardId> puts the player page in one partition and finds one score by its full key.",
      cost: 5,
    },
    {
      title: "Rank in an index",
      body: "A global index whose partition key is the board and whose sort key is the points, as a number, returns a board highest first when read backwards.",
      cost: 10,
    },
    {
      title: "Twelve boards are twelve partitions",
      body: "20,000 writes a second over 12 boards is about 1,700 a partition. Add a shard number to the index's partition key, with shards set on the attribute, and read the top of each shard.",
      cost: 15,
    },
  ],
  reference: {
    notes:
      "The table is keyed by PK and SK: a player is PLAYER#<playerId> / PROFILE and each score PLAYER#<playerId> / BOARD#<boardId>, so the player page is one Query and a single score a full key. GSI1 ranks a board: its partition key is BOARD#<boardId>#<shard> and its sort key the points as a number, with ten shards, so 20,000 writes a second spread over 120 partitions; the top of a board is the merged top of its ten shards. The table expires items by expiresAt.",
    graph: graph(
      [
        dynamoTable("scores", "game", {
          attributes: [
            keyAttribute("PK"),
            keyAttribute("SK"),
            keyAttribute("GSI1PK"),
            keyAttribute("GSI1SK", "N"),
          ],
          partitionKey: "PK",
          sortKey: "SK",
          indexes: [globalIndex("GSI1", "GSI1PK", "GSI1SK")],
          items: [
            player({ PK: "PLAYER#{playerId}", SK: "PROFILE" }),
            score(
              {
                PK: "PLAYER#{playerId}",
                SK: "BOARD#{boardId}",
                GSI1PK: "BOARD#{boardId}#{shard}",
                GSI1SK: "{points}",
              },
              true,
            ),
          ],
          ttlAttribute: "expiresAt",
        }),
      ],
      [],
      [game()],
    ),
  },
};
