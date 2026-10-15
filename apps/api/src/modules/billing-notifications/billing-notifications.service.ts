import { getEnv } from "@/configs";
import { makeService } from "@/core/registry";
import { Service } from "@/core/service";
import type { SubscriptionChangeRow } from "@/db";
import { afterCommit } from "@/db/executor";
import { NotificationsService } from "@/modules/notifications";
import { type UserEntity, UsersService } from "@/modules/users";

import { BILLING_SETTINGS_PATH } from "./billing-notifications.constants";

export class BillingNotificationsService extends Service {
  private readonly usersService = makeService(UsersService);

  private readonly notificationsService = makeService(NotificationsService);

  public async subscriptionChanged(
    userId: string | null,
    changes: readonly SubscriptionChangeRow[],
  ): Promise<void> {
    for (const change of changes) {
      if (
        change.toStatus === "active" &&
        (change.kind === "created" || change.fromStatus === "incomplete")
      ) {
        await this.notify(userId, (to) =>
          this.notificationsService.sendProStarted({ ...to, lifetime: false }),
        );
      }

      if (change.kind === "status_changed" && change.toStatus === "past_due") {
        await this.notify(userId, (to) =>
          this.notificationsService.sendPaymentFailed(to),
        );
      }

      if (change.kind === "canceled" && change.actor !== "system") {
        await this.notify(userId, (to) =>
          this.notificationsService.sendSubscriptionEnded({
            ...to,
            endedAt: change.effectiveAt,
          }),
        );
      }
    }
  }

  public lifetimePaid(userId: string | null): Promise<void> {
    return this.notify(userId, (to) =>
      this.notificationsService.sendProStarted({ ...to, lifetime: true }),
    );
  }

  public lifetimeRefunded(
    userId: string | null,
    amount: number,
    currency: string,
  ): Promise<void> {
    return this.notify(userId, (to) =>
      this.notificationsService.sendPurchaseRefunded({
        ...to,
        amount,
        currency,
      }),
    );
  }

  private notify(
    userId: string | null,
    send: (to: Recipient) => Promise<void>,
  ): Promise<void> {
    if (userId === null) return Promise.resolve();

    return afterCommit(async () => {
      const user = await this.usersService.findById(userId);

      if (user) await send(recipientOf(user));
    });
  }
}

interface Recipient {
  userId: string;
  email: string;
  name: string;
  billingUrl: string;
}

const recipientOf = (user: UserEntity): Recipient => ({
  userId: user.id,
  email: user.email,
  name: user.name,
  billingUrl: new URL(BILLING_SETTINGS_PATH, getEnv().APP_URL).toString(),
});
