import {
  anthropicClient,
  AnthropicLanguageModel,
} from "@/adapters/llm/anthropic";
import { loadEnv } from "@/configs";
import type { LlmEvent } from "@/platform/llm";

const env = loadEnv();

if (!env.ANTHROPIC_API_KEY) {
  console.error("Set ANTHROPIC_API_KEY to run the smoke test.");
  process.exit(1);
}

const model = new AnthropicLanguageModel({
  client: anthropicClient(env.ANTHROPIC_API_KEY),
  models: {
    interviewer: env.LLM_INTERVIEWER_MODEL,
    review: env.LLM_REVIEW_MODEL,
  },
});

const events: LlmEvent[] = [];

for await (const event of model.stream({
  role: "interviewer",
  system: [
    {
      text: "You are a system design interviewer. Answer in one sentence, then point at the node you mean.",
      cache: true,
    },
  ],
  messages: [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "Is my single database a problem? It is node db.",
        },
      ],
    },
  ],
  tools: [
    {
      name: "highlight",
      description: "Point at nodes on the canvas",
      inputSchema: {
        type: "object",
        properties: { nodeIds: { type: "array", items: { type: "string" } } },
        required: ["nodeIds"],
      },
    },
  ],
  maxOutputTokens: 300,
  userId: "smoke-test",
  signal: new AbortController().signal,
})) {
  events.push(event);
  if (event.type === "text-delta") process.stdout.write(event.text);
}

console.log("\n");
console.log(
  events
    .filter((event) => event.type !== "text-delta")
    .map((event) => JSON.stringify(event))
    .join("\n"),
);
