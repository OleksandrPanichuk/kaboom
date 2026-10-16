import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import { sharePageHtml } from "../share.page";
import { ShareNotFoundError } from "../shares.errors";
import { SharesService } from "../shares.service";

export interface OpenSharePageUseCaseOptions {
  token: string;
}

type Options = OpenSharePageUseCaseOptions;
type Result = string;

export class OpenSharePageUseCase extends UseCase<Options, Result> {
  private readonly service = makeService(SharesService);

  public async execute({ token }: Options): Promise<Result> {
    try {
      return sharePageHtml(token, await this.service.viewByToken(token));
    } catch (error) {
      if (error instanceof ShareNotFoundError) {
        return sharePageHtml(token, null);
      }

      throw error;
    }
  }
}
