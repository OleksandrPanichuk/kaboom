import type { UserRow } from "@/db";

import type { UserModel } from "./user.model";

export interface UserEntity extends UserRow {}

export class UserEntity {
  public static normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  public static isEmailVerified(user: UserEntity): boolean {
    return user.emailVerifiedAt !== null;
  }

  public static normalize(user: UserEntity): UserModel {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: UserEntity.isEmailVerified(user),
      role: user.role,
    };
  }

  public static normalizeMany(users: UserEntity[]): UserModel[] {
    return users.map(UserEntity.normalize);
  }
}
