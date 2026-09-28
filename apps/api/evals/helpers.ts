import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  createEdge,
  createNode,
  type DesignGraph,
  type DesignNode,
  type DesignOp,
  type EdgeKind,
  type NodeKind,
} from "@repo/design";
import { createUser, type TestClient, type TestUser } from "@tests/helpers";

import {
  anthropicClient,
  AnthropicLanguageModel,
} from "@/adapters/llm/anthropic";
import { make, makeRepository } from "@/core/registry";
import {
  InterviewMessagesRepository,
  InterviewsRepository,
  TurnScheduler,
} from "@/modules/interviews";
import {
  LanguageModel,
  type LlmEvent,
  type LlmRequest,
  tokensOf,
} from "@/platform/llm";

const PATH = "/api/interviews";

const MODEL_KEYS = [
  "ANTHROPIC_API_KEY",
  "LLM_INTERVIEWER_MODEL",
  "LLM_REVIEW_MODEL",
] as const;

type ModelKey = (typeof MODEL_KEYS)[number];

const fromDotEnv = (): Partial<Record<ModelKey, string>> => {
  const file = resolve(import.meta.dir, "../.env");

  if (!existsSync(file)) return {};

  const found: Partial<Record<ModelKey, string>> = {};

  for (const line of readFileSync(file, "utf8").split("\n")) {
    const separator = line.indexOf("=");
    const key = line.slice(0, separator).trim() as ModelKey;

    if (separator > 0 && MODEL_KEYS.includes(key)) {
      found[key] = line
        .slice(separator + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
    }
  }

  return found;
};

export interface ToolCall {
  name: string;
  input: unknown;
}

export class RecordingLanguageModel extends LanguageModel {
  public tokens = 0;

  private calls: ToolCall[] = [];

  constructor(public readonly inner: LanguageModel) {
    super();
  }

  public async *stream(request: LlmRequest): AsyncIterable<LlmEvent> {
    for await (const event of this.inner.stream(request)) {
      if (event.type === "tool-use") {
        this.calls.push({ name: event.name, input: event.input });
      } else if (event.type === "usage") {
        this.tokens += tokensOf(event.usage);
      }

      yield event;
    }
  }

  public take(): ToolCall[] {
    const taken = this.calls;

    this.calls = [];

    return taken;
  }
}

export const liveModel = (): RecordingLanguageModel | null => {
  const file = fromDotEnv();
  const pick = (key: ModelKey) =>
    [process.env[key]?.trim(), file[key]].find(Boolean);
  const key = pick("ANTHROPIC_API_KEY");

  if (!key) return null;

  return new RecordingLanguageModel(
    new AnthropicLanguageModel({
      client: anthropicClient(key),
      models: {
        interviewer: pick("LLM_INTERVIEWER_MODEL") ?? "claude-sonnet-5",
        review: pick("LLM_REVIEW_MODEL") ?? "claude-opus-5-5",
      },
    }),
  );
};

const recorder = () => make(LanguageModel) as RecordingLanguageModel;

export const node = (
  id: string,
  kind: NodeKind,
  label: string,
  props: Record<string, unknown> = {},
): DesignNode => {
  const created = createNode(kind, { id, label });

  return { ...created, props: { ...created.props, ...props } } as DesignNode;
};

export const edge = (from: string, to: string, kind: EdgeKind) =>
  createEdge({ id: `${from}-${to}-${kind}`, from, to, kind });

export interface Scene {
  phase: string;
  design: Pick<DesignGraph, "nodes" | "edges">;
  history: Array<["user" | "interviewer", string]>;
}

export interface Seeded {
  user: TestUser;
  id: string;
  designId: string;
}

export const seed = async ({
  phase,
  design,
  history,
}: Scene): Promise<Seeded> => {
  const user = await createUser();
  const started = await user.post<{ id: string; designId: string }>(PATH, {
    slug: "url-shortener",
  });
  const { id, designId } = started.body;
  const ops: DesignOp[] = [
    ...design.nodes
      .filter((item) => item.id !== "users")
      .map((item): DesignOp => ({ op: "add-node", node: item })),
    ...design.edges.map((item): DesignOp => ({ op: "add-edge", edge: item })),
  ];

  if (ops.length > 0) {
    const applied = await user.post(`${PATH}/${id}/ops`, {
      baseRevision: 0,
      ops,
    });

    if (applied.status !== 200) {
      throw new Error(`Seeding the design failed: ${applied.status}`);
    }
  }

  await makeRepository(InterviewsRepository).setPhase(id, phase);

  const messages = makeRepository(InterviewMessagesRepository);
  const base = Date.now();

  for (const [index, [author, body]] of history.entries()) {
    await messages.insert({
      interviewId: id,
      author,
      body,
      createdAt: new Date(base + index + 1),
    });
  }

  return { user, id, designId };
};

export interface Outcome {
  replies: string[];
  calls: ToolCall[];
}

const interviewerMessages = async (user: TestClient, id: string) =>
  (
    await user.get<{ messages: Array<{ author: string; body: string }> }>(
      `${PATH}/${id}`,
    )
  ).body.messages
    .filter((message) => message.author === "interviewer")
    .map((message) => message.body);

const observe = async (
  { user, id }: Seeded,
  act: () => Promise<unknown>,
): Promise<Outcome> => {
  const before = (await interviewerMessages(user, id)).length;

  recorder().take();
  await act();
  await make(TurnScheduler).drain();

  return {
    replies: (await interviewerMessages(user, id)).slice(before),
    calls: recorder().take(),
  };
};

export const say = (seeded: Seeded, body: string) =>
  observe(seeded, () =>
    seeded.user.post(`${PATH}/${seeded.id}/messages`, { body }),
  );

export const editThenSettle = (
  seeded: Seeded,
  edit: (user: TestClient, base: string) => Promise<unknown>,
) =>
  observe(seeded, async () => {
    await edit(seeded.user, `${PATH}/${seeded.id}`);
    await seeded.user.post(`${PATH}/${seeded.id}/triggers`, {
      kind: "design-settled",
    });
  });

export const describeOutcome = ({ replies, calls }: Outcome): string =>
  [
    ...replies.map((reply) => `Interviewer said: ${reply}`),
    ...calls.map(
      (call) =>
        `Interviewer called ${call.name}(${JSON.stringify(call.input)})`,
    ),
  ].join("\n") || "The interviewer said nothing and called no tool.";

export interface Verdict {
  passed: boolean;
  reason: string;
}

const JUDGE_SYSTEM = `You grade one turn of an AI system design interviewer for an automated evaluation. You are given the situation, what the candidate did, what the interviewer said and which tools it called, and one question. Judge only that question, strictly and literally. Answer by calling the verdict tool once, with a one-sentence reason that quotes the interviewer.`;

export const judge = async (
  question: string,
  situation: string,
  outcome: Outcome,
): Promise<Verdict> => {
  let verdict: Verdict | null = null;

  for await (const event of recorder().inner.stream({
    role: "review",
    system: [{ text: JUDGE_SYSTEM }],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              "# Situation",
              situation,
              "",
              "# The interviewer's turn",
              describeOutcome(outcome),
              "",
              "# Question",
              question,
            ].join("\n"),
          },
        ],
      },
    ],
    tools: [
      {
        name: "verdict",
        description: "Record whether the turn passes.",
        inputSchema: {
          type: "object",
          properties: {
            passed: { type: "boolean" },
            reason: { type: "string" },
          },
          required: ["passed", "reason"],
        },
      },
    ],
    maxOutputTokens: 400,
    userId: "eval-judge",
    signal: new AbortController().signal,
  })) {
    if (event.type === "tool-use" && event.name === "verdict") {
      verdict = event.input as Verdict;
    }
  }

  return verdict ?? { passed: false, reason: "The judge gave no verdict." };
};
