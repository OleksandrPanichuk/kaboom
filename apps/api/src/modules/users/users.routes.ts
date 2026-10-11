import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import {
  deleteAccountRoute,
  getCurrentUserRoute,
  listStaffRoute,
  setUserRoleRoute,
  updateProfileRoute,
} from "./routes";
import type {
  DeleteAccountUseCase,
  GetCurrentUserUseCase,
  ListStaffUseCase,
  SetUserRoleUseCase,
  UpdateProfileUseCase,
} from "./use-cases";

export interface UsersActions {
  getCurrentUser: Executable<GetCurrentUserUseCase>;
  deleteAccount: Executable<DeleteAccountUseCase>;
  updateProfile: Executable<UpdateProfileUseCase>;
  listStaff: Executable<ListStaffUseCase>;
  setUserRole: Executable<SetUserRoleUseCase>;
}

export const usersRoutes = (actions: UsersActions) =>
  new Elysia({ name: "users", prefix: "/users" })
    .get("/me", ...getCurrentUserRoute(actions))
    .patch("/me", ...updateProfileRoute(actions))
    .delete("/me", ...deleteAccountRoute(actions))
    .get("/staff", ...listStaffRoute(actions))
    .put("/:id/role", ...setUserRoleRoute(actions));
