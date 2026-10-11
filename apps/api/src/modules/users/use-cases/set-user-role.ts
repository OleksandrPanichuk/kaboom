import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import type { UserRole } from "@/db";

import type { UserEntity } from "../user.entity";
import { OwnRoleChangeError } from "../users.errors";
import { UsersService } from "../users.service";

export interface SetUserRoleUseCaseOptions {
  actorId: string;
  userId: string;
  role: UserRole;
}

type Options = SetUserRoleUseCaseOptions;
type Result = UserEntity;

export class SetUserRoleUseCase extends UseCase<Options, Result> {
  private readonly users = makeService(UsersService);

  public async execute({ actorId, userId, role }: Options): Promise<Result> {
    if (actorId === userId) {
      throw new OwnRoleChangeError(
        "Another admin has to change your role, so the platform always keeps one",
      );
    }

    await this.users.getById(userId);

    return this.users.setRole(userId, role);
  }
}
