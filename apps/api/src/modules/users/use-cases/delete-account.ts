import { make, makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { AccountsRepository, AccountsService } from "@/modules/accounts";
import { SessionsService } from "@/modules/sessions";

import { UserLifecycle, UsersRepository } from "../ports";
import { UserEntity } from "../user.entity";
import {
  AccountDeletionNotConfirmedError,
  AccountDeletionUnauthorizedError,
} from "../users.errors";
import { UsersService } from "../users.service";

export interface DeleteAccountUseCaseOptions {
  userId: string;
  email: string;
  password?: string;
}

type Options = DeleteAccountUseCaseOptions;
type Result = void;

export class DeleteAccountUseCase extends UseCase<Options, Result> {
  private readonly usersRepository = makeRepository(UsersRepository);

  private readonly usersService = makeService(UsersService);

  private readonly accountsService = makeService(AccountsService);

  private readonly accountsRepository = makeRepository(AccountsRepository);

  private readonly sessionsService = makeService(SessionsService);

  public async execute({ userId, email, password }: Options): Promise<Result> {
    const user = await this.usersRepository.getById(userId);

    if (
      UserEntity.normalizeEmail(user.email) !== UserEntity.normalizeEmail(email)
    ) {
      throw new AccountDeletionNotConfirmedError(
        "Type your email address exactly to confirm",
      );
    }

    await this.verifyPassword(userId, password);

    await this.sessionsService.revokeAllForUser(userId);
    await make(UserLifecycle).deleting(user);
    await this.usersService.invalidate(userId);
    await this.usersRepository.deleteById(userId);
  }

  private async verifyPassword(
    userId: string,
    password: string | undefined,
  ): Promise<void> {
    const account = await this.accountsRepository.findByUserIdAndType(
      userId,
      "CREDENTIALS",
    );

    if (!account) return;

    if (!password) {
      throw new AccountDeletionUnauthorizedError(
        "Enter your password to confirm",
      );
    }

    const matches = await this.accountsService.verifyPassword(
      account,
      password,
    );

    if (!matches) {
      throw new AccountDeletionUnauthorizedError("Password is incorrect");
    }
  }
}
