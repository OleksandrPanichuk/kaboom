import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import {
  type InterviewQuota,
  InterviewQuotaService,
} from "../interview-quota.service";

export interface GetInterviewQuotaUseCaseOptions {
  ownerId: string;
}

type Options = GetInterviewQuotaUseCaseOptions;
type Result = InterviewQuota;

export class GetInterviewQuotaUseCase extends UseCase<Options, Result> {
  private readonly quota = makeService(InterviewQuotaService);

  public execute({ ownerId }: Options): Promise<Result> {
    return this.quota.of(ownerId);
  }
}
