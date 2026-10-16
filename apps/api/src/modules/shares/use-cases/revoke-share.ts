import { makeRepository } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import { ShareNotFoundError } from "../shares.errors";
import { SharesRepository } from "../shares.repository";

export interface RevokeShareUseCaseOptions {
  ownerId: string;
  token: string;
}

type Options = RevokeShareUseCaseOptions;
type Result = void;

export class RevokeShareUseCase extends UseCase<Options, Result> {
  private readonly shares = makeRepository(SharesRepository);

  public async execute({ ownerId, token }: Options): Promise<Result> {
    if (!(await this.shares.revoke(token, ownerId))) {
      throw new ShareNotFoundError("This link is not yours or already off");
    }
  }
}
