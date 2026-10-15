import type { AppModule } from "@/core/module";
import { accountsModule } from "@/modules/accounts";
import { authModule } from "@/modules/auth";
import { authoringModule } from "@/modules/authoring";
import { billingCustomersModule } from "@/modules/billing-customers";
import { billingEventsModule } from "@/modules/billing-events";
import { billingOffersModule } from "@/modules/billing-offers";
import { billingProviderModule } from "@/modules/billing-provider";
import { billingReconciliationModule } from "@/modules/billing-reconciliation";
import { billingTaxIdsModule } from "@/modules/billing-tax-ids";
import { designsModule } from "@/modules/designs";
import { disputesModule } from "@/modules/disputes";
import { interviewsModule } from "@/modules/interviews";
import { invoicesModule } from "@/modules/invoices";
import { leaderboardModule } from "@/modules/leaderboard";
import { notificationsModule } from "@/modules/notifications";
import { oauthModule } from "@/modules/oauth";
import { paymentsModule } from "@/modules/payments";
import { problemsModule } from "@/modules/problems";
import { profilesModule } from "@/modules/profiles";
import { progressModule } from "@/modules/progress";
import { purchasesModule } from "@/modules/purchases";
import { refundsModule } from "@/modules/refunds";
import { reviewsModule } from "@/modules/reviews";
import { sessionsModule } from "@/modules/sessions";
import { simulationsModule } from "@/modules/simulations";
import { skillsModule } from "@/modules/skills";
import { submissionsModule } from "@/modules/submissions";
import { subscriptionsModule } from "@/modules/subscriptions";
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
  authoringModule,
  submissionsModule,
  interviewsModule,
  skillsModule,
  reviewsModule,
  progressModule,
  leaderboardModule,
  profilesModule,
  billingProviderModule,
  billingOffersModule,
  billingEventsModule,
  billingCustomersModule,
  subscriptionsModule,
  invoicesModule,
  paymentsModule,
  purchasesModule,
  refundsModule,
  disputesModule,
  billingTaxIdsModule,
  billingReconciliationModule,
  jobsModule,
] as const satisfies readonly AppModule[];
