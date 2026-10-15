import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import type { CardEntity } from "../card.entity";
import { PaymentMethodsService } from "../payment-methods.service";

export interface ListCardsUseCaseOptions {
  userId: string;
}

type Options = ListCardsUseCaseOptions;
type Result = CardEntity[];

export class ListCardsUseCase extends UseCase<Options, Result> {
  private readonly paymentMethodsService = makeService(PaymentMethodsService);

  public execute({ userId }: Options): Promise<Result> {
    return this.paymentMethodsService.list(userId);
  }
}
