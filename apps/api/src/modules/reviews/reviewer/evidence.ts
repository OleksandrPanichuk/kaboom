import type { DrillScore, ItemScore } from "@repo/design";

import type { EvidenceNoteRow } from "@/db";
import type { InterviewMessageEntity } from "@/modules/interviews";

import type { ReviewCitation } from "../review.entity";

export interface EvidenceSources {
  messages: InterviewMessageEntity[];
  notes: EvidenceNoteRow[];
  checks: ItemScore[];
  drills: DrillScore[];
}

export interface Evidence {
  entries: ReviewCitation[];
  byLabel: Map<string, ReviewCitation>;
  notesFor: (itemKey: string) => ReviewCitation[];
}

const AUTHORS = { user: "Candidate", interviewer: "Interviewer" } as const;

const outcome = (passed: boolean) => (passed ? "passed" : "failed");

export const collectEvidence = ({
  messages,
  notes,
  checks,
  drills,
}: EvidenceSources): Evidence => {
  const spoken = messages.filter(
    (message) => message.author !== "system" && message.body.trim() !== "",
  );
  const noted = notes.map((note, index) => ({
    itemKey: note.rubricItemKey,
    citation: {
      label: `N${index + 1}`,
      kind: "note" as const,
      text: note.quote ? `${note.note} (“${note.quote}”)` : note.note,
    },
  }));
  const entries: ReviewCitation[] = [
    ...spoken.map((message, index) => ({
      label: `M${index + 1}`,
      kind: "message" as const,
      text: `${AUTHORS[message.author as keyof typeof AUTHORS]}: ${message.body}`,
    })),
    ...noted.map((note) => note.citation),
    ...drills.map((drill, index) => ({
      label: `D${index + 1}`,
      kind: "drill" as const,
      text: [
        `${drill.title}: ${outcome(drill.passed)}`,
        ...drill.failures,
      ].join(". "),
    })),
    ...checks.map((check, index) => ({
      label: `C${index + 1}`,
      kind: "check" as const,
      text: `${check.title}: ${outcome(check.passed)}. ${check.evidence}`,
    })),
  ];

  return {
    entries,
    byLabel: new Map(entries.map((entry) => [entry.label, entry])),
    notesFor: (itemKey) =>
      noted
        .filter((note) => note.itemKey === itemKey)
        .map((note) => note.citation),
  };
};
