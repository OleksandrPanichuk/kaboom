import { make, makeRepository } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import type { OfferedPrice } from "../billing-offer.entity";
import { BillingOffersRepository, BillingProvider } from "../ports";

type Options = void;
type Result = OfferedPrice[];

export class ListOffersUseCase extends UseCase<Options, Result> {
  private readonly provider = make(BillingProvider);

  private readonly offers = makeRepository(BillingOffersRepository);

  public execute(): Promise<Result> {
    return this.offers.listOffered(this.provider.name);
  }
}
