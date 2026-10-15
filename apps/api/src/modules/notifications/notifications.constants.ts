export const EmailKind = {
  EmailVerification: "email_verification",
  PasswordReset: "password_reset",
  PasswordChanged: "password_changed",
  NewSignIn: "new_sign_in",
  EmailChange: "email_change",
  EmailChanged: "email_changed",
  ReviewReady: "review_ready",
  ProStarted: "pro_started",
  PaymentFailed: "payment_failed",
  SubscriptionEnded: "subscription_ended",
  PurchaseRefunded: "purchase_refunded",
} as const;

export type EmailKind = (typeof EmailKind)[keyof typeof EmailKind];

export const NOTIFICATIONS_QUEUE = "notifications";

export const NotificationQueueJobs = {
  SendEmail: "notifications.send-email",
} as const;
