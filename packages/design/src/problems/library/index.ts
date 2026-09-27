import { type ProblemContent, ProblemContentSchema } from "../schema";
import { photoUploads } from "./photo-uploads";
import { urlShortener } from "./url-shortener";

export const OFFICIAL_PROBLEMS: ProblemContent[] = [
  urlShortener,
  photoUploads,
].map((problem) => ProblemContentSchema.parse(problem));
