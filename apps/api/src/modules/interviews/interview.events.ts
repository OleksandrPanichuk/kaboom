import z from "zod";

import { INTERVIEW_EVENT_TYPES, type InterviewEventType } from "@/db";

export const InterviewEventSchema = z.object({
  seq: z.number().int().positive(),
  type: z.enum(INTERVIEW_EVENT_TYPES),
  payload: z.unknown(),
  at: z.string(),
});

export type InterviewEvent = z.infer<typeof InterviewEventSchema>;

export interface PendingEvent {
  type: InterviewEventType;
  payload: unknown;
}
