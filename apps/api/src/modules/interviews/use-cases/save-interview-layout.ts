import { make, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { type DesignLayout, SaveDesignLayoutUseCase } from "@/modules/designs";

import { InterviewsService } from "../interviews.service";

export interface SaveInterviewLayoutUseCaseOptions {
  ownerId: string;
  id: string;
  layout: DesignLayout;
}

type Options = SaveInterviewLayoutUseCaseOptions;
type Result = void;

export class SaveInterviewLayoutUseCase extends UseCase<Options, Result> {
  private readonly service = makeService(InterviewsService);

  public async execute({ ownerId, id, layout }: Options): Promise<Result> {
    const interview = await this.service.getActive(id, ownerId);

    await make(SaveDesignLayoutUseCase).execute({
      ownerId,
      id: interview.designId,
      layout,
    });
  }
}
