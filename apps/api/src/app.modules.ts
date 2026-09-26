import type { AppModule } from "@/core/module";
import { accountsModule } from "@/modules/accounts";
import { authModule } from "@/modules/auth";
import { notificationsModule } from "@/modules/notifications";
import { oauthModule } from "@/modules/oauth";
import { sessionsModule } from "@/modules/sessions";
import { usersModule } from "@/modules/users";
import { verificationTokensModule } from "@/modules/verification-tokens";
import { cacheModule } from "@/platform/cache";
import { captchaModule } from "@/platform/captcha";
import { databaseModule } from "@/platform/database";
import { errorReportingModule } from "@/platform/error-reporting";
import { healthModule } from "@/platform/health";
import { jobsModule } from "@/platform/jobs";
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
  rateLimitModule,
  captchaModule,
  storageModule,
  notificationsModule,
  usersModule,
  accountsModule,
  authModule,
  oauthModule,
  verificationTokensModule,
  jobsModule,
] as const satisfies readonly AppModule[];
