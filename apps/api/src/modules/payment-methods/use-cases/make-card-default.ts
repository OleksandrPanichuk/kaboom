import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import type { CardEntity } from "../card.entity";
import { PaymentMethodsService } from "../payment-methods.service";

export interface MakeCardDefaultUseCaseOptions {
  userId: string;
  cardId: string;
}

type Options = MakeCardDefaultUseCaseOptions;
type Result = CardEntity[];

export class MakeCardDefaultUseCase extends UseCase<Options, Result> {
  private readonly paymentMethodsService = makeService(PaymentMethodsService);

  public execute({ userId, cardId }: Options): Promise<Result> {
    return this.paymentMethodsService.makeDefault(userId, cardId);
  }
}
