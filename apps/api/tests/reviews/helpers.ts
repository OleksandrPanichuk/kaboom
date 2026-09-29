import type { DesignOp } from "@repo/design";
import { OFFICIAL_PROBLEMS } from "@repo/design/library";
import type { TestClient } from "@tests/helpers";

import type {
  ScriptedLanguageModel,
  ScriptStep,
} from "@/adapters/llm/scripted.language-model";
import { make } from "@/core/registry";
import { LanguageModel } from "@/platform/llm";

export const shortener = OFFICIAL_PROBLEMS.find(
  (problem) => problem.slug === "url-shortener",
)!;

export const RUBRIC_KEYS = shortener.interview!.rubric.map((item) => item.key);

export interface DraftItem {
  key: string;
  score: number;
  rationale: string;
  citations: string[];
}

export const model = () => make(LanguageModel) as ScriptedLanguageModel;

export const reviewRequests = () =>
  model().requests.filter((request) => request.role === "review");

export const itemsScoring = (
  score: number,
  citations: string[],
  keys: readonly string[] = RUBRIC_KEYS,
): DraftItem[] =>
  keys.map((key) => ({
    key,
    score,
    rationale: `${key} was solid.`,
    citations,
  }));

export const reviewAnswer = (
  items: DraftItem[] = itemsScoring(2, ["M2"]),
  id = "review-1",
): ScriptStep[] => [
  {
    type: "tool-use",
    id,
    name: "submit_review",
    input: {
      summary: "A solid interview with a clear read path.",
      strengths: ["Asked about traffic before drawing."],
      improvements: ["Estimate the storage before choosing a database."],
      items,
    },
  },
];

export const referenceOps = (): DesignOp[] => [
  ...shortener.reference.graph.nodes
    .filter((node) => node.id !== "users")
    .map((node): DesignOp => ({ op: "add-node", node })),
  ...shortener.reference.graph.edges.map((edge): DesignOp => ({
    op: "add-edge",
    edge,
  })),
];

export const buildReference = (user: TestClient, id: string) =>
  user.post<{ revision: number }>(`/api/interviews/${id}/ops`, {
    baseRevision: 0,
    ops: referenceOps(),
  });
