import { loadEnv, setEnv } from "@/configs";
import { makeRepository, makeService } from "@/core/registry";
import { closeDatabase, USER_ROLES, type UserRole } from "@/db";
import { closeInfrastructure } from "@/infrastructure";
import { usersModule, UsersRepository, UsersService } from "@/modules/users";
import { cacheModule } from "@/platform/cache";

const [email, role] = Bun.argv.slice(2);

if (!email || !USER_ROLES.includes(role as UserRole)) {
  console.error(`Usage: bun run user:role <email> <${USER_ROLES.join("|")}>`);
  process.exit(1);
}

setEnv(loadEnv());
cacheModule.register();
usersModule.register();
await cacheModule.start();

try {
  const user = await makeRepository(UsersRepository).findByEmail(
    email.trim().toLowerCase(),
  );

  if (!user) {
    console.error(`No account uses ${email}.`);
    process.exitCode = 1;
  } else {
    await makeService(UsersService).setRole(user.id, role as UserRole);
    console.log(`${user.email} is now ${role}.`);
  }
} finally {
  await cacheModule.shutdown();
  await closeDatabase();
  await closeInfrastructure();
}
