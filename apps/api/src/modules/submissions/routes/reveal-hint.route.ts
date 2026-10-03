import { defineRoute } from "@/core/route";

import { RevealedHintModel } from "../submission.model";
import type { SubmissionsActions } from "../submissions.routes";
import { HintParams } from "./hint-params";

export const revealHintRoute = ({ revealHint }: SubmissionsActions) =>
  defineRoute({
    params: HintParams,
    response: RevealedHintModel,
    summary: "Reveal the next hint of a problem, or read one already revealed",
    description:
      "Hints open in order and each costs the points it names on every later submission. Revealing one again costs nothing. Answers 409 HINT_OUT_OF_ORDER for a hint after the next one, and 404 HINT_NOT_FOUND past the last.",
    auth: true,

    action: ({ params, user }) =>
      revealHint.execute({
        userId: user.id,
        slug: params.slug,
        index: params.index,
      }),
  });
