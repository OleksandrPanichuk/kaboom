import { SECOND } from "@/constants";
import { make } from "@/core/registry";
import { type EnqueueJobOptions, Job } from "@/platform/jobs";

import {
  EmailKind,
  NotificationQueueJobs,
  NOTIFICATIONS_QUEUE,
} from "../../notifications.constants";
import { Mailer } from "../../ports";
import {
  type RenderedEmail,
  renderEmailChangedEmail,
  renderEmailChangeEmail,
  renderEmailVerificationEmail,
  renderNewSignInEmail,
  renderPasswordChangedEmail,
  renderPasswordResetEmail,
  renderReviewReadyEmail,
} from "../../templates";
import { type SendEmailPayload, SendEmailPayloadSchema } from "./schema";

export class SendEmailJob extends Job<SendEmailPayload> {
  public readonly name = NotificationQueueJobs.SendEmail;
  public readonly queue = NOTIFICATIONS_QUEUE;
  public readonly schema = SendEmailPayloadSchema;

  public readonly defaults: EnqueueJobOptions = {
    attempts: 5,
    backoff: { type: "exponential", delayMs: 5 * SECOND },
  };

  private readonly mailer = make(Mailer);

  public async handle(payload: SendEmailPayload): Promise<void> {
    await this.mailer.send({ to: payload.to, ...this.render(payload) });
  }

  private render(payload: SendEmailPayload): RenderedEmail {
    switch (payload.kind) {
      case EmailKind.EmailVerification:
        return renderEmailVerificationEmail({
          name: payload.to.name,
          actionUrl: payload.verificationUrl,
          noteText: `This link will expire in ${payload.expiresInHours} hours.`,
        });

      case EmailKind.PasswordReset:
        return renderPasswordResetEmail({
          name: payload.to.name,
          actionUrl: payload.resetUrl,
          noteText: `This password reset link expires in ${payload.expiresInMinutes} minutes.`,
        });

      case EmailKind.PasswordChanged:
        return renderPasswordChangedEmail({
          name: payload.to.name,
          occurredAt: payload.occurredAt,
          userAgent: payload.client.userAgent,
          ip: payload.client.ip,
          actionUrl: payload.securityUrl,
        });

      case EmailKind.NewSignIn:
        return renderNewSignInEmail({
          name: payload.to.name,
          occurredAt: payload.occurredAt,
          userAgent: payload.client.userAgent,
          ip: payload.client.ip,
          actionUrl: payload.securityUrl,
        });

      case EmailKind.EmailChange:
        return renderEmailChangeEmail({
          name: payload.to.name,
          actionUrl: payload.confirmUrl,
          noteText: `This link will expire in ${payload.expiresInHours} hours.`,
        });

      case EmailKind.EmailChanged:
        return renderEmailChangedEmail({
          name: payload.to.name,
          newEmail: payload.newEmail,
          actionUrl: payload.securityUrl,
        });

      case EmailKind.ReviewReady:
        return renderReviewReadyEmail({
          name: payload.to.name,
          actionUrl: payload.reviewUrl,
        });
    }
  }
}
