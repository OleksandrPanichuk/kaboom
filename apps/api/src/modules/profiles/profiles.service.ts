import { makeRepository, makeService } from "@/core/registry";
import { Service } from "@/core/service";
import { UsersService } from "@/modules/users";

import { ProfilesRepository } from "./ports";
import type { ProfileEntity } from "./profile.entity";
import { defaultHandle, randomHandle } from "./profile.handle";
import { DISPLAY_NAME_MAX_LENGTH } from "./profiles.constants";

const HANDLE_ATTEMPTS = 5;

export interface ProvisionProfileInput {
  id: string;
  name: string;
}

export class ProfilesService extends Service {
  private readonly repo = makeRepository(ProfilesRepository);

  public async provision({
    id,
    name,
  }: ProvisionProfileInput): Promise<ProfileEntity> {
    const displayName = name.trim().slice(0, DISPLAY_NAME_MAX_LENGTH) || "User";

    for (let attempt = 0; attempt < HANDLE_ATTEMPTS; attempt++) {
      const created = await this.repo.insert({
        userId: id,
        handle: attempt === 0 ? defaultHandle(name, id) : randomHandle(name),
        displayName,
      });

      if (created) return created;

      const existing = await this.repo.findByUserId(id);

      if (existing) return existing;
    }

    throw new Error(`No free handle found for user ${id}`);
  }

  public async mine(userId: string): Promise<ProfileEntity> {
    const profile = await this.repo.findByUserId(userId);

    if (profile) return profile;

    return this.provision(await makeService(UsersService).getById(userId));
  }
}
