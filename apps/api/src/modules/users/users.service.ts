import { make, makeRepository } from "@/core/registry";
import { Service } from "@/core/service";
import { Cache } from "@/platform/cache";

import { type UpdateUserData, UserLifecycle, UsersRepository } from "./ports";
import {
  CachedUserSchema,
  USER_CACHE_TTL_MS,
  userCacheKey,
} from "./user.cache";
import { UserEntity } from "./user.entity";
import { UserNotFoundError } from "./users.errors";

export interface CreateUserInput {
  name: string;
  email: string;
}

export class UsersService extends Service {
  private readonly repo = makeRepository(UsersRepository);
  private readonly cache = make(Cache);

  public async create({ name, email }: CreateUserInput): Promise<UserEntity> {
    const user = await this.repo.insert({
      name,
      email: UserEntity.normalizeEmail(email),
    });

    await make(UserLifecycle).created(user);

    return user;
  }

  public async findById(id: string): Promise<UserEntity | null> {
    const key = userCacheKey(id);
    const cached = await this.cache.get(key, CachedUserSchema);

    if (cached) return cached;

    const user = await this.repo.findById(id);

    if (user) {
      await this.cache.set(key, user, { ttlMs: USER_CACHE_TTL_MS });
    }

    return user;
  }

  public async getById(id: string): Promise<UserEntity> {
    const user = await this.findById(id);

    if (!user) {
      throw new UserNotFoundError(`User ${id} not found`);
    }

    return user;
  }

  public async update(id: string, data: UpdateUserData): Promise<UserEntity> {
    const user = await this.repo.update(id, data);

    await this.invalidate(id);

    return user;
  }

  public async markEmailVerified(id: string, verifiedAt: Date): Promise<void> {
    await this.repo.markEmailVerified(id, verifiedAt);
    await this.invalidate(id);
  }

  public invalidate(id: string): Promise<void> {
    return this.cache.del(userCacheKey(id));
  }
}
