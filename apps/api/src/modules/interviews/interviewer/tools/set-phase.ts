import { INTERVIEW_PHASES } from "@repo/design";
import z from "zod";

import { makeRepository, makeService } from "@/core/registry";

import { InterviewsService } from "../../interviews.service";
import { InterviewsRepository } from "../../ports";
import { defineInterviewerTool } from "../define-tool";

export const setPhaseTool = defineInterviewerTool({
  name: "set_phase",
  description:
    "Move the interview to another phase once the current one's goal is met or its time is up, and say so to the candidate.",
  input: z.object({ phase: z.enum(INTERVIEW_PHASES) }),
  phases: "all",
  handle: async ({ phase }, { interview, pinned }) => {
    if (!pinned.interview.phases.some((plan) => plan.id === phase)) {
      return {
        content: `This interview has no ${phase} phase.`,
        isError: true,
      };
    }

    if (phase === interview.phase) {
      return { content: `The interview is already in ${phase}.` };
    }

    await makeService(InterviewsService).commit(interview.id, async (emit) => {
      await makeRepository(InterviewsRepository).setPhase(interview.id, phase);
      await emit("phase", { phase, from: interview.phase });
    });

    return { content: `The interview is now in ${phase}.` };
  },
});
