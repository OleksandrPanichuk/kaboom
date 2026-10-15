import { defineModule } from "@/core/module";
import { bind, makeUseCase } from "@/core/registry";

import { UserLifecycle, UsersRepository } from "./ports";
import { PostgresUsersRepository } from "./repositories";
import {
  DeleteAccountUseCase,
  GetCurrentUserUseCase,
  ListStaffUseCase,
  SetUserRoleUseCase,
  UpdateProfileUseCase,
} from "./use-cases";
import { ListenersUserLifecycle } from "./user-lifecycle.listeners";
import { usersPlugin } from "./users.plugin";
import { usersRoutes } from "./users.routes";

export const usersModule = defineModule({
  name: "users",

  register: () => {
    bind(UsersRepository, () => new PostgresUsersRepository());
    bind(UserLifecycle, () => new ListenersUserLifecycle());
  },

  plugins: () => usersPlugin,

  routes: () =>
    usersRoutes({
      getCurrentUser: makeUseCase(GetCurrentUserUseCase),
      deleteAccount: makeUseCase(DeleteAccountUseCase),
      updateProfile: makeUseCase(UpdateProfileUseCase),
      listStaff: makeUseCase(ListStaffUseCase),
      setUserRole: makeUseCase(SetUserRoleUseCase),
    }),
});
