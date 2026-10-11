import { penalised, type TestReport } from "@repo/scoring";

import { DESIGN_REVIEW_WEIGHT } from "./submissions.constants";

export const passesEverything = ({ summary }: TestReport): boolean =>
  summary.passed > 0 &&
  summary.failed === 0 &&
  summary.flaky === 0 &&
  summary.skipped === 0;

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
