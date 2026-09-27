import type { DesignOp } from "@repo/design";

import { make, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { ApplyDesignOpsUseCase, type DesignEntity } from "@/modules/designs";

import { InterviewsService } from "../interviews.service";

export interface ApplyInterviewOpsUseCaseOptions {
  ownerId: string;
  id: string;
  author: "user" | "interviewer";
  baseRevision: number;
  ops: DesignOp[];
}

type Options = ApplyInterviewOpsUseCaseOptions;
type Result = DesignEntity;

export class ApplyInterviewOpsUseCase extends UseCase<Options, Result> {
  private readonly service = makeService(InterviewsService);

  public async execute({
    ownerId,
    id,
    author,
    baseRevision,
    ops,
  }: Options): Promise<Result> {
    const interview = await this.service.getActive(id, ownerId);

    return this.service.commit(id, async (emit) => {
      const { design, revision } = await make(ApplyDesignOpsUseCase).execute({
        ownerId,
        id: interview.designId,
        author,
        baseRevision,
        ops,
      });

      await emit("revision", {
        revision: revision.number,
        author,
        graphHash: design.graphHash,
      });

      return design;
    });
  }
}
