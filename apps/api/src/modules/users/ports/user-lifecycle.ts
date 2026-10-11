import { Port } from "@/core/port";

import type { UserEntity } from "../user.entity";

export abstract class UserLifecycle extends Port {
  public abstract created(user: UserEntity): Promise<void>;

  public abstract deleting(user: UserEntity): Promise<void>;
}
