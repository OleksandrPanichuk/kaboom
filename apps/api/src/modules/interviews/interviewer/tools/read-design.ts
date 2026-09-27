import z from "zod";

import { makeService } from "@/core/registry";
import { DesignsService } from "@/modules/designs";

import { defineInterviewerTool } from "../define-tool";
import { describeDesign } from "../describe-design";

export const readDesignTool = defineInterviewerTool({
  name: "read_design",
  description:
    "Read the candidate's design as it is now: every node with its properties, every edge, and what the checks find.",
  input: z.object({}),
  phases: "all",
  handle: async (_input, { interview }) => {
    const design = await makeService(DesignsService).getOwned(
      interview.designId,
      interview.ownerId,
    );

    return { content: describeDesign(design.graph, design.revision) };
  },
});
