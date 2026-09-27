import { type ProblemContent, ProblemContentSchema } from "../schema";
import { urlShortener } from "./url-shortener";

export const OFFICIAL_PROBLEMS: ProblemContent[] = [urlShortener].map(
  (problem) => ProblemContentSchema.parse(problem),
);
