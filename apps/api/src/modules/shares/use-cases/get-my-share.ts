import { makeRepository } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import type { ShareSubject } from "@/db";

import type { ShareEntity } from "../share.entity";
import { ShareNotFoundError } from "../shares.errors";
import { SharesRepository } from "../shares.repository";

export interface GetMyShareUseCaseOptions {
  ownerId: string;
  subject: ShareSubject;
  subjectId: string;
}

type Options = GetMyShareUseCaseOptions;
type Result = ShareEntity;

export class GetMyShareUseCase extends UseCase<Options, Result> {
  private readonly shares = makeRepository(SharesRepository);

  public async execute({
    ownerId,
    subject,
    subjectId,
  }: Options): Promise<Result> {
    const share = await this.shares.findLive(subject, subjectId);

    if (share?.ownerId !== ownerId) {
      throw new ShareNotFoundError("This is not shared");
    }

    return share;
  }
}
