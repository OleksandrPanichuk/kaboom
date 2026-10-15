import { make, type Token } from "@/core/registry";

import { UserLifecycle } from "./ports";
import type { UserEntity } from "./user.entity";

export interface UserLifecycleListener {
  created?(user: UserEntity): Promise<void>;
  deleting?(user: UserEntity): Promise<void>;
}

const listeners: Array<Token<UserLifecycleListener>> = [];

export const registerUserLifecycleListener = (
  listener: Token<UserLifecycleListener>,
): (() => void) => {
  if (!listeners.includes(listener)) listeners.push(listener);

  return () => {
    const index = listeners.indexOf(listener);

    if (index !== -1) listeners.splice(index, 1);
  };
};

export class ListenersUserLifecycle extends UserLifecycle {
  public async created(user: UserEntity): Promise<void> {
    for (const listener of [...listeners]) {
      await make(listener).created?.(user);
    }
  }

  public async deleting(user: UserEntity): Promise<void> {
    for (const listener of [...listeners].reverse()) {
      await make(listener).deleting?.(user);
    }
  }
}
