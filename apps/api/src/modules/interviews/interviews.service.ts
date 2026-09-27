import type { InterviewContent, ProblemContent } from "@repo/design";

import { make, makeRepository, makeService } from "@/core/registry";
import { Service } from "@/core/service";
import type { InterviewEventType } from "@/db";
import { transaction } from "@/db/executor";
import { ProblemsService } from "@/modules/problems";
import { Realtime } from "@/platform/realtime";

import {
  type InterviewEntity,
  type InterviewProblem,
  toInterviewEvent,
} from "./interview.entity";
import type { InterviewEvent } from "./interview.events";
import { interviewChannel } from "./interviews.constants";
import {
  InterviewNotActiveError,
  InterviewNotFoundError,
  ProblemNotInterviewableError,
} from "./interviews.errors";
import { InterviewEventsRepository, InterviewsRepository } from "./ports";

export type Emit = (
  type: InterviewEventType,
  payload: unknown,
) => Promise<InterviewEvent>;

export interface PinnedProblem {
  content: ProblemContent;
  interview: InterviewContent;
}

export class InterviewsService extends Service {
  private readonly interviews = makeRepository(InterviewsRepository);

  private readonly events = makeRepository(InterviewEventsRepository);

  private readonly problems = makeService(ProblemsService);

  public async getOwned(id: string, ownerId: string): Promise<InterviewEntity> {
    const interview = await this.interviews.findOwned(id, ownerId);

    if (!interview) throw new InterviewNotFoundError("Interview not found");

    return interview;
  }

  public async getActive(
    id: string,
    ownerId: string,
  ): Promise<InterviewEntity> {
    const interview = await this.getOwned(id, ownerId);

    if (interview.status !== "active") {
      throw new InterviewNotActiveError("The interview has ended", {
        status: interview.status,
      });
    }

    return interview;
  }

  public async pinned(interview: InterviewEntity): Promise<PinnedProblem> {
    const { content } = await this.problems.getVersion(
      interview.problemId,
      interview.problemVersion,
    );

    if (!content.interview) {
      throw new ProblemNotInterviewableError(
        "This problem has no interview in its pinned version",
      );
    }

    return { content, interview: content.interview };
  }

  public describe({ content, interview }: PinnedProblem): InterviewProblem {
    return {
      slug: content.slug,
      title: content.title,
      difficulty: content.difficulty,
      statement: content.statement,
      phases: interview.phases.map(({ id, minutes, goal }) => ({
        id,
        minutes,
        goal,
      })),
    };
  }

  public async commit<T>(
    interviewId: string,
    work: (emit: Emit) => Promise<T>,
  ): Promise<T> {
    const emitted: InterviewEvent[] = [];

    const result = await transaction(() =>
      work(async (type, payload) => {
        const seq = await this.interviews.nextSeq(interviewId);
        const event = toInterviewEvent(
          await this.events.insert({ interviewId, seq, type, payload }),
        );

        emitted.push(event);

        return event;
      }),
    );

    const realtime = make(Realtime);

    for (const event of emitted) {
      await realtime.publish(interviewChannel(interviewId), event);
    }

    return result;
  }
}
