import z from "zod";

import { EmailKind } from "../../notifications.constants";

const RecipientSchema = z.object({
  userId: z.uuid(),
  email: z.email(),
  name: z.string().trim().min(1).optional(),
});

const ClientSchema = z.object({
  userAgent: z.string().nullable(),
  ip: z.string().nullable(),
});

export const SendEmailPayloadSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal(EmailKind.EmailVerification),
    to: RecipientSchema,
    verificationUrl: z.url(),
    expiresInHours: z.number().int().positive(),
  }),
  z.object({
    kind: z.literal(EmailKind.PasswordReset),
    to: RecipientSchema,
    resetUrl: z.url(),
    expiresInMinutes: z.number().int().positive(),
  }),
  z.object({
    kind: z.literal(EmailKind.PasswordChanged),
    to: RecipientSchema,
    occurredAt: z.iso.datetime(),
    client: ClientSchema,
    securityUrl: z.url(),
  }),
  z.object({
    kind: z.literal(EmailKind.NewSignIn),
    to: RecipientSchema,
    occurredAt: z.iso.datetime(),
    client: ClientSchema,
    securityUrl: z.url(),
  }),
  z.object({
    kind: z.literal(EmailKind.EmailChange),
    to: RecipientSchema,
    confirmUrl: z.url(),
    expiresInHours: z.number().int().positive(),
  }),
  z.object({
    kind: z.literal(EmailKind.EmailChanged),
    to: RecipientSchema,
    newEmail: z.email(),
    securityUrl: z.url(),
  }),
  z.object({
    kind: z.literal(EmailKind.ReviewReady),
    to: RecipientSchema,
    reviewUrl: z.url(),
  }),
  z.object({
    kind: z.literal(EmailKind.ProStarted),
    to: RecipientSchema,
    lifetime: z.boolean(),
    billingUrl: z.url(),
  }),
  z.object({
    kind: z.literal(EmailKind.PaymentFailed),
    to: RecipientSchema,
    billingUrl: z.url(),
  }),
  z.object({
    kind: z.literal(EmailKind.SubscriptionEnded),
    to: RecipientSchema,
    endedAt: z.iso.datetime(),
    billingUrl: z.url(),
  }),
  z.object({
    kind: z.literal(EmailKind.PurchaseRefunded),
    to: RecipientSchema,
    amount: z.number().int().nonnegative(),
    currency: z.string().length(3),
    billingUrl: z.url(),
  }),
  z.object({
    kind: z.literal(EmailKind.CommentDigest),
    to: RecipientSchema,
    problemTitle: z.string().min(1),
    problemUrl: z.url(),
    count: z.number().int().positive(),
    asAuthor: z.boolean(),
    first: z.object({
      author: z.string().min(1),
      excerpt: z.string(),
      spoiler: z.boolean(),
    }),
  }),
  z.object({
    kind: z.literal(EmailKind.PracticeReminder),
    to: RecipientSchema,
    done: z.number().int().nonnegative(),
    total: z.number().int().positive(),
    left: z.array(z.string().min(1)).min(1),
    planUrl: z.url(),
  }),
]);

export type EmailClient = z.infer<typeof ClientSchema>;

export type SendEmailPayload = z.infer<typeof SendEmailPayloadSchema>;
