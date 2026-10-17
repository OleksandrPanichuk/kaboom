import { make } from "@/core/registry";
import { Service } from "@/core/service";

import { type EmailClient, SendEmailJob } from "./jobs";
import { EmailKind } from "./notifications.constants";

interface AuthNotificationRecipient {
  userId: string;
  email: string;
  name?: string;
}

interface SendEmailVerificationOptions extends AuthNotificationRecipient {
  verificationUrl: string;
  expiresInHours: number;
}

interface SendPasswordResetOptions extends AuthNotificationRecipient {
  resetUrl: string;
  expiresInMinutes: number;
}

interface SendSecurityNoticeOptions extends AuthNotificationRecipient {
  occurredAt: Date;
  client: EmailClient;
  securityUrl: string;
}

interface SendEmailChangeOptions extends AuthNotificationRecipient {
  confirmUrl: string;
  expiresInHours: number;
}

interface SendEmailChangedOptions extends AuthNotificationRecipient {
  newEmail: string;
  securityUrl: string;
}

interface SendReviewReadyOptions extends AuthNotificationRecipient {
  reviewUrl: string;
}

interface SendCommentDigestOptions extends AuthNotificationRecipient {
  problemTitle: string;
  problemUrl: string;
  count: number;
  asAuthor: boolean;
  first: { author: string; excerpt: string; spoiler: boolean };
}

interface BillingNotice extends AuthNotificationRecipient {
  billingUrl: string;
}

export class NotificationsService extends Service {
  private readonly sendEmail = make(SendEmailJob);

  public sendEmailVerification(
    options: SendEmailVerificationOptions,
  ): Promise<void> {
    const { userId, email, name, verificationUrl, expiresInHours } = options;

    return this.sendEmail.dispatch({
      kind: EmailKind.EmailVerification,
      to: { userId, email, name },
      verificationUrl,
      expiresInHours,
    });
  }

  public sendReviewReady({
    userId,
    email,
    name,
    reviewUrl,
  }: SendReviewReadyOptions): Promise<void> {
    return this.sendEmail.dispatch({
      kind: EmailKind.ReviewReady,
      to: { userId, email, name },
      reviewUrl,
    });
  }

  public sendCommentDigest({
    userId,
    email,
    name,
    ...digest
  }: SendCommentDigestOptions): Promise<void> {
    return this.sendEmail.dispatch({
      kind: EmailKind.CommentDigest,
      to: { userId, email, name },
      ...digest,
    });
  }

  public sendProStarted({
    userId,
    email,
    name,
    billingUrl,
    lifetime,
  }: BillingNotice & { lifetime: boolean }): Promise<void> {
    return this.sendEmail.dispatch({
      kind: EmailKind.ProStarted,
      to: { userId, email, name },
      lifetime,
      billingUrl,
    });
  }

  public sendPaymentFailed({
    userId,
    email,
    name,
    billingUrl,
  }: BillingNotice): Promise<void> {
    return this.sendEmail.dispatch({
      kind: EmailKind.PaymentFailed,
      to: { userId, email, name },
      billingUrl,
    });
  }

  public sendSubscriptionEnded({
    userId,
    email,
    name,
    billingUrl,
    endedAt,
  }: BillingNotice & { endedAt: Date }): Promise<void> {
    return this.sendEmail.dispatch({
      kind: EmailKind.SubscriptionEnded,
      to: { userId, email, name },
      endedAt: endedAt.toISOString(),
      billingUrl,
    });
  }

  public sendPurchaseRefunded({
    userId,
    email,
    name,
    billingUrl,
    amount,
    currency,
  }: BillingNotice & { amount: number; currency: string }): Promise<void> {
    return this.sendEmail.dispatch({
      kind: EmailKind.PurchaseRefunded,
      to: { userId, email, name },
      amount,
      currency,
      billingUrl,
    });
  }

  public sendPasswordChanged(
    options: SendSecurityNoticeOptions,
  ): Promise<void> {
    return this.sendEmail.dispatch({
      kind: EmailKind.PasswordChanged,
      ...this.securityNotice(options),
    });
  }

  public sendNewSignIn(options: SendSecurityNoticeOptions): Promise<void> {
    return this.sendEmail.dispatch({
      kind: EmailKind.NewSignIn,
      ...this.securityNotice(options),
    });
  }

  private securityNotice({
    userId,
    email,
    name,
    occurredAt,
    client,
    securityUrl,
  }: SendSecurityNoticeOptions) {
    return {
      to: { userId, email, name },
      occurredAt: occurredAt.toISOString(),
      client,
      securityUrl,
    };
  }

  public sendEmailChange(options: SendEmailChangeOptions): Promise<void> {
    const { userId, email, name, confirmUrl, expiresInHours } = options;

    return this.sendEmail.dispatch({
      kind: EmailKind.EmailChange,
      to: { userId, email, name },
      confirmUrl,
      expiresInHours,
    });
  }

  public sendEmailChanged(options: SendEmailChangedOptions): Promise<void> {
    const { userId, email, name, newEmail, securityUrl } = options;

    return this.sendEmail.dispatch({
      kind: EmailKind.EmailChanged,
      to: { userId, email, name },
      newEmail,
      securityUrl,
    });
  }

  public sendPasswordReset(options: SendPasswordResetOptions): Promise<void> {
    const { userId, email, name, resetUrl, expiresInMinutes } = options;

    return this.sendEmail.dispatch({
      kind: EmailKind.PasswordReset,
      to: { userId, email, name },
      resetUrl,
      expiresInMinutes,
    });
  }
}
