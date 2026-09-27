import { drillScenario, runDrill } from "@repo/design";
import z from "zod";

import { make, makeService } from "@/core/registry";
import { DesignsService } from "@/modules/designs";

import { RunInterviewSimulationUseCase } from "../../use-cases/run-interview-simulation";
import { defineInterviewerTool } from "../define-tool";

export const runDrillTool = defineInterviewerTool({
  name: "run_drill",
  description:
    "Run one of the problem's drills against the candidate's design: its traffic and faults, as the problem block lists them. With show, the candidate sees the run on the canvas; without it only you see the result.",
  input: z.object({
    drillId: z.string(),
    show: z.boolean().default(true),
  }),
  phases: ["high-level", "deep-dive", "wrap-up"],
  handle: async ({ drillId, show }, { interview, pinned }) => {
    const drill = pinned.content.drills.find((item) => item.id === drillId);

    if (!drill || !pinned.interview.drillIds.includes(drillId)) {
      return {
        content: `There is no drill ${drillId}. Drills you may run: ${pinned.interview.drillIds.join(", ")}.`,
        isError: true,
      };
    }

    const design = await makeService(DesignsService).getOwned(
      interview.designId,
      interview.ownerId,
    );
    const outcome = runDrill(drill, design.graph);
    const run = await make(RunInterviewSimulationUseCase).execute({
      ownerId: interview.ownerId,
      id: interview.id,
      scenario: drillScenario(drill, design.graph),
      requestedBy: "interviewer",
      drillId,
      show,
    });
    const findings = run.findings
      .slice(0, 6)
      .map((finding) => `- ${finding.message}`);

    return {
      content: [
        `Drill "${drill.title}" on revision ${run.revision}: ${outcome.passed ? "passed" : "failed"}.`,
        ...outcome.failures.map((failure) => `- ${failure}`),
        findings.length > 0 ? "Findings:" : "No findings.",
        ...findings,
      ].join("\n"),
    };
  },
});
