import { t } from "elysia";

import { makeRepository, makeService } from "@/core/registry";
import { defineStreamRoute } from "@/core/stream-route";
import { resumableStream } from "@/platform/realtime";

import { toInterviewEvent } from "../interview.entity";
import { InterviewEventSchema } from "../interview.events";
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
      "Server-sent events with id = seq. Resumes after Last-Event-ID, or after ?since for a first connection, so each durable event arrives exactly once.",
    guards: [
      async ({ params, user }) => {
        await makeService(InterviewsService).getOwned(params.id, user.id);
      },
    ],
    stream: async function* ({ params, query, lastEventId, signal }) {
      const events = makeRepository(InterviewEventsRepository);

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
    },
  });
