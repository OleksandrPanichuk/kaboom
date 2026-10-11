import { collection, database, field, graph, refers } from "@repo/design/build";
import type { ProblemContentInput } from "@repo/scoring";

const chat = () => database("chat", "Chat", "mongodb");

const chats = () =>
  collection("chats", "chat", [
    field("title", "string", { required: true }),
    field("members", "array", {
      of: "object",
      fields: [
        field("user_id", "objectId", { required: true }),
        field("role", "string", { enum: ["owner", "member"] }),
      ],
    }),
  ]);

const messages = () =>
  collection(
    "messages",
    "chat",
    [
      field("chat_id", "objectId", { required: true }),
      field("author_id", "objectId", { required: true }),
      field("body", "string", { required: true, maxLength: 4000 }),
      field("mentions", "array", { of: "objectId" }),
      field("sent_at", "date", { required: true }),
    ],
    [
      {
        id: "history_idx",
        keys: [
          { path: ["chat_id"], direction: "asc" },
          { path: ["sent_at"], direction: "desc" },
        ],
        unique: false,
      },
      {
        id: "mentions_idx",
        keys: [
          { path: ["mentions"], direction: "asc" },
          { path: ["sent_at"], direction: "desc" },
        ],
        unique: false,
      },
    ],
  );

const typing = () =>
  collection(
    "typing",
    "chat",
    [
      field("chat_id", "objectId", { required: true }),
      field("user_id", "objectId", { required: true }),
      field("expires_at", "date", { required: true }),
    ],
    [
      {
        id: "expiry_idx",
        keys: [{ path: ["expires_at"], direction: "asc" }],
        unique: false,
        ttlSeconds: 0,
      },
    ],
  );

const messagesOfChats = {
  from: "messages",
  to: "chats",
  growth: "unbounded",
} as const;

export const chatMessages: ProblemContentInput = {
  slug: "chat-messages",
  title: "Chat messages in MongoDB",
  track: "data-model",
  difficulty: "hard",
  tags: ["mongodb", "unbounded-arrays", "multikey", "ttl"],
  summary:
    "Model chats, their messages and who is typing, so a chat that has talked for years opens as fast as a new one.",
  statement: `Design the MongoDB collections of a team chat.

**What it does**

- A chat has a title and up to 50 members, each an owner or a member.
- People post messages to a chat: the author, the text, the people it mentions and when it was sent. A busy chat collects millions over the years.
- While someone types, the others see it; the signal disappears a few seconds after they stop.

**How it is used**

- Opening a chat shows its newest messages first, then older ones as you scroll.
- A person's mentions page lists the messages that mention them, newest first, across every chat.
- A chat's header shows its members without another read.

**What to watch**

- Opening a chat must not get slower as it collects messages.
- Nobody should have to delete stale typing signals by hand.

The \`chats\`, \`messages\` and \`typing\` collections are in the \`Chat\` database with no fields yet.`,
  baseline: graph(
    [
      collection("chats", "chat"),
      collection("messages", "chat"),
      collection("typing", "chat"),
    ],
    [],
    [chat()],
  ),
  drills: [
    {
      kind: "documents",
      id: "history",
      title: "A chat's history",
      description:
        "Each message points at its chat rather than the chat keeping its messages, and a chat's messages come back newest first from an index.",
      visibility: "public",
      requirements: {
        references: [messagesOfChats],
        queries: [
          {
            id: "open-chat",
            title: "A chat's messages, newest first",
            collection: "messages",
            equal: ["chat_id"],
            sort: [{ field: "sent_at", direction: "desc" }],
          },
        ],
      },
    },
    {
      kind: "documents",
      id: "presence",
      title: "Members and typing",
      description:
        "A chat carries its members inside it, and typing signals expire by themselves.",
      visibility: "public",
      requirements: {
        embedded: [{ collection: "chats", field: "members", max: 50 }],
        references: [
          { from: "typing", to: "chats", growth: "bounded" },
          messagesOfChats,
        ],
        ttl: [{ collection: "typing", field: "expires_at" }],
      },
    },
    {
      kind: "documents",
      id: "mentions",
      title: "A person's mentions",
      visibility: "hidden",
      requirements: {
        references: [messagesOfChats],
        queries: [
          {
            id: "mentions",
            title: "Messages mentioning a person, newest first",
            collection: "messages",
            equal: ["mentions"],
            sort: [{ field: "sent_at", direction: "desc" }],
          },
        ],
      },
    },
  ],
  rubric: [
    {
      key: "history",
      title: "Keeps messages out of the chat and opens a chat from an index",
      weight: 40,
      check: { check: "drill-passes", drillId: "history" },
    },
    {
      key: "presence",
      title: "Embeds members and lets typing signals expire",
      weight: 30,
      check: { check: "drill-passes", drillId: "presence" },
    },
    {
      key: "mentions",
      title: "Finds a person's mentions from an index",
      weight: 30,
      check: { check: "drill-passes", drillId: "mentions" },
    },
  ],
  hints: [
    {
      title: "Fifty members, millions of messages",
      body: "Members are few and always shown with their chat, so they belong inside it. Messages never stop, so each message holds its chat's _id instead.",
      cost: 5,
    },
    {
      title: "Signals that vanish",
      body: "A TTL index on a date field deletes each document once that date has passed, so a typing signal can carry the moment it expires.",
      cost: 10,
    },
    {
      title: "An index on an array",
      body: "Indexing an array field makes one entry per element, so { mentions: 1, sent_at: -1 } finds every message that mentions a person, newest first.",
      cost: 15,
    },
  ],
  reference: {
    notes:
      "chats embeds its members. messages is its own collection: each message holds its chat_id, with an index on { chat_id: 1, sent_at: -1 } to open a chat and a multikey index on { mentions: 1, sent_at: -1 } for a person's mentions. typing holds its chat_id and an expires_at with a TTL index, so stale signals delete themselves.",
    graph: graph(
      [chats(), messages(), typing()],
      [
        refers("messages", ["chat_id"], "chats"),
        refers("typing", ["chat_id"], "chats"),
      ],
      [chat()],
    ),
  },
};
