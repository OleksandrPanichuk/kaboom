import { type ProblemContent, ProblemContentSchema } from "../schema";
import { chat } from "./chat";
import { latencyRegression } from "./latency-regression";
import { monorepoPipeline } from "./monorepo-pipeline";
import { newsFeed } from "./news-feed";
import { notifications } from "./notifications";
import { photoUploads } from "./photo-uploads";
import { rateLimitedApi } from "./rate-limited-api";
import { threeTierVpc } from "./three-tier-vpc";
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
  latencyRegression,
  monorepoPipeline,
  threeTierVpc,
].map((problem) => ProblemContentSchema.parse(problem));
