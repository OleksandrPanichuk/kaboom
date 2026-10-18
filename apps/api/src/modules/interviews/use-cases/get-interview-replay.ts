import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { DesignRevisionsRepository, DesignsService } from "@/modules/designs";

import type { InterviewReplayView } from "../interview.entity";
import { InterviewStillRunningError } from "../interviews.errors";
import { InterviewsService } from "../interviews.service";
import {
  InterviewEventsRepository,
  InterviewMessagesRepository,
} from "../ports";

export interface GetInterviewReplayUseCaseOptions {
  ownerId: string;
  id: string;
}

type Options = GetInterviewReplayUseCaseOptions;
type Result = InterviewReplayView;

export class GetInterviewReplayUseCase extends UseCase<Options, Result> {
  private readonly service = makeService(InterviewsService);

  private readonly designs = makeService(DesignsService);

  private readonly messages = makeRepository(InterviewMessagesRepository);

  private readonly events = makeRepository(InterviewEventsRepository);

  private readonly revisions = makeRepository(DesignRevisionsRepository);

  public async execute({ ownerId, id }: Options): Promise<Result> {
    const interview = await this.service.getOwned(id, ownerId);

    if (interview.status === "active") {
      throw new InterviewStillRunningError(
        "An interview can be replayed once it has ended",
      );
    }

    const design = await this.designs.getOwned(interview.designId, ownerId);
    const [pinned, messages, events, revisions] = await Promise.all([
      this.service.pinned(interview),
      this.messages.listFor(id),
      this.events.listAfter(id, null),
      this.revisions.listThrough(design.id, design.revision),
    ]);

    return {
      interview,
      problem: this.service.describe(pinned),
      messages,
      events,
      revisions,
      layout: design.layout,
    };
  }
}
