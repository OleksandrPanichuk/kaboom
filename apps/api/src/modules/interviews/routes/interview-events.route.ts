import { t } from "elysia";

import { make, makeRepository, makeService } from "@/core/registry";
import { defineStreamRoute, type StreamEvent } from "@/core/stream-route";
import { Realtime, resumableStream } from "@/platform/realtime";

import { toInterviewEvent } from "../interview.entity";
import { InterviewEventSchema } from "../interview.events";
import {
  liveChannel,
  type LiveEvent,
  LiveEventSchema,
} from "../interviewer/live";
import { mergeStreams, subscription } from "../interviewer/merge-streams";
import { interviewChannel } from "../interviews.constants";
import { InterviewsService } from "../interviews.service";
import { InterviewEventsRepository } from "../ports";
import { InterviewParams } from "./interview-params";

export const interviewEventsRoute = () =>
  defineStreamRoute({
    params: InterviewParams,
    query: t.Object({ since: t.Optional(t.Integer({ minimum: 0 })) }),
    auth: true,
    summary: "Stream an interview's events",
    description:
      "Server-sent events. Durable events carry id = seq and resume after Last-Event-ID, or after ?since for a first connection, so each arrives exactly once. message-delta and turn events carry no id and are lost on disconnect by design; the final message replaces its deltas. A ready event opens every connection.",
    guards: [
      async ({ params, user }) => {
        await makeService(InterviewsService).getOwned(params.id, user.id);
      },
    ],
    stream: async function* ({ params, query, lastEventId, signal }) {
      const events = makeRepository(InterviewEventsRepository);
      const durable = async function* (): AsyncIterable<StreamEvent> {
        for await (const event of resumableStream({
          channel: interviewChannel(params.id),
          schema: InterviewEventSchema,
          after:
            lastEventId !== null ? Number(lastEventId) : (query.since ?? null),
          position: (event) => event.seq,
          replay: async (after) =>
            (await events.listAfter(params.id, after)).map(toInterviewEvent),
          signal,
        })) {
          yield { id: event.seq, event: event.type, data: event };
        }
      };
      const live = async function* (): AsyncIterable<StreamEvent> {
        for await (const event of subscription<LiveEvent>(
          (listener) =>
            make(Realtime).subscribe(
              liveChannel(params.id),
              LiveEventSchema,
              listener,
            ),
          signal,
        )) {
          yield { event: event.type, data: event };
        }
      };

      yield { event: "ready", data: { interviewId: params.id } };
      yield* mergeStreams([durable(), live()], signal);
    },
  });
