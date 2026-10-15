import { makeService } from "@/core/registry";
import type { UserEntity, UserLifecycleListener } from "@/modules/users";

import { BillingCustomersService } from "./billing-customers.service";

export class BillingUserLifecycle implements UserLifecycleListener {
  private readonly billingCustomersService = makeService(
    BillingCustomersService,
  );

  public async deleting(user: UserEntity): Promise<void> {
    await this.billingCustomersService.removeForUser(user.id);
  }
}
