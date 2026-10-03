import { type ProblemContent, ProblemContentSchema } from "../schema";
import { chat } from "./chat";
import { newsFeed } from "./news-feed";
import { notifications } from "./notifications";
import { photoUploads } from "./photo-uploads";
import { rateLimitedApi } from "./rate-limited-api";
import { urlShortener } from "./url-shortener";
import { zeroDowntimeRollout } from "./zero-downtime-rollout";

export const OFFICIAL_PROBLEMS: ProblemContent[] = [
  urlShortener,
  photoUploads,
  rateLimitedApi,
  notifications,
  newsFeed,
  chat,
  zeroDowntimeRollout,
].map((problem) => ProblemContentSchema.parse(problem));
