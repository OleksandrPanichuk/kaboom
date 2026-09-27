import { parseDesignOps } from "@repo/design";
import z from "zod";

import { AppError } from "@/core/errors";
import { make, makeService } from "@/core/registry";
import { DesignsService } from "@/modules/designs";

import { ApplyInterviewOpsUseCase } from "../../use-cases/apply-interview-ops";
import { defineInterviewerTool } from "../define-tool";

export const editDesignTool = defineInterviewerTool({
  name: "edit_design",
  description:
    "Change the candidate's design, only when they ask you to or to set up a scenario you describe out loud. Takes design operations: add-node, update-node, remove-node, add-edge, update-edge, remove-edge, add-group, update-group, remove-group.",
  input: z.object({
    ops: z.array(z.unknown()).min(1).max(20),
    reason: z.string().max(300),
  }),
  phases: "all",
  handle: async ({ ops }, { interview }) => {
    const parsed = parseDesignOps(ops);

    if (!parsed.ok) {
      return {
        content: `Operation ${parsed.index} is not valid: ${parsed.message}`,
        isError: true,
      };
    }

    const design = await makeService(DesignsService).getOwned(
      interview.designId,
      interview.ownerId,
    );

    try {
      const saved = await make(ApplyInterviewOpsUseCase).execute({
        ownerId: interview.ownerId,
        id: interview.id,
        author: "interviewer",
        baseRevision: design.revision,
        ops: parsed.ops,
      });

      return { content: `Applied as revision ${saved.revision}.` };
    } catch (error) {
      if (error instanceof AppError) {
        return { content: error.message, isError: true };
      }

      throw error;
    }
  },
});
