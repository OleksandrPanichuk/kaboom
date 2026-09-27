import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import type { InterviewMessageEntity } from "../interview.entity";
import { InterviewsService } from "../interviews.service";
import { InterviewMessagesRepository } from "../ports";

export interface PostInterviewMessageUseCaseOptions {
  ownerId: string;
  id: string;
  body: string;
}

type Options = PostInterviewMessageUseCaseOptions;
type Result = InterviewMessageEntity;

export class PostInterviewMessageUseCase extends UseCase<Options, Result> {
  private readonly service = makeService(InterviewsService);

  private readonly messages = makeRepository(InterviewMessagesRepository);

  public async execute({ ownerId, id, body }: Options): Promise<Result> {
    await this.service.getActive(id, ownerId);

    return this.service.commit(id, async (emit) => {
      const message = await this.messages.insert({
        interviewId: id,
        author: "user",
        body,
      });

      await emit("message", { messageId: message.id });

      return message;
    });
  }
}
