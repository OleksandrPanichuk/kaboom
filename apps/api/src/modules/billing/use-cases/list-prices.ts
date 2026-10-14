import { makeRepository } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import type { BillingPriceEntity } from "../billing-price.entity";
import { BillingPricesRepository } from "../ports";

type Options = void;
type Result = BillingPriceEntity[];

export class ListPricesUseCase extends UseCase<Options, Result> {
  private readonly prices = makeRepository(BillingPricesRepository);

  public execute(): Promise<Result> {
    return this.prices.listOffered();
  }
}
