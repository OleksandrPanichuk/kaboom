import z from "zod";

import { makeService } from "@/core/registry";
import { DesignsService } from "@/modules/designs";

import { InterviewsService } from "../../interviews.service";
import { defineInterviewerTool } from "../define-tool";

export const highlightTool = defineInterviewerTool({
  name: "highlight",
  description:
    "Point at nodes on the candidate's canvas while you talk about them.",
  input: z.object({
    nodeIds: z.array(z.string()).min(1).max(10),
    note: z.string().max(200).optional(),
  }),
  phases: "all",
  handle: async ({ nodeIds, note }, { interview }) => {
    const design = await makeService(DesignsService).getOwned(
      interview.designId,
      interview.ownerId,
    );
    const present = new Set(design.graph.nodes.map((node) => node.id));
    const missing = nodeIds.filter((id) => !present.has(id));

    if (missing.length > 0) {
      return {
        content: `The design has no node ${missing.join(", ")}.`,
        isError: true,
      };
    }

    await makeService(InterviewsService).commit(interview.id, (emit) =>
      emit("highlight", { nodeIds, ...(note ? { note } : {}) }),
    );

    return { content: `Highlighted ${nodeIds.join(", ")}.` };
  },
});
