import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import type { EntitlementsEntity } from "../entitlement.entity";
import { EntitlementsService } from "../entitlements.service";

export interface GetMyEntitlementsUseCaseOptions {
  userId: string;
}

type Options = GetMyEntitlementsUseCaseOptions;
type Result = EntitlementsEntity;

export class GetMyEntitlementsUseCase extends UseCase<Options, Result> {
  private readonly service = makeService(EntitlementsService);

  public execute({ userId }: Options): Promise<Result> {
    return this.service.of(userId);
  }
}
