import { Repository } from "@/core/repository";

import type { ProfileEntity } from "../profile.entity";

export interface CreateProfileData {
  userId: string;
  handle: string;
  displayName: string;
}

export interface UpdateProfileData {
  handle?: string;
  displayName?: string;
  bio?: string;
  links?: string[];
  visible?: boolean;
  avatarKey?: string | null;
}

export abstract class ProfilesRepository extends Repository {
  public abstract insert(
    data: CreateProfileData,
  ): Promise<ProfileEntity | null>;

  public abstract findByUserId(userId: string): Promise<ProfileEntity | null>;

  public abstract findByHandle(handle: string): Promise<ProfileEntity | null>;

  public abstract update(
    userId: string,
    data: UpdateProfileData,
  ): Promise<ProfileEntity | null>;
}
