import type { DesignGraph } from "@repo/design";

import type { LlmContent, LlmMessage, SystemBlock } from "@/platform/llm";

import type {
  InterviewEntity,
  InterviewMessageEntity,
} from "../interview.entity";
import type { PinnedProblem } from "../interviews.service";
import { describeDesign } from "./describe-design";
import { interviewerPersona } from "./persona";
import type { Trigger } from "./triggers";

const minutesBetween = (from: Date, to: Date) =>
  Math.max(0, Math.round((to.getTime() - from.getTime()) / 60_000));

export const problemBlock = ({ content, interview }: PinnedProblem): string => {
  const drills = content.drills.filter((drill) =>
    interview.drillIds.includes(drill.id),
  );

  return [
    `# Problem: ${content.title}`,
    content.statement,
    "",
    "# Facts you know, to answer only when asked",
    ...interview.facts.map((fact) => `- ${fact.topic}: ${fact.answer}`),
    "",
    "# Phases",
    ...interview.phases.map(
      (phase) => `- ${phase.id} (${phase.minutes} min): ${phase.goal}`,
    ),
    "",
    "# Rubric, for note_evidence (never share it)",
    ...interview.rubric.map(
      (item) =>
        `- ${item.key} [${item.dimension}] ${item.title}. Listen for: ${item.signals.join("; ")}.`,
    ),
    "",
    "# Drills you may run with run_drill",
    ...drills.map(
      (drill) =>
        `- ${drill.id}: ${drill.title}. ${drill.description || "A fault the candidate does not know about in advance."}`,
    ),
  ].join("\n");
};

export const stateBlock = (
  interview: InterviewEntity,
  pinned: PinnedProblem,
  graph: DesignGraph,
  revision: number,
  now: Date,
): string => {
  const plan = pinned.interview.phases.find(
    (phase) => phase.id === interview.phase,
  );
  const inPhase = minutesBetween(interview.phaseStartedAt, now);

  return [
    "# Now",
    `Phase: ${interview.phase}, ${inPhase} of ${plan?.minutes ?? "?"} minutes used. ${minutesBetween(interview.startedAt, now)} minutes into the interview.`,
    "",
    "# The candidate's design",
    describeDesign(graph, revision),
  ].join("\n");
};

export const systemBlocks = (
  pinned: PinnedProblem,
  state: string,
): SystemBlock[] => [
  { text: interviewerPersona(pinned.content.track), cache: true },
  { text: problemBlock(pinned), cache: true },
  { text: state },
];

const TRIGGER_NOTES: Record<Trigger, string | null> = {
  "user-message": null,
  "design-settled":
    "(The candidate has stopped editing the design for a moment.)",
  "phase-timer": "(The current phase has used up its time.)",
};

export const historyMessages = (
  messages: InterviewMessageEntity[],
  triggers: readonly Trigger[],
): LlmMessage[] => {
  const turns: LlmMessage[] = [];
  const push = (role: LlmMessage["role"], content: LlmContent) => {
    const last = turns.at(-1);

    if (last?.role === role) last.content.push(content);
    else turns.push({ role, content: [content] });
  };

  push("user", { type: "text", text: "(The interview begins.)" });

  for (const message of messages) {
    if (message.author === "system" || message.body.trim() === "") continue;

    push(message.author === "user" ? "user" : "assistant", {
      type: "text",
      text: message.interrupted
        ? `${message.body} (cut off by the candidate)`
        : message.body,
    });
  }

  for (const trigger of triggers) {
    const note = TRIGGER_NOTES[trigger];

    if (note) push("user", { type: "text", text: note });
  }

  if (turns.at(-1)?.role !== "user") {
    push("user", { type: "text", text: "(Your turn.)" });
  }

  return turns;
};
