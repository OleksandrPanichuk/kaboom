import { type ProblemContent, ProblemContentSchema } from "../schema";
import { blogTags } from "./blog-tags";
import { cardPayments } from "./card-payments";
import { catalogueVariants } from "./catalogue-variants";
import { chat } from "./chat";
import { chatMessages } from "./chat-messages";
import { fareSearch } from "./fare-search";
import { flashSaleCheckout } from "./flash-sale-checkout";
import { gameLeaderboard } from "./game-leaderboard";
import { jobQueue } from "./job-queue";
import { latencyRegression } from "./latency-regression";
import { monorepoPipeline } from "./monorepo-pipeline";
import { newsFeed } from "./news-feed";
import { notifications } from "./notifications";
import { ordersOneTable } from "./orders-one-table";
import { photoUploads } from "./photo-uploads";
import { productCatalogue } from "./product-catalogue";
import { productSearch } from "./product-search";
import { rateLimitedApi } from "./rate-limited-api";
import { roomBooking } from "./room-booking";
import { schemaMigration } from "./schema-migration";
import { secretRotation } from "./secret-rotation";
import { serverlessTickets } from "./serverless-tickets";
import { shopOrders } from "./shop-orders";
import { signupAudit } from "./signup-audit";
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
  serverlessTickets,
  flashSaleCheckout,
  zeroDowntimeRollout,
  latencyRegression,
  monorepoPipeline,
  threeTierVpc,
  secretRotation,
  schemaMigration,
  blogTags,
  shopOrders,
  roomBooking,
  signupAudit,
  jobQueue,
  productSearch,
  catalogueVariants,
  chatMessages,
  ordersOneTable,
  gameLeaderboard,
].map((problem) => ProblemContentSchema.parse(problem));
