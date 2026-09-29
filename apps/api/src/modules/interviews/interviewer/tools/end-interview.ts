import z from "zod";

import { make } from "@/core/registry";

import { SubmitInterviewUseCase } from "../../use-cases/submit-interview";
import { defineInterviewerTool } from "../define-tool";

export const endInterviewTool = defineInterviewerTool({
  name: "end_interview",
  description:
    "End the interview once you have wrapped up and said goodbye, or when the candidate asks to stop. The design is locked and goes to review.",
  input: z.object({ reason: z.string().max(300) }),
  phases: "all",
  handle: async (_input, { interview }) => {
    await make(SubmitInterviewUseCase).execute({
      ownerId: interview.ownerId,
      id: interview.id,
      duringTurn: true,
    });

    return { content: "The interview has ended.", ends: true };
  },
});
