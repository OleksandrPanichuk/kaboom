import z from "zod";

import { makeService } from "@/core/registry";
import { NOTIFICATIONS_QUEUE } from "@/modules/notifications";
import { Job } from "@/platform/jobs";

import { CommentDigestsService } from "../comment-digests.service";
import { ProblemCommentsQueueJobs } from "../problem-comments.constants";

export const SendCommentDigestPayloadSchema = z.object({
  userId: z.uuid(),
  problemId: z.uuid(),
  since: z.iso.datetime(),
});

export type SendCommentDigestPayload = z.infer<
  typeof SendCommentDigestPayloadSchema
>;

export class SendCommentDigestJob extends Job<SendCommentDigestPayload> {
  public readonly name = ProblemCommentsQueueJobs.SendCommentDigest;
  public readonly queue = NOTIFICATIONS_QUEUE;
  public readonly schema = SendCommentDigestPayloadSchema;

  public async handle({
    userId,
    problemId,
    since,
  }: SendCommentDigestPayload): Promise<void> {
    await makeService(CommentDigestsService).send({
      userId,
      problemId,
      since: new Date(since),
    });
  }
}
