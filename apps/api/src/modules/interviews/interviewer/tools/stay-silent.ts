import z from "zod";

import { defineInterviewerTool } from "../define-tool";

export const staySilentTool = defineInterviewerTool({
  name: "stay_silent",
  description:
    "Say nothing this turn. Use it when the candidate is working and nothing needs saying yet, which is most of the time after a design change.",
  input: z.object({
    reason: z.string().max(200).describe("Why silence is right, for the log"),
  }),
  phases: "all",
  handle: () => Promise.resolve({ content: "You stayed silent.", ends: true }),
});
