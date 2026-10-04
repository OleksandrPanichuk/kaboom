import { type ProblemContent, ProblemContentSchema } from "../schema";
import { cardPayments } from "./card-payments";
import { chat } from "./chat";
import { fareSearch } from "./fare-search";
import { latencyRegression } from "./latency-regression";
import { monorepoPipeline } from "./monorepo-pipeline";
import { newsFeed } from "./news-feed";
import { notifications } from "./notifications";
import { photoUploads } from "./photo-uploads";
import { productCatalogue } from "./product-catalogue";
import { rateLimitedApi } from "./rate-limited-api";
import { schemaMigration } from "./schema-migration";
import { secretRotation } from "./secret-rotation";
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
  productCatalogue,
  cardPayments,
  fareSearch,
  zeroDowntimeRollout,
  latencyRegression,
  monorepoPipeline,
  threeTierVpc,
  secretRotation,
  schemaMigration,
].map((problem) => ProblemContentSchema.parse(problem));
