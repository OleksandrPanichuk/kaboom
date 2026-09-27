import type { AppModule } from "@/core/module";
import { accountsModule } from "@/modules/accounts";
import { authModule } from "@/modules/auth";
import { designsModule } from "@/modules/designs";
import { interviewsModule } from "@/modules/interviews";
import { notificationsModule } from "@/modules/notifications";
import { oauthModule } from "@/modules/oauth";
import { problemsModule } from "@/modules/problems";
import { sessionsModule } from "@/modules/sessions";
import { simulationsModule } from "@/modules/simulations";
import { submissionsModule } from "@/modules/submissions";
import { usersModule } from "@/modules/users";
import { verificationTokensModule } from "@/modules/verification-tokens";
import { cacheModule } from "@/platform/cache";
import { captchaModule } from "@/platform/captcha";
import { databaseModule } from "@/platform/database";
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
  jobsModule,
] as const satisfies readonly AppModule[];
