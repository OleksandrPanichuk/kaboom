import { flattenBundle } from "@repo/scoring";
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
    const designs = makeService(DesignsService);
    const design = await designs.getOwned(
      interview.designId,
      interview.ownerId,
    );
    const { bundle } = await designs.bundleOf(design);

    return {
      content: describeDesign(flattenBundle(bundle), design.revision),
    };
  },
});
