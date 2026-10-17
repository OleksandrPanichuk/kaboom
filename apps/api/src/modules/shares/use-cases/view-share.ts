import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import type { SharedView } from "../share.entity";
import { SharesService } from "../shares.service";

export interface ViewShareUseCaseOptions {
  token: string;
}

type Options = ViewShareUseCaseOptions;
type Result = SharedView;

export class ViewShareUseCase extends UseCase<Options, Result> {
  private readonly service = makeService(SharesService);

  public execute({ token }: Options): Promise<Result> {
    return this.service.viewByToken(token);
  }
}
