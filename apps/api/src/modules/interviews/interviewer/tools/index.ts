import type { InterviewPhase } from "@repo/design";

import type { InterviewerTool } from "../define-tool";
import { editDesignTool } from "./edit-design";
import { endInterviewTool } from "./end-interview";
import { highlightTool } from "./highlight";
import { noteEvidenceTool } from "./note-evidence";
import { readDesignTool } from "./read-design";
import { runDrillTool } from "./run-drill";
import { setPhaseTool } from "./set-phase";
import { staySilentTool } from "./stay-silent";

export const INTERVIEWER_TOOLS = [
  staySilentTool,
  readDesignTool,
  highlightTool,
  runDrillTool,
  setPhaseTool,
  noteEvidenceTool,
  editDesignTool,
  endInterviewTool,
] as unknown as readonly InterviewerTool[];

export const toolsFor = (phase: string): InterviewerTool[] =>
  INTERVIEWER_TOOLS.filter(
    (tool) =>
      tool.phases === "all" || tool.phases.includes(phase as InterviewPhase),
  );
