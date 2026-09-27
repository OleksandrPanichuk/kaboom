import z from "zod";

import { makeRepository, makeService } from "@/core/registry";
import { DesignsService } from "@/modules/designs";

import { EvidenceNotesRepository } from "../../ports";
import { defineInterviewerTool } from "../define-tool";

export const noteEvidenceTool = defineInterviewerTool({
  name: "note_evidence",
  description:
    "Record, silently, something the candidate said or did that bears on one rubric item, good or bad, quoting them where you can. The review is written from these notes.",
  input: z.object({
    rubricKey: z.string(),
    note: z.string().min(1).max(600),
    quote: z.string().max(600).optional(),
  }),
  phases: "all",
  handle: async ({ rubricKey, note, quote }, { interview, pinned }) => {
    if (!pinned.interview.rubric.some((item) => item.key === rubricKey)) {
      return {
        content: `There is no rubric item ${rubricKey}. Items: ${pinned.interview.rubric.map((item) => item.key).join(", ")}.`,
        isError: true,
      };
    }

    const design = await makeService(DesignsService).getOwned(
      interview.designId,
      interview.ownerId,
    );

    await makeRepository(EvidenceNotesRepository).insert({
      interviewId: interview.id,
      rubricItemKey: rubricKey,
      note,
      quote: quote ?? null,
      revision: design.revision,
    });

    return { content: "Noted." };
  },
});
