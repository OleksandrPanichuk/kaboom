import type { Track } from "@repo/design";

import type { PinnedProblem } from "@/modules/interviews";

import type { Evidence } from "./evidence";

const INTERVIEW_KINDS: Record<Track, string> = {
  "system-design": "system design",
  devops: "DevOps",
  "data-model": "data modelling",
};

export const reviewerPersona = (
  track: Track,
): string => `You are a staff engineer writing the review of a ${INTERVIEW_KINDS[track]} interview that has just ended. The candidate will read it, so write to them directly, plainly and specifically. You were not the interviewer; you judge from the record alone.

How you score
- Score every rubric item from 0 to 3: 0 when the record shows nothing for it or shows it done wrong, 1 when it is weak or only partly there, 2 when it is solid, 3 when it is strong and well reasoned. Most candidates earn a mix; do not round up to be kind.
- Judge what the candidate said and drew, never what the interviewer said. An idea the interviewer had to hand them is worth little.
- Every score above 0 cites the evidence it rests on by label: M for a message, N for an interviewer's note, D for a drill run against the final design, C for an automated check. Cite only labels that appear in the record.
- The drills and checks ran on the design as it stood when the interview ended, so they are facts about the final design. A fix the candidate talked about but never drew does not change them.
- The rationale says what the score rests on and what would have raised it, in two or three sentences.

What you write
- A summary of how the interview went, in one short paragraph.
- Up to five strengths and up to five things to improve, most important first. Each is one concrete sentence about this interview, never generic advice.
- Never reveal a reference solution or quote rubric weights.

Answer only by calling submit_review.`;

export const reviewRecord = (
  pinned: PinnedProblem,
  evidence: Evidence,
  design: string,
): string => {
  const section = (kind: string) =>
    evidence.entries
      .filter((entry) => entry.kind === kind)
      .map((entry) => `${entry.label}. ${entry.text}`);

  return [
    `# Problem: ${pinned.content.title}`,
    pinned.content.statement,
    "",
    "# Rubric",
    ...pinned.interview.rubric.map((item) =>
      [
        `## ${item.key}: ${item.title} (${item.dimension})`,
        `Listen for: ${item.signals.join("; ")}.`,
        `Notes for it: ${
          evidence
            .notesFor(item.key)
            .map((note) => note.label)
            .join(", ") || "none"
        }.`,
      ].join("\n"),
    ),
    "",
    "# Transcript",
    ...section("message"),
    "",
    "# The interviewer's notes",
    ...(section("note").length > 0 ? section("note") : ["None."]),
    "",
    "# The final design",
    design,
    "",
    "# Drills run against the final design",
    ...(section("drill").length > 0 ? section("drill") : ["None."]),
    "",
    "# Automated checks of the final design",
    ...section("check"),
  ].join("\n");
};
