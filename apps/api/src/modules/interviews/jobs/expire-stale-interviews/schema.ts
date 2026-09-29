import z from "zod";

export const ExpireStaleInterviewsPayloadSchema = z.object({});

export type ExpireStaleInterviewsPayload = z.infer<
  typeof ExpireStaleInterviewsPayloadSchema
>;
