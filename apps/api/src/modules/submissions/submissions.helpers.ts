import { penalised } from "@repo/design";

import { DESIGN_REVIEW_WEIGHT } from "./submissions.constants";

export const blendedScore = (
  deterministic: number,
  review: number,
  hintPenalty: number,
): number =>
  penalised(
    Math.round(
      (1 - DESIGN_REVIEW_WEIGHT) * deterministic +
        DESIGN_REVIEW_WEIGHT * review,
    ),
    hintPenalty,
  );
