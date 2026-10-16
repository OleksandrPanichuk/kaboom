import { randomBytes } from "node:crypto";

import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import type { ShareSubject } from "@/db";

import type { ShareEntity } from "../share.entity";
import { SHARE_TOKEN_BYTES } from "../shares.constants";
import { SharesRepository } from "../shares.repository";
import { SharesService } from "../shares.service";

export interface CreateShareUseCaseOptions {
  ownerId: string;
  subject: ShareSubject;
  subjectId: string;
}

type Options = CreateShareUseCaseOptions;
type Result = ShareEntity;

export class CreateShareUseCase extends UseCase<Options, Result> {
  private readonly service = makeService(SharesService);

  private readonly shares = makeRepository(SharesRepository);

  public async execute({
    ownerId,
    subject,
    subjectId,
  }: Options): Promise<Result> {
    await this.service.assertShareable(subject, subjectId, ownerId);

    return this.shares.insertLive({
      token: randomBytes(SHARE_TOKEN_BYTES).toString("base64url"),
      ownerId,
      subject,
      subjectId,
    });
  }
}
