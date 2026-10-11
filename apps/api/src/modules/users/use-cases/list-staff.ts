import { makeRepository } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import { UsersRepository } from "../ports";
import type { UserEntity } from "../user.entity";

type Options = void;
type Result = UserEntity[];

export class ListStaffUseCase extends UseCase<Options, Result> {
  private readonly users = makeRepository(UsersRepository);

  public execute(): Promise<Result> {
    return this.users.listByRoles(["moderator", "admin"]);
  }
}
