import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import { type DesignQuota, DesignQuotaService } from "../design-quota.service";

export interface GetDesignQuotaUseCaseOptions {
  ownerId: string;
}

type Options = GetDesignQuotaUseCaseOptions;
type Result = DesignQuota;

export class GetDesignQuotaUseCase extends UseCase<Options, Result> {
  private readonly quota = makeService(DesignQuotaService);

  public execute({ ownerId }: Options): Promise<Result> {
    return this.quota.of(ownerId);
  }
}
