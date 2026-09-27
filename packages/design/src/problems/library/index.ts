import { type ProblemContent, ProblemContentSchema } from "../schema";
import { chat } from "./chat";
import { newsFeed } from "./news-feed";
import { notifications } from "./notifications";
import { photoUploads } from "./photo-uploads";
import { rateLimitedApi } from "./rate-limited-api";
import { urlShortener } from "./url-shortener";

export const OFFICIAL_PROBLEMS: ProblemContent[] = [
  urlShortener,
  photoUploads,
  rateLimitedApi,
  notifications,
  newsFeed,
  chat,
].map((problem) => ProblemContentSchema.parse(problem));
