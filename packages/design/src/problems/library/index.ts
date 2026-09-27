import { type ProblemContent, ProblemContentSchema } from "../schema";
import { notifications } from "./notifications";
import { photoUploads } from "./photo-uploads";
import { rateLimitedApi } from "./rate-limited-api";
import { urlShortener } from "./url-shortener";

export const OFFICIAL_PROBLEMS: ProblemContent[] = [
  urlShortener,
  photoUploads,
  rateLimitedApi,
  notifications,
].map((problem) => ProblemContentSchema.parse(problem));
