import z from "zod";

import { make } from "@/core/registry";
import { Realtime } from "@/platform/realtime";

import { interviewChannel } from "../interviews.constants";

export const LiveEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("message-delta"),
    turnId: z.string(),
    text: z.string(),
  }),
  z.object({
    type: z.literal("turn"),
    turnId: z.string(),
    state: z.enum(["thinking", "idle"]),
  }),
]);

export type LiveEvent = z.infer<typeof LiveEventSchema>;

export const liveChannel = (interviewId: string) =>
  `${interviewChannel(interviewId)}:live`;

export const publishLive = (interviewId: string, event: LiveEvent) =>
  make(Realtime).publish(liveChannel(interviewId), event);
