import type { AppModule } from "@/core/module";
import { accountsModule } from "@/modules/accounts";
import { authModule } from "@/modules/auth";
import { designsModule } from "@/modules/designs";
import { interviewsModule } from "@/modules/interviews";
import { leaderboardModule } from "@/modules/leaderboard";
import { notificationsModule } from "@/modules/notifications";
import { oauthModule } from "@/modules/oauth";
import { problemsModule } from "@/modules/problems";
import { progressModule } from "@/modules/progress";
import { reviewsModule } from "@/modules/reviews";
import { sessionsModule } from "@/modules/sessions";
import { simulationsModule } from "@/modules/simulations";
import { skillsModule } from "@/modules/skills";
import { submissionsModule } from "@/modules/submissions";
import { usersModule } from "@/modules/users";
import { verificationTokensModule } from "@/modules/verification-tokens";
import { cacheModule } from "@/platform/cache";
import { captchaModule } from "@/platform/captcha";
import { databaseModule } from "@/platform/database";
import { designTestingModule } from "@/platform/design-testing";
import { errorReportingModule } from "@/platform/error-reporting";
import { healthModule } from "@/platform/health";
import { jobsModule } from "@/platform/jobs";
import { llmModule } from "@/platform/llm";
import { metricsModule } from "@/platform/metrics";
import { rateLimitModule } from "@/platform/rate-limit";
import { realtimeModule } from "@/platform/realtime";
import { storageModule } from "@/platform/storage";

export const modules = [
  errorReportingModule,
  metricsModule,
  databaseModule,
  healthModule,
  sessionsModule,
  cacheModule,
  realtimeModule,
  llmModule,
  designTestingModule,
  rateLimitModule,
  captchaModule,
  storageModule,
  notificationsModule,
  usersModule,
  accountsModule,
  authModule,
  oauthModule,
  verificationTokensModule,
  designsModule,
  simulationsModule,
  problemsModule,
  submissionsModule,
  interviewsModule,
  skillsModule,
  reviewsModule,
  progressModule,
  leaderboardModule,
  jobsModule,
] as const satisfies readonly AppModule[];
