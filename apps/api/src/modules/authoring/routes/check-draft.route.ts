import { defineRoute } from "@/core/route";

import { CHECK_DRAFT_RATE_LIMIT } from "../authoring.constants";
import { PublishCheckModel } from "../authoring.model";
import type { AuthoringActions } from "../authoring.routes";
import { DraftParams } from "./draft-params";

export const checkDraftRoute = ({ checkDraft }: AuthoringActions) =>
  defineRoute({
    params: DraftParams,
    response: PublishCheckModel,
    summary: "Run the publish check on a draft",
    description:
      "The same check a review runs: the content parses, its drills name what the designs hold, it costs what a problem may, and its reference scores 100. Each issue carries the path to its field.",
    auth: true,
    rateLimit: CHECK_DRAFT_RATE_LIMIT,

    action: ({ params, user }) =>
      checkDraft.execute({ authorId: user.id, draftId: params.id }),
    postAction: ({ output }) =>
      output.ok
        ? { ok: true, issues: [] }
        : {
            ok: false,
            issues: output.issues.map(({ path, message }) => ({
              path: [...path],
              message,
            })),
          },
  });
