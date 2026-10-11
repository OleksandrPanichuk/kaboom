export * from "./dto";
export {
  type CreateUserData,
  type UpdateUserData,
  UserLifecycle,
  UsersRepository,
} from "./ports";
export { PostgresUsersRepository } from "./repositories";
export {
  DeleteAccountUseCase,
  type DeleteAccountUseCaseOptions,
  GetCurrentUserUseCase,
  type GetCurrentUserUseCaseOptions,
  ListStaffUseCase,
  SetUserRoleUseCase,
  type SetUserRoleUseCaseOptions,
  UpdateProfileUseCase,
  type UpdateProfileUseCaseOptions,
} from "./use-cases";
export { UserEntity } from "./user.entity";
export { StaffMemberModel, UserMessageModel, UserModel } from "./user.model";
export { DELETE_ACCOUNT_RATE_LIMIT } from "./users.constants";
export {
  AccountDeletionNotConfirmedError,
  AccountDeletionUnauthorizedError,
  EmailNotVerifiedError,
  OwnRoleChangeError,
  RoleRequiredError,
  UserAlreadyExistsError,
  UserNotFoundError,
} from "./users.errors";
export { usersModule } from "./users.module";
export { usersPlugin } from "./users.plugin";
export { hasRole, requireRole } from "./users.roles";
export {
  type CreateUserInput as CreateUserServiceInput,
  UsersService,
} from "./users.service";
